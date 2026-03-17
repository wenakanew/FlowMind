import { NextResponse } from "next/server";
import { runAgent } from "@/lib/ai";
import { getUserByWhatsAppNumber } from "@/lib/notion";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFriendlyAiErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("429")
  ) {
    return "AI is temporarily unavailable (Gemini quota exceeded). Please try again later.";
  }

  return "I'm online but hit a temporary issue. Please try again.";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwimlMessage(message: string) {
  const safe = escapeXml(message);
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

async function parseIncomingMessage(req: Request) {
  if (req.method === "GET") {
    const url = new URL(req.url);
    return {
      from: url.searchParams.get("From") ?? "",
      body: url.searchParams.get("Body") ?? "",
    };
  }

  const raw = await req.text();
  const params = new URLSearchParams(raw);
  return {
    from: params.get("From") ?? "",
    body: params.get("Body") ?? "",
  };
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { from, body } = await parseIncomingMessage(req);

    if (!from || !body.trim()) {
      // Acknowledge empty / non-text updates
      return new NextResponse("", { status: 200 });
    }

    const senderDisplay = from.replace("whatsapp:", "");
    console.log(`📲 WhatsApp message from ${senderDisplay}: "${body}"`);

    let replyText = "I'm online, but hit a temporary processing issue. Please try again.";

    try {
      const linkedUser = await getUserByWhatsAppNumber(from);
      if (!linkedUser?.email) {
        const twiml = buildTwimlMessage("This WhatsApp number is not linked to FlowMind yet. Please link WhatsApp from your dashboard first.");
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "text/xml; charset=utf-8" },
        });
      }

      const aiReply = await Promise.race([
        runAgent(body, {
          email: linkedUser.email,
          name: linkedUser.name,
          handle: from,
          channel: 'whatsapp',
        }),
        new Promise<string>((resolve) =>
          setTimeout(() => resolve("I'm processing your request. Please try again in a few seconds if you don't see a complete answer."), 14000),
        ),
      ]);

      if (aiReply && aiReply.trim().length > 0) {
        replyText = aiReply;
      }
    } catch (error) {
      console.error("AI processing error (WhatsApp):", error);
      replyText = getFriendlyAiErrorMessage(error);
    }

    const twiml = buildTwimlMessage(replyText);
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    const twiml = buildTwimlMessage("I hit a temporary issue. Please try again.");
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
