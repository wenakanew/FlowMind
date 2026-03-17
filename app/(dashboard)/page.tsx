import Link from "next/link";
import { OverviewConnectSection } from "@/components/dashboard/overview-connect-section";
import { getTasks, getProjects } from "@/lib/notion";

export default async function DashboardOverview() {
  const [tasks, projects] = await Promise.all([
    getTasks().catch(() => []),
    getProjects("In Progress").catch(() => []),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todaysTasks = tasks.filter(
    (t) => t.deadline && t.deadline.slice(0, 10) <= today && t.status !== "Done"
  );
  const activeProjects = projects;

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

      {/* Today & active projects (live from Notion) */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Today&apos;s tasks
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {todaysTasks.length} due
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {todaysTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {task.status}
                    {task.owner ? ` • ${task.owner}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                  Due
                </span>
              </div>
            ))}
            {todaysTasks.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No tasks due today.
              </p>
            )}
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/tasks"
              className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              View all tasks →
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Active projects
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {activeProjects.length} in progress
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {activeProjects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {project.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {project.status}
                  </p>
                </div>
              </div>
            ))}
            {activeProjects.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No active projects yet.
              </p>
            )}
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/projects"
              className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              View all projects →
            </Link>
          </div>
        </div>
      </section>

      {/* What FlowMind does */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          What FlowMind does
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          What you can do with FlowMind:
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
              desc: "Connect GitHub, Gmail, Google Calendar, and more; control them via natural language.",
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
    </div>
  );
}
