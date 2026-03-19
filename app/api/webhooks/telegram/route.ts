import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/ai';
import { upsertUser } from '@/lib/notion-provider';
import { getUserByTelegramIdentifier } from '@/lib/notion-provider';
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

async function sendTelegramMessage(token: string, chatId: number, text: string, maxRetries = 3) {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                }),
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return;
            }
            
            const errorText = await response.text();
            lastError = new Error(`Telegram API returned ${response.status}: ${errorText}`);
            
            if (response.status >= 500 || response.status === 429) {
                // Retry on server errors and rate limiting
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
                    continue;
                }
            } else {
                // Non-retryable error
                throw lastError;
            }
        } catch (error: any) {
            lastError = error;
            console.warn(`Telegram send attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Retry on network errors
                const delayMs = 1000 * attempt;
                console.log(`Retrying in ${delayMs}ms...`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }
    
    console.error('Failed to send Telegram message after all retries:', lastError);
    throw lastError;
}

function isStartCommand(text: string) {
    return text.trim().toLowerCase().startsWith('/start');
}

function extractSixDigitCode(text: string) {
    const clean = text.trim();
    return /^\d{6}$/.test(clean) ? clean : null;
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

        const verificationCode = extractSixDigitCode(text);

        if (verificationCode) {
            void (async () => {
                try {
                    const pending = await consumePendingTelegramLink(verificationCode);

                    if (!pending) {
                        await sendTelegramMessage(
                            telegramToken,
                            chatId,
                            "Invalid or expired verification code. Please reconnect Telegram from your FlowMind dashboard to get a new code.",
                        );
                        return;
                    }

                    await upsertUser({
                        email: pending.email,
                        name: pending.name,
                        avatarUrl: pending.avatarUrl,
                        telegramUsername: fromUsername || undefined, // Only store actual username, not fallback
                        telegramChatId: String(fromId || chatId), // Chat ID is always primary
                    });

                    await sendTelegramMessage(
                        telegramToken,
                        chatId,
                        `✅ Telegram verified and linked successfully.${fromUsername ? ` Linked as @${fromUsername}.` : ' Linked to your chat ID.'} You can now chat with FlowMind here.`,
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

        if (isStartCommand(text)) {
            void (async () => {
                try {
                    await sendTelegramMessage(
                        telegramToken,
                        chatId,
                        "Welcome to FlowMind. Please enter your 6-digit verification code from the dashboard to link this Telegram account.",
                    );
                } catch (error) {
                    console.error('Telegram start prompt error:', error);
                    // Try to send fallback message without retries (simple attempt)
                    try {
                        const fallbackUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
                        await fetch(fallbackUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: 'Welcome to FlowMind. Please link your account from the dashboard.',
                            }),
                        });
                    } catch (fallbackError) {
                        console.error('Fallback message also failed:', fallbackError);
                    }
                }
            })();

            return NextResponse.json({ ok: true });
        }

        // Respond to Telegram immediately to avoid webhook timeout retries.
        void (async () => {
            try {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for typing indicator
                    
                    await fetch(`https://api.telegram.org/bot${telegramToken}/sendChatAction`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
                        signal: controller.signal,
                    });
                    
                    clearTimeout(timeoutId);
                } catch (chatActionError) {
                    console.warn('Telegram chat action failed, continuing:', chatActionError);
                }

                let replyText = "I am online, but I hit a temporary processing issue. Please try again.";
                try {
                    // Lookup user by Telegram Chat ID first (works for accounts without usernames),
                    // then fall back to username if Chat ID match fails
                    const linkedUser = await getUserByTelegramIdentifier(fromId || chatId);

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
                try {
                    await sendTelegramMessage(telegramToken, chatId, replyText);
                } catch (sendError) {
                    console.error("Failed to send final message to Telegram:", sendError);
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
