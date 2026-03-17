"use client";

import { useAuth } from "@/components/auth/auth-provider";

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseEnabled, authReady, authLoading, isAuthenticated, signIn } = useAuth();

  if (isAuthenticated) {
    return <>{children}</>;
  }

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
      <div className="pointer-events-none select-none opacity-60 blur-[1px]">{children}</div>
      <div className="absolute inset-0 z-40 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          {canSignIn && (
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={authLoading}
              className="mt-6 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {authLoading ? "Signing in…" : "Sign in with Google"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
