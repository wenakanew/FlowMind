"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { INTEGRATIONS } from "@/lib/integrations";
import { getUserProfile } from "@/lib/preferences";
import { fetchSyncedUser } from "@/lib/user-sync-client";
import { TelegramLinkModal } from "@/components/dashboard/telegram-link-modal";
import { WhatsAppLinkModal } from "@/components/dashboard/whatsapp-link-modal";

const messaging = INTEGRATIONS.filter((i) => i.action === "link");
const tools = INTEGRATIONS.filter((i) => i.action === "connect");

export default function IntegrationsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [whatsappLinked, setWhatsappLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  const profileEmail = useMemo(() => getUserProfile().email, []);

  useEffect(() => {
    if (!isAuthenticated || !profileEmail) {
      setTelegramLinked(false);
      setTelegramUsername(null);
      setWhatsappNumber(null);
      setGmailConnected(false);
      setGithubConnected(false);
      setCalendarConnected(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const user = await fetchSyncedUser(profileEmail);
        if (active) {
          setTelegramLinked(Boolean(user?.telegramUsername || user?.telegramChatId));
          setWhatsappLinked(Boolean(user?.whatsappNumber));
          setTelegramUsername(user?.telegramUsername || (user?.telegramChatId ? `chat:${user.telegramChatId}` : null));
          setWhatsappNumber(user?.whatsappNumber || null);
          setGmailConnected(Boolean(user?.gmailConnected));
          setGithubConnected(Boolean(user?.githubConnected));
          setCalendarConnected(Boolean(user?.googleCalendarConnected));
        }
      } catch {
        if (active) {
          setTelegramLinked(false);
          setWhatsappLinked(false);
          setTelegramUsername(null);
          setWhatsappNumber(null);
          setGmailConnected(false);
          setGithubConnected(false);
          setCalendarConnected(false);
        }
      }
    };

    void load();

    const refresh = () => {
      void load();
    };

    window.addEventListener("flowmind:integrations-updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("flowmind:integrations-updated", refresh);
    };
  }, [isAuthenticated, profileEmail]);

  const handleConnect = (id: string) => {
    if (!profileEmail) return;

    if (id === "gmail" || id === "calendar") {
      window.location.href = `/api/integrations/google/authorize?email=${encodeURIComponent(profileEmail)}`;
      return;
    }

    if (id === "github") {
      window.location.href = `/api/integrations/github/authorize?email=${encodeURIComponent(profileEmail)}`;
      return;
    }

    setConnecting(id);
    setTimeout(() => setConnecting(null), 1500);
  };

  const handleToolAction = async (id: string, connected: boolean) => {
    if (!connected) {
      handleConnect(id);
      return;
    }

    const profile = getUserProfile();
    const body = {
      email: profile.email,
      name: profile.displayName,
      avatarUrl: profile.avatarUrl,
    };

    try {
      setConnecting(id);
      const endpoint = id === "github"
        ? "/api/integrations/github/disconnect"
        : "/api/integrations/google/disconnect";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect integration.");
      }

      window.dispatchEvent(new CustomEvent("flowmind:integrations-updated"));
    } finally {
      setConnecting(null);
    }
  };

  const handleLinkMessaging = (id: string) => {
    if (id === "telegram") {
      setTelegramModalOpen(true);
      return;
    }

    if (id === "whatsapp") {
      setWhatsappModalOpen(true);
      return;
    }

    handleConnect(id);
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Integrations
          </h1>
          <Link
            href="/integrations/manage"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Open Manage Page
          </Link>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Link your Telegram or WhatsApp so you can chat with the FlowMind bot and run flows. Connect your Gmail, GitHub, and Google Calendar to use them in your workflows.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Messaging — link your account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {messaging.map((item) => {
            const connected =
              item.id === "telegram"
                ? telegramLinked
                : item.id === "whatsapp"
                  ? whatsappLinked
                  : false;
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
                    onClick={() => handleLinkMessaging(item.id)}
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
            const connected =
              item.id === "gmail"
                ? gmailConnected
                : item.id === "github"
                  ? githubConnected
                  : item.id === "calendar"
                    ? calendarConnected
                    : false;
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
                    onClick={() => void handleToolAction(item.id, connected)}
                    disabled={!!connecting}
                    className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isConnecting
                      ? "Connecting…"
                      : connected
                        ? "Disconnect"
                        : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <TelegramLinkModal
        open={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        currentUsername={telegramUsername}
      />
      <WhatsAppLinkModal
        open={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        currentNumber={whatsappNumber}
      />
    </div>
  );
}
