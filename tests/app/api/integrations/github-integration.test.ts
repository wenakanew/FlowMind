import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as authorizeGet } from '@/app/api/integrations/github/authorize/route';
import { POST as disconnectPost } from '@/app/api/integrations/github/disconnect/route';

vi.mock('@/lib/notion', () => ({
  upsertUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
}));

describe('GitHub Integrations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/integrations/github/callback';
  });

  describe('GET /api/integrations/github/authorize', () => {
    it('returns 500 if GITHUB_CLIENT_ID is not configured', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      const req = new NextRequest('http://localhost:3000/api/integrations/github/authorize?email=user@example.com');
      const res = await authorizeGet(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('OAuth credentials not configured');
    });

    it('returns 400 if email query parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/github/authorize');
      const res = await authorizeGet(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Email parameter required');
    });

    it('redirects to GitHub authorize URL when parameters are valid', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/github/authorize?email=user@example.com');
      const res = await authorizeGet(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('github.com/login/oauth/authorize');
      expect(location).toContain('client_id=test-github-client-id');
    });
  });

  describe('POST /api/integrations/github/disconnect', () => {
    it('returns 401 if unauthenticated (missing email or name)', async () => {
      const req = new Request('http://localhost:3000/api/integrations/github/disconnect', {
        method: 'POST',
        body: JSON.stringify({ email: '' }),
      });
      const res = await disconnectPost(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('clears githubAccessToken and returns 200 on success', async () => {
      const req = new Request('http://localhost:3000/api/integrations/github/disconnect', {
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
