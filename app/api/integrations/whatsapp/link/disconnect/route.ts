import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/notion-provider";

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
    return NextResponse.json({ ok: false, message: "You must be signed in before managing WhatsApp." }, { status: 401 });
  }

  try {
    await upsertUser({
      email,
      name,
      avatarUrl: body.avatarUrl?.trim() || undefined,
      whatsappNumber: "",
    });

    return NextResponse.json({ ok: true, message: "WhatsApp connection deleted." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete WhatsApp connection.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
