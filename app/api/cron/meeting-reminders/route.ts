import { NextResponse } from "next/server";
import { getTasks, getUserByEmail, updateTaskStatus } from "@/lib/notion-provider";
import { sendTelegramBotMessage, sendWhatsAppMessage } from "@/lib/messaging";

export const dynamic = "force-dynamic";

function extractEmailFromOwner(owner?: string) {
  if (!owner) return null;
  const match = owner.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() || null;
}

function isReminderTask(title: string) {
  return title.trim().toLowerCase().startsWith("reminder:");
}

function buildReminderMessage(title: string) {
  const content = title.replace(/^reminder:\s*/i, "").trim();
  return `⏰ Reminder: ${content}`;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;

  if (expected) {
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token || token !== expected) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
  }

  const now = Date.now();
  const windowStart = now - 90 * 1000;
  const windowEnd = now + 60 * 1000;

  const tasks = await getTasks().catch(() => []);
  const due = tasks.filter((task) => {
    if (!task.deadline || !isReminderTask(task.title)) return false;
    const ms = Date.parse(task.deadline);
    if (Number.isNaN(ms)) return false;
    return ms >= windowStart && ms <= windowEnd;
  });

  const results: Array<{ taskId: string; sent: boolean; channel?: string; reason?: string }> = [];

  for (const task of due) {
    try {
      const ownerEmail = extractEmailFromOwner(task.owner);
      if (!ownerEmail) {
        results.push({ taskId: task.id, sent: false, reason: "No owner email on task." });
        continue;
      }

      const user = await getUserByEmail(ownerEmail);
      if (!user) {
        results.push({ taskId: task.id, sent: false, reason: "Owner user not found." });
        continue;
      }

      const message = buildReminderMessage(task.title);

      if (user.telegramChatId) {
        await sendTelegramBotMessage({ chatId: user.telegramChatId, text: message });
        await updateTaskStatus(task.id, "Done");
        results.push({ taskId: task.id, sent: true, channel: "telegram" });
        continue;
      }

      if (user.whatsappNumber) {
        await sendWhatsAppMessage({ to: user.whatsappNumber, text: message });
        await updateTaskStatus(task.id, "Done");
        results.push({ taskId: task.id, sent: true, channel: "whatsapp" });
        continue;
      }

      results.push({ taskId: task.id, sent: false, reason: "No linked Telegram/WhatsApp destination." });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      results.push({ taskId: task.id, sent: false, reason });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: tasks.length,
    due: due.length,
    processed: results.length,
    results,
  });
}
