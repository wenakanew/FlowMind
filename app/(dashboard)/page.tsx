import Link from "next/link";
import { OverviewConnectSection } from "@/components/dashboard/overview-connect-section";
import { OverviewSystemStatus } from "@/components/dashboard/overview-system-status";

export default function DashboardOverview() {
  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Hero */}
      <section className="rounded-2xl border border-zinc-200 bg-linear-to-br from-white to-zinc-50/80 p-6 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900/80 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Welcome to FlowMind
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your AI-powered personal workflow operating system. Run tasks, manage
          flows, and stay in control from Telegram and WhatsApp—while this
          dashboard gives you a single place to configure integrations, inspect
          activity, and tune your experience.
        </p>
      </section>

      {/* What FlowMind does */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          What FlowMind does
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          At the end of development you’ll have:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Unified command center",
              desc: "One dashboard to manage account, integrations, and system health.",
              icon: "◉",
            },
            {
              title: "Messaging-first workflows",
              desc: "Create and run flows from Telegram and WhatsApp without leaving the app.",
              icon: "◇",
            },
            {
              title: "Integrations hub",
              desc: "Connect GitHub, Gmail, Cal.com, and more; control them via natural language.",
              icon: "⬡",
            },
            {
              title: "AI engine (Gemini)",
              desc: "Tasks and decisions powered by Google Gemini for smart automation.",
              icon: "◆",
            },
            {
              title: "Activity & logs",
              desc: "Inspect runs, errors, and usage in one place.",
              icon: "▣",
            },
            {
              title: "Settings & profile",
              desc: "Theme, notifications, timezone, and profile all in one place.",
              icon: "⚙",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="text-xl opacity-80" aria-hidden>
                {item.icon}
              </span>
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Connect & get started */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Connect & get started
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Link your channels and tools to start running flows.
        </p>
        <OverviewConnectSection />
      </section>

      {/* System status */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          System status
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Backend and integration health at a glance.
        </p>
        <OverviewSystemStatus />
      </section>

      {/* Quick links */}
      <section className="flex flex-wrap gap-3">
        <Link
          href="/flows"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          View flows →
        </Link>
        <Link
          href="/integrations"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          Manage integrations →
        </Link>
        <Link
          href="/profile"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          Profile →
        </Link>
        <Link
          href="/settings"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          System settings
        </Link>
      </section>
    </div>
  );
}
