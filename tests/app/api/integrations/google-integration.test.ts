import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as authorizeGet } from '@/app/api/integrations/google/authorize/route';
import { POST as disconnectPost } from '@/app/api/integrations/google/disconnect/route';

vi.mock('@/lib/notion', () => ({
  upsertUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
}));

describe('Google Integrations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/integrations/google/callback';
  });

  describe('GET /api/integrations/google/authorize', () => {
    it('returns 500 if GOOGLE_CLIENT_ID is not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const req = new NextRequest('http://localhost:3000/api/integrations/google/authorize?email=user@example.com');
      const res = await authorizeGet(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('OAuth credentials not configured');
    });

    it('returns 400 if email query parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/google/authorize');
      const res = await authorizeGet(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Email parameter required');
    });

    it('redirects to Google authorize URL when parameters are valid', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/google/authorize?email=user@example.com');
      const res = await authorizeGet(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=test-google-client-id');
    });
  });

  describe('POST /api/integrations/google/disconnect', () => {
    it('returns 401 if unauthenticated (missing email or name)', async () => {
      const req = new Request('http://localhost:3000/api/integrations/google/disconnect', {
        method: 'POST',
        body: JSON.stringify({ email: '' }),
      });
      const res = await disconnectPost(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('clears Google tokens and returns 200 on success', async () => {
      const req = new Request('http://localhost:3000/api/integrations/google/disconnect', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', name: 'Test User' }),
      });
      const res = await disconnectPost(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
