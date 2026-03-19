import { getTasks } from "@/lib/notion-provider";

export default async function TasksPage() {
  const tasks = await getTasks().catch(() => []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tasks
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tasks from your Notion workspace.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No tasks found yet.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {task.status}
                    {task.owner ? ` • ${task.owner}` : ""}
                    {task.deadline ? ` • due ${task.deadline.slice(0, 10)}` : ""}
                  </p>
                </div>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                >
                  Open in Notion
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

