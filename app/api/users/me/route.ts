import { NextResponse } from "next/server";
import { getUserByEmail, upsertUser } from "@/lib/notion";

interface SyncUserBody {
  email?: string;
  name?: string;
  avatarUrl?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
  }

  try {
    const user = await getUserByEmail(email);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as SyncUserBody;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();

  if (!email || !name) {
    return NextResponse.json(
      { ok: false, message: "Both name and email are required." },
      { status: 400 },
    );
  }

  try {
    const user = await upsertUser({
      email,
      name,
      role: "Member",
      avatarUrl: body.avatarUrl?.trim() || undefined,
      telegramUsername: body.telegramUsername?.trim() || undefined,
      whatsappNumber: body.whatsappNumber?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync user.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
