import { describe, expect, it, vi } from 'vitest';
import { createTelegramClientMock } from '@/tests/mocks/telegram-client';

vi.mock('@/lib/ai', () => ({ runAgent: vi.fn() }));
vi.mock('@/lib/notion', () => ({
  upsertUser: vi.fn(),
  getUserByTelegramIdentifier: vi.fn(),
}));
vi.mock('@/lib/telegram-link-verification', () => ({ consumePendingTelegramLink: vi.fn() }));
vi.mock('@/lib/reminders', () => ({ dispatchDueRemindersForUser: vi.fn() }));
vi.mock('@/lib/telegram-client', () => ({ telegramClient: createTelegramClientMock() }));

import { POST } from '@/app/api/webhooks/telegram/route';

describe('telegram webhook route', () => {
  it('returns 400 for invalid webhook payload', async () => {
    const req = new Request('http://localhost/api/webhooks/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('not-an-object'),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ ok: false, error: 'Invalid Telegram webhook payload' });
  });

  it('acknowledges non-message updates', async () => {
    const req = new Request('http://localhost/api/webhooks/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: 12345 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
