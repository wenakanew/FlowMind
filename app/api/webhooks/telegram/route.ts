import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/ai';

function getFriendlyAiErrorMessage(error: unknown) {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    const lower = raw.toLowerCase();

    if (
        lower.includes("resource_exhausted") ||
        lower.includes("quota") ||
        lower.includes("429")
    ) {
        return "AI is temporarily unavailable because Gemini API quota is exceeded. Please enable billing or use a key/project with available quota.";
    }

    return "I am online, but I hit a temporary processing issue. Please try again.";
}

export async function POST(req: Request) {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

    try {
        const body = await req.json();

        // Telegram typically sends messages inside `update.message`
        if (!body.message || !body.message.text) {
            // Acknowledge other types of updates without processing
            return NextResponse.json({ ok: true });
        }

        const chatId = body.message.chat.id;
        const text = body.message.text;

        console.log(`\n📲 Received Telegram message from chat ${chatId}: "${text}"`);

        if (!telegramToken) {
            console.error("TELEGRAM_BOT_TOKEN is missing!");
            return NextResponse.json({ ok: true });
        }

        // Respond to Telegram immediately to avoid webhook timeout retries.
        void (async () => {
            try {
                await fetch(`https://api.telegram.org/bot${telegramToken}/sendChatAction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
                });

                let replyText = "I am online, but I hit a temporary processing issue. Please try again.";
                try {
                    const aiReply = await runAgent(text);
                    if (aiReply && aiReply.trim().length > 0) {
                        replyText = aiReply;
                    }
                } catch (error: any) {
                    console.error("AI processing error:", error);
                    replyText = getFriendlyAiErrorMessage(error);
                }

                const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
                const response = await fetch(telegramApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: replyText
                    })
                });

                if (!response.ok) {
                    console.error("Failed to send message to Telegram:", await response.text());
                }
            } catch (error: any) {
                console.error("Telegram background reply error:", error);
            }
        })();

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Telegram webhook error:", error);
        // Always ack Telegram to avoid retry loops.
        return NextResponse.json({ ok: true });
    }
}
