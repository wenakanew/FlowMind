"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getUserProfile } from "@/lib/preferences";

interface TelegramLinkModalProps {
  open: boolean;
  onClose: () => void;
  currentUsername?: string | null;
}

interface LinkTelegramResponse {
  ok: boolean;
  message: string;
  pendingStart?: boolean;
  startUrl?: string | null;
}

interface FeedbackState {
  type: "success" | "error";
  text: string;
  actionLabel?: string;
  actionHref?: string;
}

export function TelegramLinkModal({ open, onClose, currentUsername }: TelegramLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [deletedCurrent, setDeletedCurrent] = useState(false);
  const { isAuthenticated } = useAuth();
  const hasExistingLinked = Boolean(currentUsername) && !deletedCurrent;

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setDeletedCurrent(false);
  }, [open, currentUsername]);

  if (!open) {
    return null;
  }

  const handleDeleteConnection = async () => {
    if (!isAuthenticated) {
      setFeedback({ type: "error", text: "Sign in first to manage Telegram." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const profile = getUserProfile();
      const response = await fetch("/api/integrations/telegram/link/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          name: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }),
      });

      const data = (await response.json()) as LinkTelegramResponse;

      if (!response.ok || !data.ok) {
        setFeedback({
          type: "error",
          text: data.message || "Unable to delete Telegram connection right now.",
        });
        return;
      }

      setDeletedCurrent(true);
      setFeedback({ type: "success", text: data.message || "Telegram connection deleted." });
      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete Telegram connection right now.";
      setFeedback({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setFeedback({ type: "error", text: "Sign in first to link Telegram." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const profile = getUserProfile();
      const response = await fetch("/api/integrations/telegram/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          name: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }),
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
      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
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
          {hasExistingLinked ? "Manage Telegram" : "Link Telegram"}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {hasExistingLinked
            ? "Only one Telegram account is allowed. Delete the current one before adding another."
            : "Click Connect, then open Telegram and press Start in the bot chat to verify this account."}
        </p>

        {hasExistingLinked ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              Linked account: <span className="font-medium">{currentUsername?.startsWith("chat:") ? currentUsername : `@${currentUsername}`}</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              To add a new account, delete this one first.
            </p>

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
              </div>
            )}

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDeleteConnection}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {loading ? "Deleting…" : "Delete connection"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              You do not need a Telegram username. Verification uses your Telegram account directly after pressing Start.
            </div>

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
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
                      onClose();
                    }}
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
                {loading ? "Starting…" : "Connect"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
