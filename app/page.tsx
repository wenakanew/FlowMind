export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 rounded-3xl bg-white p-10 shadow-sm dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          FlowMind Dashboard
        </h1>
        <p className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
          Welcome to your AI-powered personal workflow operating system. This dashboard
          will let you manage your account, link integrations, and inspect activity,
          while day-to-day work happens through Telegram and WhatsApp.
        </p>
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Getting started
            </h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Next steps will include creating an account, linking your messaging
              handles, and connecting tools like GitHub, Gmail, and Cal.com.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              System status
            </h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Once wired, this area can surface health information from the
              <code className="mx-1 rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
                /api/health
              </code>
              endpoint and your connected integrations.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
