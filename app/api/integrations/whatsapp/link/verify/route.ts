import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/notion-provider";
import { consumePendingWhatsAppLink, getPendingWhatsAppLink } from "@/lib/whatsapp-link-verification";

interface VerifyBody {
  code?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyBody;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const code = (body.code || "").trim();

  if (!email || !name) {
    return NextResponse.json({ ok: false, message: "You must be signed in before verifying WhatsApp." }, { status: 401 });
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, message: "Enter the 6-digit verification code." }, { status: 400 });
  }

  const pending = getPendingWhatsAppLink(email);
  if (!pending) {
    return NextResponse.json({ ok: false, message: "Verification expired. Request a new code." }, { status: 400 });
  }

  if (pending.code !== code) {
    return NextResponse.json({ ok: false, message: "Invalid code. Please check and try again." }, { status: 400 });
  }

  consumePendingWhatsAppLink(email);

  try {
    await upsertUser({
      email,
      name,
      avatarUrl: body.avatarUrl?.trim() || undefined,
      whatsappNumber: pending.phoneNumber,
    });

    return NextResponse.json({
      ok: true,
      whatsappNumber: pending.phoneNumber,
      message: `WhatsApp verified and linked: ${pending.phoneNumber}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save WhatsApp verification.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
