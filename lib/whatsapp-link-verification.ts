interface PendingWhatsAppLink {
  email: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string;
  code: string;
  createdAt: number;
}

const TTL_MS = 1000 * 60 * 10; // 10 minutes
const pendingByEmail = new Map<string, PendingWhatsAppLink>();

function pruneExpired() {
  const now = Date.now();
  for (const [email, pending] of pendingByEmail) {
    if (now - pending.createdAt > TTL_MS) {
      pendingByEmail.delete(email);
    }
  }
}

export function createPendingWhatsAppLink(input: {
  email: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string;
}) {
  pruneExpired();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingByEmail.set(input.email.toLowerCase(), {
    ...input,
    code,
    createdAt: Date.now(),
  });
  return code;
}

export function getPendingWhatsAppLink(email: string) {
  pruneExpired();
  return pendingByEmail.get(email.toLowerCase()) || null;
}

export function consumePendingWhatsAppLink(email: string) {
  pruneExpired();
  const key = email.toLowerCase();
  const pending = pendingByEmail.get(key) || null;
  if (pending) {
    pendingByEmail.delete(key);
  }
  return pending;
}
