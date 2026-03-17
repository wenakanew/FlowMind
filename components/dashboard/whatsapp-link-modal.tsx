"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getUserProfile } from "@/lib/preferences";

interface WhatsAppLinkModalProps {
  open: boolean;
  onClose: () => void;
  currentNumber?: string | null;
}

interface ApiResponse {
  ok: boolean;
  message: string;
}

const SANDBOX_NUMBER = "+1 415 523 8886";
const SANDBOX_CODE = "join speak-essential";

export function WhatsAppLinkModal({ open, onClose, currentNumber }: WhatsAppLinkModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletedCurrent, setDeletedCurrent] = useState(false);
  const { isAuthenticated } = useAuth();

  const normalizedPhone = useMemo(() => phoneNumber.trim(), [phoneNumber]);
  const hasExistingLinked = Boolean(currentNumber) && !deletedCurrent;

  useEffect(() => {
    if (!open) return;
    setStep("phone");
    setPhoneNumber("");
    setCode("");
    setFeedback(null);
    setDeletedCurrent(false);
  }, [open, currentNumber]);

  if (!open) return null;

  const profile = getUserProfile();

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ type: "success", text: `${label} copied.` });
    } catch {
      setFeedback({ type: "error", text: `Unable to copy ${label.toLowerCase()}.` });
    }
  };

  const deleteCurrentConnection = async () => {
    if (!isAuthenticated) {
      setFeedback({ type: "error", text: "Sign in first to manage WhatsApp." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/integrations/whatsapp/link/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
          name: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.ok) {
        setFeedback({ type: "error", text: data.message || "Could not delete connection." });
        return;
      }

      setDeletedCurrent(true);
      setFeedback({ type: "success", text: data.message });
      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete connection.";
      setFeedback({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const startVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setFeedback({ type: "error", text: "Sign in first to link WhatsApp." });
      return;
    }

    if (!normalizedPhone) {
      setFeedback({ type: "error", text: "Please enter your WhatsApp number." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/integrations/whatsapp/link/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          email: profile.email,
          name: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.ok) {
        setFeedback({ type: "error", text: data.message || "Could not send verification code." });
        return;
      }

      setStep("code");
      setFeedback({ type: "success", text: data.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send verification code.";
      setFeedback({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/integrations/whatsapp/link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          email: profile.email,
          name: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.ok) {
        setFeedback({ type: "error", text: data.message || "Verification failed." });
        return;
      }

      setFeedback({ type: "success", text: data.message });
      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      setFeedback({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {hasExistingLinked ? "Manage WhatsApp" : "Link WhatsApp"}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {hasExistingLinked
            ? "Only one WhatsApp number is allowed. Delete the current one before adding another."
            : step === "phone"
              ? "Enter your WhatsApp number to receive a verification code."
              : "Enter the 6-digit code sent to your WhatsApp."}
        </p>

        {!hasExistingLinked && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">📲 Sandbox setup required</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-amber-700 dark:text-amber-400">
              <li>Open WhatsApp.</li>
              <li>Message this number:</li>
            </ol>
            <div className="mt-1 flex items-center justify-between gap-2 rounded bg-amber-100 px-2 py-1 dark:bg-amber-900/40">
              <code className="text-xs font-mono text-amber-900 dark:text-amber-200">{SANDBOX_NUMBER}</code>
              <button
                type="button"
                onClick={() => handleCopy(SANDBOX_NUMBER, "Phone number")}
                className="rounded border border-amber-300 px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/60"
                aria-label="Copy sandbox number"
                title="Copy"
              >
                ⧉ Copy
              </button>
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">3. Send this code:</p>
            <div className="mt-1 flex items-center justify-between gap-2 rounded bg-amber-100 px-2 py-1 dark:bg-amber-900/40">
              <code className="text-xs font-mono text-amber-900 dark:text-amber-200">{SANDBOX_CODE}</code>
              <button
                type="button"
                onClick={() => handleCopy(SANDBOX_CODE, "Sandbox code")}
                className="rounded border border-amber-300 px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/60"
                aria-label="Copy sandbox code"
                title="Copy"
              >
                ⧉ Copy
              </button>
            </div>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">4. Come back and continue here.</p>
          </div>
        )}

        {hasExistingLinked ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              Linked number: <span className="font-medium">{currentNumber}</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              To add a new number, delete this one first.
            </p>
            {feedback && (
              <p className={`text-sm ${feedback.type === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {feedback.text}
              </p>
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
                onClick={deleteCurrentConnection}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {loading ? "Deleting…" : "Delete connection"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={step === "phone" ? startVerification : verifyCode} className="mt-4 space-y-3">
            {step === "phone" ? (
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              WhatsApp number
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="+2348012345678"
              />
            </label>
          ) : (
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Verification code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm tracking-widest text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="123456"
                inputMode="numeric"
              />
            </label>
            )}

            {feedback && (
              <p className={`text-sm ${feedback.type === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {feedback.text}
              </p>
            )}

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              {step === "code" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setFeedback(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Please wait…" : step === "phone" ? "Send code" : "Verify"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
