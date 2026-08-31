import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai', () => ({ runAgent: vi.fn() }));
vi.mock('@/lib/notion', () => ({ getUserByWhatsAppNumber: vi.fn() }));
vi.mock('@/lib/reminders', () => ({ dispatchDueRemindersForUser: vi.fn() }));

import { POST } from '@/app/api/webhooks/whatsapp/route';

describe('whatsapp webhook route', () => {
  it('returns 400 when payload is missing required fields', async () => {
    const req = new Request('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
