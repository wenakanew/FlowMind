export interface SyncedNotionUser {
  id: string;
  name: string;
  email?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
  role?: string;
  avatarUrl?: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  githubAccessToken?: string;
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
}

export async function fetchSyncedUser(email: string) {
  const response = await fetch(`/api/users/me?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load user record.");
  }

  const data = (await response.json()) as { ok: boolean; user: SyncedNotionUser | null };
  return data.user;
}
