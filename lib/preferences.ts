/**
 * User preferences and profile stored in localStorage.
 * Used by header profile, settings page, and theme.
 */

const KEYS = {
  user: "flowmind_user",
  theme: "flowmind_theme",
  settings: "flowmind_settings",
} as const;

export type Theme = "light" | "dark" | "system";

export interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface AppSettings {
  notifications: {
    email: boolean;
    push: boolean;
    flowDigest: boolean;
  };
  system: {
    language: string;
    timezone: string;
  };
}

const defaultUser: UserProfile = {
  displayName: "FlowMind User",
  email: "you@example.com",
};

const defaultSettings: AppSettings = {
  notifications: {
    email: true,
    push: false,
    flowDigest: true,
  },
  system: {
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  },
};

function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function getUserProfile(): UserProfile {
  return safeGet(KEYS.user, defaultUser);
}

export function setUserProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const next = { ...current, ...profile };
  safeSet(KEYS.user, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("flowmind:profile-updated"));
  }
  return next;
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const raw = localStorage.getItem(KEYS.theme);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "light";
}

export function setTheme(theme: Theme): void {
  safeSet(KEYS.theme, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function getSettings(): AppSettings {
  return safeGet(KEYS.settings, defaultSettings);
}

export function setSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const next = {
    notifications: { ...current.notifications, ...settings.notifications },
    system: { ...current.system, ...settings.system },
  };
  safeSet(KEYS.settings, next);
  return next;
}

export { defaultUser, defaultSettings };
