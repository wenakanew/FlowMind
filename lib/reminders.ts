import { getTasks, updateTaskStatus } from "@/lib/notion-provider";
import { sendTelegramBotMessage, sendWhatsAppMessage } from "@/lib/messaging";

interface DispatchInput {
  email: string;
  preferredChannel: "telegram" | "whatsapp";
  telegramChatId?: string;
  whatsappNumber?: string;
}

function normalize(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isReminderTaskTitle(title: string) {
  return normalize(title).startsWith("reminder:");
}

function extractReminderMessage(title: string) {
  const content = title.replace(/^reminder:\s*/i, "").trim();
  return `⏰ Remember: ${content}`;
}

async function sendReminder(
  channel: "telegram" | "whatsapp",
  destination: string,
  message: string,
) {
  if (channel === "telegram") {
    await sendTelegramBotMessage({ chatId: destination, text: message });
    return;
  }

  await sendWhatsAppMessage({ to: destination, text: message });
}

export async function dispatchDueRemindersForUser(input: DispatchInput) {
  const email = normalize(input.email);
  if (!email) return 0;

  const now = Date.now();
  const maxFutureMs = now + 2 * 60 * 1000;
  const maxPastMs = now - 24 * 60 * 60 * 1000;

  const tasks = await getTasks().catch(() => []);
  const due = tasks.filter((task) => {
    if (!task.deadline || !task.title) return false;
    if (!isReminderTaskTitle(task.title)) return false;
    if (normalize(task.status) === "done") return false;

    const owner = normalize(task.owner);
    if (!owner.includes(email)) return false;

    const dueMs = Date.parse(task.deadline);
    if (Number.isNaN(dueMs)) return false;

    return dueMs >= maxPastMs && dueMs <= maxFutureMs;
  });

  let sentCount = 0;
  for (const task of due) {
    const message = extractReminderMessage(task.title);

    const channels: Array<{ channel: "telegram" | "whatsapp"; destination?: string }> =
      input.preferredChannel === "telegram"
        ? [
            { channel: "telegram", destination: input.telegramChatId },
            { channel: "whatsapp", destination: input.whatsappNumber },
          ]
        : [
            { channel: "whatsapp", destination: input.whatsappNumber },
            { channel: "telegram", destination: input.telegramChatId },
          ];

    for (const target of channels) {
      if (!target.destination) continue;
      try {
        await sendReminder(target.channel, target.destination, message);
        await updateTaskStatus(task.id, "Done");
        sentCount += 1;
        break;
      } catch {
        // try fallback channel
      }
    }
  }

  return sentCount;
}
