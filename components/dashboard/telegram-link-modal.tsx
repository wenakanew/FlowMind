"use client";

import { FormEvent, useMemo, useState } from "react";

interface TelegramLinkModalProps {
  open: boolean;
  onClose: () => void;
}

interface LinkTelegramResponse {
  ok: boolean;
  message: string;
  username?: string;
  pendingStart?: boolean;
  startUrl?: string | null;
}

interface FeedbackState {
  type: "success" | "error";
  text: string;
  actionLabel?: string;
  actionHref?: string;
}

export function TelegramLinkModal({ open, onClose }: TelegramLinkModalProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const normalizedUsername = useMemo(
    () => username.trim().replace(/^@+/, ""),
    [username],
  );

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedUsername) {
      setFeedback({ type: "error", text: "Please enter your Telegram username." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/integrations/telegram/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: normalizedUsername }),
      });

      const data = (await response.json()) as LinkTelegramResponse;

      if (!response.ok || !data.ok) {
        setFeedback({
          type: "error",
          text: data.message || "Unable to link Telegram right now.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: data.message,
        actionLabel: data.pendingStart && data.startUrl ? "Open Telegram" : undefined,
        actionHref: data.pendingStart ? data.startUrl || undefined : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to link Telegram right now.";
      setFeedback({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Link Telegram
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your Telegram username, then press Connect.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Telegram username
            <div className="mt-1 flex items-center rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">@</span>
              <input
                value={normalizedUsername}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent px-1 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                placeholder="your_username"
                autoFocus
                autoComplete="off"
              />
            </div>
          </label>

          {feedback && (
            <div className="space-y-2">
              <p
                className={`text-sm ${
                  feedback.type === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}
              >
                {feedback.text}
              </p>
              {feedback.actionHref && feedback.actionLabel && (
                <a
                  href={feedback.actionHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {feedback.actionLabel}
                </a>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
