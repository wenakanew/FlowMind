"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserProfile } from "@/lib/preferences";
import { fetchSyncedUser } from "@/lib/user-sync-client";

interface ItemState {
  id: "telegram" | "whatsapp" | "gmail" | "github" | "calendar";
  name: string;
  connected: boolean;
}

export default function IntegrationsManagePage() {
  const [items, setItems] = useState<ItemState[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const profile = useMemo(() => getUserProfile(), []);

  const load = useCallback(async () => {
    if (!profile.email) return;
    const user = await fetchSyncedUser(profile.email);
    setItems([
      { id: "telegram", name: "Telegram", connected: Boolean(user?.telegramUsername || user?.telegramChatId) },
      { id: "whatsapp", name: "WhatsApp", connected: Boolean(user?.whatsappNumber) },
      { id: "gmail", name: "Gmail", connected: Boolean(user?.gmailConnected) },
      { id: "github", name: "GitHub", connected: Boolean(user?.githubConnected) },
      { id: "calendar", name: "Google Calendar", connected: Boolean(user?.googleCalendarConnected) },
    ]);
  }, [profile.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = (id: ItemState["id"]) => {
    if (!profile.email) return;
    if (id === "github") {
      window.location.href = `/api/integrations/github/authorize?email=${encodeURIComponent(profile.email)}`;
      return;
    }
    if (id === "gmail" || id === "calendar") {
      window.location.href = `/api/integrations/google/authorize?email=${encodeURIComponent(profile.email)}`;
      return;
    }
    window.location.href = "/integrations";
  };

  const disconnect = async (id: ItemState["id"]) => {
    setBusy(id);
    try {
      const baseBody = {
        email: profile.email,
        name: profile.displayName,
        avatarUrl: profile.avatarUrl,
      };

      const endpoint =
        id === "telegram"
          ? "/api/integrations/telegram/link/disconnect"
          : id === "whatsapp"
            ? "/api/integrations/whatsapp/link/disconnect"
            : id === "github"
              ? "/api/integrations/github/disconnect"
              : "/api/integrations/google/disconnect";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect integration.");
      }

      await load();
      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Manage Integrations</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Connect or disconnect all integrations from one page.</p>
        </div>
        <Link href="/integrations" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Back
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {item.connected ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => connect(item.id)}
                disabled={busy === item.id}
                className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {item.connected ? "Reconnect" : "Connect"}
              </button>
              {item.connected && (
                <button
                  type="button"
                  onClick={() => void disconnect(item.id)}
                  disabled={busy === item.id}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm dark:border-zinc-700"
                >
                  {busy === item.id ? "Working…" : "Disconnect"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
