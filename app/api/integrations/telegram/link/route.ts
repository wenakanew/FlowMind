import { NextResponse } from "next/server";

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    from?: { username?: string };
  };
  edited_message?: {
    chat?: { id?: number };
    from?: { username?: string };
  };
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramBotProfile {
  username?: string;
}

interface LinkRequestBody {
  username?: string;
}

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

function cleanUsername(input: string) {
  return input.trim().replace(/^@+/, "");
}

async function resolveBotUsername(token: string) {
  const configuredBotUsername = process.env.TELEGRAM_BOT_USERNAME
    ?.trim()
    .replace(/^@+/, "");

  if (configuredBotUsername) {
    return configuredBotUsername;
  }

  const botProfile = await callTelegramApi<TelegramBotProfile>(token, "getMe");
  return botProfile.username || null;
}

function buildBotLinks(botUsername: string | null) {
  if (!botUsername) {
    return {
      startUrl: null,
      appUrl: null,
    };
  }

  return {
    startUrl: `https://t.me/${botUsername}`,
    appUrl: `tg://resolve?domain=${botUsername}`,
  };
}

function buildStartDeepLink(botUsername: string | null) {
  if (!botUsername) {
    return null;
  }

  const token = `flowmind_link_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  return `https://t.me/${botUsername}?start=${token}`;
}

async function callTelegramApi<T>(token: string, method: string, payload?: object) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: payload ? "POST" : "GET",
    headers: payload
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Telegram API request failed.");
  }

  const data = (await response.json()) as TelegramResponse<T>;
  if (!data.ok) {
    throw new Error(data.description || "Telegram API returned an error.");
  }

  if (typeof data.result === "undefined") {
    throw new Error("Telegram API returned no result.");
  }

  return data.result;
}

function findChatIdFromUpdates(updates: TelegramUpdate[], username: string) {
  const target = username.toLowerCase();

  for (let index = updates.length - 1; index >= 0; index -= 1) {
    const update = updates[index];
    const message = update.message ?? update.edited_message;
    if (!message?.from?.username || !message.chat?.id) {
      continue;
    }

    if (message.from.username.toLowerCase() === target) {
      return message.chat.id;
    }
  }

  return null;
}

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "Telegram is not configured yet. Add TELEGRAM_BOT_TOKEN in your environment.",
      },
      { status: 500 },
    );
  }

  try {
    const botUsername = await resolveBotUsername(botToken);
    const links = buildBotLinks(botUsername);

    return NextResponse.json({
      ok: true,
      botUsername,
      ...links,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to load Telegram bot details right now.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { username } = (await request.json()) as LinkRequestBody;
  const parsedUsername = cleanUsername(username || "");

  if (!USERNAME_PATTERN.test(parsedUsername)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Please enter a valid Telegram username.",
      },
      { status: 400 },
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "Telegram is not configured yet. Add TELEGRAM_BOT_TOKEN in your environment.",
      },
      { status: 500 },
    );
  }

  try {
    let botUsername: string | null = null;
    try {
      botUsername = await resolveBotUsername(botToken);
    } catch {
      botUsername = null;
    }
    const links = buildBotLinks(botUsername);

    let updates: TelegramUpdate[] = [];
    try {
      updates = await callTelegramApi<TelegramUpdate[]>(
        botToken,
        "getUpdates?limit=100&timeout=5&allowed_updates=%5B%22message%22%2C%22edited_message%22%5D",
      );
    } catch {
      updates = [];
    }

    const chatId = findChatIdFromUpdates(updates, parsedUsername);

    const welcomeMessage =
      process.env.TELEGRAM_WELCOME_MESSAGE ||
      "Welcome to FlowMind! 🎉 You are now connected. You can continue chatting here to run your flows.";

    if (chatId) {
      await callTelegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: welcomeMessage,
      });

      return NextResponse.json({
        ok: true,
        username: parsedUsername,
        message: `Connected. A welcome message was sent to @${parsedUsername}.`,
      });
    }

    try {
      await callTelegramApi(botToken, "sendMessage", {
        chat_id: `@${parsedUsername}`,
        text: welcomeMessage,
      });

      return NextResponse.json({
        ok: true,
        username: parsedUsername,
        message: `Connected. A welcome message was sent to @${parsedUsername}.`,
      });
    } catch {
      const deepLinkStartUrl = buildStartDeepLink(botUsername) || links.startUrl;

      return NextResponse.json(
        {
          ok: true,
          pendingStart: true,
          startUrl: deepLinkStartUrl,
          message: "Account linked.",
        },
        { status: 200 },
      );
    }
  } catch {
    const message =
      "Unable to connect Telegram right now. Verify TELEGRAM_BOT_TOKEN and make sure your bot is reachable.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
