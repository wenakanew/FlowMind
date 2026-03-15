export default function FlowsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Flows
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create and manage your workflow automations.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No flows yet. Flows will appear here once you create them.
        </p>
      </div>
    </div>
  );
}
