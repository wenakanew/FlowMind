"use client";

import { useEffect, useState } from "react";
import {
  getUserProfile,
  setUserProfile,
  getTheme,
  setTheme,
  getSettings,
  setSettings,
  type Theme,
  type UserProfile as UserProfileType,
  type AppSettings,
} from "@/lib/preferences";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <div className="relative mt-0.5 flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-zinc-200 transition peer-checked:bg-emerald-500 dark:bg-zinc-700 dark:peer-checked:bg-emerald-600" />
        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:left-6 peer-checked:translate-x-0" />
      </div>
      <div>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
    </label>
  );
}

export default function ProfilePage() {
  const [profile, setProfileState] = useState<UserProfileType>(getUserProfile());
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfileState(getUserProfile());
    setThemeState(getTheme());
    setSettingsState(getSettings());
  }, []);

  const handleProfileChange = (updates: Partial<UserProfileType>) => {
    const next = setUserProfile(updates);
    setProfileState(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNotificationsChange = (
    key: keyof AppSettings["notifications"],
    value: boolean
  ) => {
    const next = setSettings({
      notifications: { ...settings.notifications, [key]: value },
    });
    setSettingsState(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = getInitials(profile.displayName);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Profile
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Your account details and preferences.
          </p>
        </div>
        {saved && (
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Saved
          </span>
        )}
      </div>

      {/* Profile card with avatar */}
      <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500/10 to-zinc-100 p-6 dark:from-emerald-500/20 dark:to-zinc-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-white shadow-lg ring-4 ring-white/50 dark:ring-zinc-900/50">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {profile.displayName}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {profile.email}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-200 p-6 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Account details
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Update your display name and email. These appear in the header and across the dashboard.
          </p>
          <div className="mt-4 flex max-w-md flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Display name
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) =>
                  handleProfileChange({ displayName: e.target.value })
                }
                onBlur={(e) =>
                  setUserProfile({
                    displayName: e.target.value.trim() || "FlowMind User",
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange({ email: e.target.value })}
                onBlur={(e) =>
                  setUserProfile({
                    email: e.target.value.trim() || "you@example.com",
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <Section
        title="Appearance"
        description="Theme applies immediately across the dashboard."
      >
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleThemeChange(t)}
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition ${
                theme === t
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          System follows your device preference. Light and dark force a fixed theme.
        </p>
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        description="Choose how and when you receive updates."
      >
        <div className="flex flex-col gap-4">
          <Toggle
            label="Email notifications"
            description="Receive flow summaries and alerts by email."
            checked={settings.notifications.email}
            onChange={(v) => handleNotificationsChange("email", v)}
          />
          <Toggle
            label="Push notifications"
            description="Browser push when a flow completes or fails."
            checked={settings.notifications.push}
            onChange={(v) => handleNotificationsChange("push", v)}
          />
          <Toggle
            label="Weekly flow digest"
            description="Summary of flow runs and activity every week."
            checked={settings.notifications.flowDigest}
            onChange={(v) => handleNotificationsChange("flowDigest", v)}
          />
        </div>
      </Section>
    </div>
  );
}
