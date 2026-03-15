"use client";

import { useState } from "react";
import { INTEGRATIONS } from "@/lib/integrations";

const messaging = INTEGRATIONS.filter((i) => i.action === "link");
const tools = INTEGRATIONS.filter((i) => i.action === "connect");

export default function IntegrationsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    setConnecting(id);
    setTimeout(() => setConnecting(null), 1500);
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Integrations
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Link your Telegram or WhatsApp so you can chat with the FlowMind bot and run flows. Connect your Gmail, GitHub, and Cal.com to use them in your workflows.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Messaging — link your account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {messaging.map((item) => {
            const connected = false;
            const isConnecting = connecting === item.id;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {connected ? "Linked" : "Not linked"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </h3>
                <p className="mt-1 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleConnect(item.id)}
                    disabled={!!connecting}
                    className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isConnecting
                      ? "Sending confirmation…"
                      : connected
                        ? "Manage"
                        : "Link"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Tools — connect your account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((item) => {
            const connected = false;
            const isConnecting = connecting === item.id;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </h3>
                <p className="mt-1 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleConnect(item.id)}
                    disabled={!!connecting}
                    className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isConnecting
                      ? "Connecting…"
                      : connected
                        ? "Manage"
                        : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
