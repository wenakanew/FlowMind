import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/notion";
import { getUserByEmail } from "@/lib/notion";
import { createPendingTelegramLink } from "@/lib/telegram-link-verification";

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramBotProfile {
  username?: string;
}

interface LinkRequestBody {
  email?: string;
  name?: string;
  avatarUrl?: string;
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
  const { email, name, avatarUrl } = (await request.json()) as LinkRequestBody;
  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedName = name?.trim();

  if (!trimmedEmail || !trimmedName) {
    return NextResponse.json(
      {
        ok: false,
        message: "You must be signed in before linking Telegram.",
      },
      { status: 401 },
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
    const existingUser = await getUserByEmail(trimmedEmail);
    const existingTelegramUsername = existingUser?.telegramUsername?.trim();
    const existingTelegramChatId = existingUser?.telegramChatId?.trim();
    if (existingTelegramUsername || existingTelegramChatId) {
      return NextResponse.json(
        {
          ok: false,
          message: "This account already has Telegram linked. Delete it first before linking a new one.",
        },
        { status: 409 },
      );
    }

    await upsertUser({
      email: trimmedEmail,
      name: trimmedName,
      avatarUrl: avatarUrl?.trim() || undefined,
    });

    let botUsername: string | null = null;
    try {
      botUsername = await resolveBotUsername(botToken);
    } catch {
      botUsername = null;
    }
    const token = createPendingTelegramLink({
      email: trimmedEmail,
      name: trimmedName,
      avatarUrl: avatarUrl?.trim() || undefined,
    });

    const deepLinkStartUrl = botUsername
      ? `https://t.me/${botUsername}?start=flowmind_link_${token}`
      : buildBotLinks(botUsername).startUrl;

    return NextResponse.json(
      {
        ok: true,
        pendingStart: true,
        startUrl: deepLinkStartUrl,
        message: "Open Telegram and tap Start. FlowMind will automatically verify and link this Telegram account.",
      },
      { status: 200 },
    );
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
