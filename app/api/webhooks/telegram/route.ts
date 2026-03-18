import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/ai';
import { upsertUser } from '@/lib/notion';
import { getUserByTelegramUsername } from '@/lib/notion';
import { getUserByTelegramChatId } from '@/lib/notion';
import { consumePendingTelegramLink } from '@/lib/telegram-link-verification';
import { dispatchDueRemindersForUser } from '@/lib/reminders';

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

async function sendTelegramMessage(token: string, chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
        }),
    });
}

function extractVerificationToken(text: string) {
    if (!text.startsWith('/start')) {
        return null;
    }

    const payload = text.split(/\s+/, 2)[1];
    if (!payload || !payload.startsWith('flowmind_link_')) {
        return null;
    }

    return payload.replace('flowmind_link_', '').trim();
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
        const fromUsername = body.message.from?.username as string | undefined;
        const fromId = body.message.from?.id as number | undefined;

        console.log(`\n📲 Received Telegram message from chat ${chatId}: "${text}"`);

        if (!telegramToken) {
            console.error("TELEGRAM_BOT_TOKEN is missing!");
            return NextResponse.json({ ok: true });
        }

        const verificationToken = extractVerificationToken(text);
        if (verificationToken) {
            void (async () => {
                try {
                    // consumePendingTelegramLink is now async
                    const pending = await consumePendingTelegramLink(verificationToken);

                    if (!pending) {
                        await sendTelegramMessage(
                            telegramToken,
                            chatId,
                            "Verification link expired or invalid. Please reconnect Telegram from your FlowMind dashboard.",
                        );
                        return;
                    }

                    await upsertUser({
                        email: pending.email,
                        name: pending.name,
                        avatarUrl: pending.avatarUrl,
                        telegramUsername: fromUsername || '',
                        telegramChatId: String(fromId || chatId),
                    });

                    await sendTelegramMessage(
                        telegramToken,
                        chatId,
                        `✅ Telegram verified and linked successfully.${fromUsername ? ` Linked username: @${fromUsername}.` : ''}`,
                    );
                } catch (error: any) {
                    console.error('Telegram verification error:', error);
                    await sendTelegramMessage(
                        telegramToken,
                        chatId,
                        'Verification failed due to a temporary error. Please try linking again from dashboard.',
                    );
                }
            })();

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
                    const linkedByChatId = await getUserByTelegramChatId(String(fromId || chatId));
                    const linkedByUsername = fromUsername ? await getUserByTelegramUsername(fromUsername) : null;
                    const linkedUser = linkedByChatId || linkedByUsername;

                    if (!linkedUser?.email) {
                        replyText = "This Telegram account is not linked to FlowMind yet. Please link Telegram from your dashboard first.";
                    } else {
                        try {
                            await dispatchDueRemindersForUser({
                                email: linkedUser.email,
                                preferredChannel: 'telegram',
                                telegramChatId: linkedUser.telegramChatId,
                                whatsappNumber: linkedUser.whatsappNumber,
                            });
                        } catch (reminderError) {
                            console.error('Reminder dispatch warning (Telegram):', reminderError);
                        }

                        const aiReply = await runAgent(text, {
                            email: linkedUser.email,
                            name: linkedUser.name,
                            handle: fromUsername || String(fromId || chatId),
                            channel: 'telegram',
                        });
                        if (aiReply && aiReply.trim().length > 0) {
                            replyText = aiReply;
                        }
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
