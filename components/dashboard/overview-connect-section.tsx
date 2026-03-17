"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { TelegramLinkModal } from "@/components/dashboard/telegram-link-modal";
import { WhatsAppLinkModal } from "@/components/dashboard/whatsapp-link-modal";
import { getUserProfile } from "@/lib/preferences";
import { fetchSyncedUser } from "@/lib/user-sync-client";

const connectItems = [
  {
    id: "telegram",
    name: "Telegram",
    description: "Run flows and get updates in your Telegram chat.",
    icon: "",
    connected: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Control flows and receive notifications via WhatsApp.",
    icon: "",
    connected: false,
  },
  {
    id: "integrations",
    name: "Integrations",
    description: "GitHub, Gmail, Google Calendar, and more in one place.",
    icon: "",
    connected: false,
  },
] as const;

export function OverviewConnectSection() {
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [whatsappLinked, setWhatsappLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const profileEmail = useMemo(() => getUserProfile().email, []);

  useEffect(() => {
    if (!isAuthenticated || !profileEmail) {
      setTelegramLinked(false);
      setTelegramUsername(null);
      setWhatsappNumber(null);
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
        }
      } catch {
        if (active) {
          setTelegramLinked(false);
          setWhatsappLinked(false);
          setTelegramUsername(null);
          setWhatsappNumber(null);
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

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {connectItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-2xl" aria-hidden>
                {item.icon}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  (item.id === "telegram"
                    ? telegramLinked
                    : item.id === "whatsapp"
                      ? whatsappLinked
                      : item.connected)
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {(item.id === "telegram"
                  ? telegramLinked
                  : item.id === "whatsapp"
                    ? whatsappLinked
                    : item.connected) ? "Connected" : "Not connected"}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {item.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
            <div className="mt-4">
              {item.id === "telegram" || item.id === "whatsapp" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (item.id === "telegram") {
                      setTelegramModalOpen(true);
                      return;
                    }
                    setWhatsappModalOpen(true);
                  }}
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {(item.id === "telegram"
                    ? telegramLinked
                    : whatsappLinked) ? "Manage" : "Connect"}
                </button>
              ) : (
                <Link
                  href="/integrations"
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {item.connected ? "Manage" : "Connect"}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
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
    </>
  );
}
