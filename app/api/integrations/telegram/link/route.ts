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

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    // Create pending link in Notion (now async)
    // Create pending link in Notion (now async)
    let token: string;
    try {
      token = await createPendingTelegramLink({
        email: trimmedEmail,
        name: trimmedName,
        avatarUrl: avatarUrl?.trim() || undefined,
        preferredCode: generateSixDigitCode(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to create pending link:", errorMessage);
      return NextResponse.json(
        {
          ok: false,
          message: "Failed to create verification link. Please try again.",
          error: errorMessage,
        },
        { status: 500 },
      );
    }

    const startUrl = botUsername
      ? `https://t.me/${botUsername}`
      : buildBotLinks(botUsername).startUrl;

    return NextResponse.json(
      {
        ok: true,
        pendingStart: true,
        startUrl,
        verificationCode: token,
        message: "Open Telegram and tap Start, then paste your 6-digit verification code to complete linking.",
      },
      { status: 200 },
    );
  } catch (error) {
    const catchAllMessage = error instanceof Error ? error.message : String(error);
    console.error("Telegram link POST error:", catchAllMessage);
    const message =
      "Unable to connect Telegram right now. Verify TELEGRAM_BOT_TOKEN and make sure your bot is reachable.";

    return NextResponse.json(
      {
        ok: false,
        message,
        debug: catchAllMessage,
      },
      { status: 500 },
    );
  }
}
