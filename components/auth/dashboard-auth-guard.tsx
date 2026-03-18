"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseEnabled, authReady, authLoading, isAuthenticated, signIn } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  const canUseActions = useMemo(
    () => isAuthenticated || !firebaseEnabled,
    [firebaseEnabled, isAuthenticated],
  );

  const shouldAllowAnchor = (href: string | null) => {
    if (!href) return true;
    if (href.startsWith("#")) return true;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;
    if (href.startsWith("/api/")) return false;
    if (href.startsWith("/")) return true;
    if (/^https?:\/\//i.test(href)) return false;
    return true;
  };

  const promptForSignIn = () => {
    if (canUseActions) return;
    setShowPrompt(true);
  };

  const handleInteractionCapture: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (canUseActions) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('[data-auth-bypass="true"]')) {
      return;
    }

    const actionable = target.closest(
      [
        "button",
        "[role='button']",
        "input",
        "select",
        "textarea",
        "label[for]",
        "[data-requires-auth='true']",
        "a[href]",
      ].join(","),
    ) as HTMLElement | null;

    if (!actionable) return;

    if (actionable.matches("a[href]")) {
      const href = (actionable as HTMLAnchorElement).getAttribute("href");
      if (shouldAllowAnchor(href)) {
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();
    promptForSignIn();
  };

  const handleSubmitCapture: React.FormEventHandler<HTMLDivElement> = (event) => {
    if (canUseActions) return;
    event.preventDefault();
    event.stopPropagation();
    promptForSignIn();
  };

  const title = !firebaseEnabled
    ? "Sign-in required"
    : authReady
      ? "Sign in to use FlowMind"
      : "Checking your session…";

  const description = !firebaseEnabled
    ? "Firebase auth is not configured, so dashboard actions are disabled."
    : authReady
      ? "You can browse the dashboard, but actions are disabled until you sign in with Google."
      : "Please wait while we verify your authentication state.";

  const canSignIn = firebaseEnabled && authReady;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <div onClickCapture={handleInteractionCapture} onSubmitCapture={handleSubmitCapture}>
        {children}
      </div>

      {!canUseActions && (
        <div className="fixed bottom-4 right-4 z-30 rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-300">
          Browse mode: actions require sign-in.
        </div>
      )}

      {showPrompt && !canUseActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-6 py-10" role="dialog" aria-modal="true" aria-label="Sign-in required">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                data-auth-bypass="true"
                onClick={() => setShowPrompt(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Not now
              </button>

              {canSignIn && (
                <button
                  type="button"
                  data-auth-bypass="true"
                  onClick={() => void signIn()}
                  disabled={authLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {authLoading ? "Signing in…" : "Sign in with Google"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
