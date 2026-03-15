"use client";

import { useEffect, useState } from "react";
import {
  getSettings,
  setSettings,
  type AppSettings,
} from "@/lib/preferences";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettingsState(getSettings());
  }, []);

  const handleSystemChange = (
    key: keyof AppSettings["system"],
    value: string
  ) => {
    const next = setSettings({
      system: { ...settings.system, [key]: value },
    });
    setSettingsState(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            System settings
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Language, timezone, and other system options.
          </p>
        </div>
        {saved && (
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Saved
          </span>
        )}
      </div>

      {/* System */}
      <Section
        title="Regional & language"
        description="Used for timestamps, reports, and locale-specific formatting."
      >
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Language
            </label>
            <select
              value={settings.system.language}
              onChange={(e) => handleSystemChange("language", e.target.value)}
              aria-label="Language"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Timezone
            </label>
            <select
              value={settings.system.timezone}
              onChange={(e) => handleSystemChange("timezone", e.target.value)}
              aria-label="Timezone"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern (US)</option>
              <option value="America/Los_Angeles">Pacific (US)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        title="Danger zone"
        description="Export data or sign out. These actions cannot be undone."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Export my data
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Sign out
          </button>
        </div>
      </Section>
    </div>
  );
}
