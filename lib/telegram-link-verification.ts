interface PendingTelegramLink {
  email: string;
  name: string;
  requestedUsername: string;
  avatarUrl?: string;
  createdAt: number;
}

const TTL_MS = 1000 * 60 * 30; // 30 minutes
const pendingLinks = new Map<string, PendingTelegramLink>();

function pruneExpired() {
  const now = Date.now();
  for (const [token, payload] of pendingLinks) {
    if (now - payload.createdAt > TTL_MS) {
      pendingLinks.delete(token);
    }
  }
}

export function createPendingTelegramLink(input: {
  email: string;
  name: string;
  requestedUsername: string;
  avatarUrl?: string;
}) {
  pruneExpired();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  pendingLinks.set(token, {
    ...input,
    createdAt: Date.now(),
  });
  return token;
}

export function consumePendingTelegramLink(token: string) {
  pruneExpired();
  const payload = pendingLinks.get(token);
  if (!payload) {
    return null;
  }

  pendingLinks.delete(token);
  return payload;
}
