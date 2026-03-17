import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    const messageSid = params.get("MessageSid") ?? "";
    const messageStatus = params.get("MessageStatus") ?? "";
    const to = params.get("To") ?? "";
    const from = params.get("From") ?? "";
    const errorCode = params.get("ErrorCode") ?? "";
    const errorMessage = params.get("ErrorMessage") ?? "";

    console.log("WhatsApp status callback:", {
      messageSid,
      messageStatus,
      to,
      from,
      errorCode,
      errorMessage,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp status callback error:", error);
    return NextResponse.json({ ok: true });
  }
}
