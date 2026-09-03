import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/ai';
import { upsertUser, getUserByTelegramIdentifier } from '@/lib/notion';
import { consumePendingTelegramLink } from '@/lib/telegram-link-verification';
import { dispatchDueRemindersForUser } from '@/lib/reminders';
import { telegramWebhookSchema } from '@/lib/schemas/telegram-webhook';
import { telegramClient } from '@/lib/telegram-client';
import { logger } from '@/lib/logger';
import { ZodError } from 'zod';

const MODULE_NAME = 'TelegramWebhook';

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
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await telegramClient.sendMessage(token, chatId, text, controller.signal);
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return;
            }
            
            const errorText = await response.text();
            lastError = new Error(`Telegram API returned ${response.status}: ${errorText}`);
            
            if (response.status >= 500 || response.status === 429) {
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                    continue;
                }
            } else {
                throw lastError;
            }
        } catch (error: any) {
            lastError = error;
            logger.warn(MODULE_NAME, `Telegram send attempt ${attempt}/${maxRetries} failed`, { chatId }, error);
            
            if (attempt < maxRetries) {
                const delayMs = 1000 * attempt;
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }
    
    logger.error(MODULE_NAME, 'Failed to send Telegram message after all retries', { chatId }, lastError);
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
        const rawBody = await req.json();
        const body = telegramWebhookSchema.parse(rawBody);

        if (!body.message || !body.message.text) {
            return NextResponse.json({ ok: true });
        }

        const chatId = body.message.chat.id;
        const text = body.message.text;
        const fromUsername = body.message.from?.username as string | undefined;
        const fromId = body.message.from?.id as number | undefined;

        logger.info(MODULE_NAME, `Received Telegram message from chat ${chatId}`, {
            chatId,
            fromUsername,
            fromId,
            textLength: text.length,
        });

        if (!telegramToken) {
            logger.error(MODULE_NAME, "TELEGRAM_BOT_TOKEN environment variable is missing!");
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
                        telegramUsername: fromUsername || undefined,
                        telegramChatId: String(fromId || chatId),
                    });

                    await sendTelegramMessage(
                        telegramToken,
                        chatId,
                        `✅ Telegram verified and linked successfully.${fromUsername ? ` Linked as @${fromUsername}.` : ' Linked to your chat ID.'} You can now chat with FlowMind here.`,
                    );
                } catch (error: any) {
                    logger.error(MODULE_NAME, 'Telegram verification error', { chatId }, error);
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
                    logger.error(MODULE_NAME, 'Telegram start prompt error', { chatId }, error);
                    try {
                        await telegramClient.sendMessage(
                            telegramToken,
                            chatId,
                            'Welcome to FlowMind. Please link your account from the dashboard.',
                        );
                    } catch (fallbackError) {
                        logger.error(MODULE_NAME, 'Fallback start message failed', { chatId }, fallbackError);
                    }
                }
            })();

            return NextResponse.json({ ok: true });
        }

        void (async () => {
            try {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    await telegramClient.sendChatAction(telegramToken, chatId, 'typing', controller.signal);
                    clearTimeout(timeoutId);
                } catch (chatActionError) {
                    logger.warn(MODULE_NAME, 'Telegram chat action typing indicator failed', { chatId }, chatActionError);
                }

                let replyText = "I am online, but I hit a temporary processing issue. Please try again.";
                try {
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
                            logger.warn(MODULE_NAME, 'Reminder dispatch warning (Telegram)', { chatId }, reminderError);
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
                    logger.error(MODULE_NAME, "AI processing error (Telegram)", { chatId }, error);
                    replyText = getFriendlyAiErrorMessage(error);
                }

                try {
                    await sendTelegramMessage(telegramToken, chatId, replyText);
                } catch (sendError) {
                    logger.error(MODULE_NAME, "Failed to send final response to Telegram", { chatId }, sendError);
                }
            } catch (error: any) {
                logger.error(MODULE_NAME, "Telegram background reply unhandled error", { chatId }, error);
            }
        })();

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        if (error instanceof ZodError) {
            logger.warn(MODULE_NAME, 'Invalid Telegram webhook payload', { errors: error.errors });
            return NextResponse.json({ ok: false, error: 'Invalid Telegram webhook payload' }, { status: 400 });
        }
        logger.error(MODULE_NAME, "Telegram webhook outer error", {}, error);
        return NextResponse.json({ ok: true });
    }
}
