import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/notion";

interface DisconnectBody {
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as DisconnectBody;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();

  if (!email || !name) {
    return NextResponse.json({ ok: false, message: "You must be signed in before managing Telegram." }, { status: 401 });
  }

  try {
    await upsertUser({
      email,
      name,
      avatarUrl: body.avatarUrl?.trim() || undefined,
      telegramUsername: "",
      telegramChatId: "",
    });

    return NextResponse.json({ ok: true, message: "Telegram connection deleted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete Telegram connection.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
