import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/notion-provider";
import { getUserByEmail } from "@/lib/notion-provider";
import { createPendingWhatsAppLink } from "@/lib/whatsapp-link-verification";

interface StartBody {
  phoneNumber?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

function normalizePhone(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/[\s()-]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function isValidE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function toWhatsAppAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

async function sendWhatsAppCode(input: { to: string; code: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromRaw) {
    throw new Error("Twilio WhatsApp is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER.");
  }

  const from = toWhatsAppAddress(fromRaw);
  const to = toWhatsAppAddress(input.to);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `Your FlowMind verification code is ${input.code}. It expires in 10 minutes.`,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    if (text.includes("63016") || text.toLowerCase().includes("join")) {
      throw new Error("Your number is not joined to the Twilio WhatsApp Sandbox. In Twilio Console, join the sandbox first, then try again.");
    }

    throw new Error(`Twilio send failed: ${text}`);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as StartBody;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const phone = normalizePhone(body.phoneNumber || "");

  if (!email || !name) {
    return NextResponse.json({ ok: false, message: "You must be signed in before linking WhatsApp." }, { status: 401 });
  }

  if (!isValidE164(phone)) {
    return NextResponse.json({ ok: false, message: "Enter a valid phone number in international format (e.g. +2348012345678)." }, { status: 400 });
  }

  try {
    const existingUser = await getUserByEmail(email);
    const existingNumber = existingUser?.whatsappNumber?.trim();
    if (existingNumber && existingNumber !== phone) {
      return NextResponse.json(
        {
          ok: false,
          message: `This account already has WhatsApp ${existingNumber} linked. Delete it first before linking a new number.`,
        },
        { status: 409 },
      );
    }

    await upsertUser({
      email,
      name,
      avatarUrl: body.avatarUrl?.trim() || undefined,
    });

    const code = createPendingWhatsAppLink({
      email,
      name,
      phoneNumber: phone,
      avatarUrl: body.avatarUrl?.trim() || undefined,
    });

    await sendWhatsAppCode({ to: phone, code });

    return NextResponse.json({
      ok: true,
      pendingVerification: true,
      message: "Verification code sent to your WhatsApp.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start WhatsApp verification.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
