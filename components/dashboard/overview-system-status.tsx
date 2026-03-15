"use client";

import { useEffect, useState } from "react";

interface HealthResponse {
  status?: string;
  service?: string;
  timestamp?: string;
}

export function OverviewSystemStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to fetch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statusOk = health?.status === "ok";

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-3 w-3 shrink-0 rounded-full ${
            loading
              ? "animate-pulse bg-amber-400"
              : statusOk
                ? "bg-emerald-500"
                : "bg-red-500"
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          {loading && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Checking backend…
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {!loading && !error && health && (
            <>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Backend: {health.service ?? "flowmind-dashboard"} —{" "}
                <span
                  className={
                    statusOk
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {health.status ?? "unknown"}
                </span>
              </p>
              {health.timestamp && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Last check: {new Date(health.timestamp).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
