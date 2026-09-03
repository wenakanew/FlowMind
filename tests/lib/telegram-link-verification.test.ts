import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPendingTelegramLink,
  consumePendingTelegramLink,
} from '@/lib/telegram-link-verification';

const mockCreate = vi.fn();
const mockQuery = vi.fn();
const mockUpdate = vi.fn();
const mockDatabasesRetrieve = vi.fn();

vi.mock('@notionhq/client', () => {
  return {
    Client: class {
      pages = {
        create: mockCreate,
        update: mockUpdate,
      };
      databases = {
        retrieve: mockDatabasesRetrieve,
        query: mockQuery,
      };
    },
  };
});

describe('telegram-link-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOTION_API_KEY = 'test-notion-key';
    process.env.NOTION_PENDING_TELEGRAM_LINKS_DB_ID = 'test-db-id-123456789012345678901234';
  });

  describe('createPendingTelegramLink', () => {
    it('creates a pending link record using preferred six-digit code', async () => {
      mockDatabasesRetrieve.mockResolvedValueOnce({
        id: 'test-db-id',
        properties: {
          Token: { type: 'title' },
          Email: { type: 'email' },
          Name: { type: 'rich_text' },
          'Created At': { type: 'number' },
          'Expires At': { type: 'number' },
        },
      });
      mockCreate.mockResolvedValueOnce({ id: 'created-page-id' });

      const token = await createPendingTelegramLink({
        email: 'user@example.com',
        name: 'Test User',
        preferredCode: '123456',
      });

      expect(token).toBe('123456');
      expect(mockCreate).toHaveBeenCalled();
      const createArgs = mockCreate.mock.calls[0][0];
      expect(createArgs.properties.Token.title[0].text.content).toBe('123456');
      expect(createArgs.properties.Email.email).toBe('user@example.com');
    });

    it('generates a random token when preferred code is not a 6-digit number', async () => {
      mockDatabasesRetrieve.mockResolvedValueOnce({
        id: 'test-db-id',
        properties: {
          Token: { type: 'title' },
          Email: { type: 'email' },
        },
      });
      mockCreate.mockResolvedValueOnce({ id: 'created-page-id' });

      const token = await createPendingTelegramLink({
        email: 'user@example.com',
        name: 'Test User',
      });

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(10);
    });
  });

  describe('consumePendingTelegramLink', () => {
    it('returns payload and archives page for valid non-expired token', async () => {
      const now = Date.now();
      const expiresAt = now + 1000 * 60 * 10;

      mockDatabasesRetrieve.mockResolvedValueOnce({
        id: 'test-db-id',
        properties: {
          Token: { type: 'title' },
          Email: { type: 'email' },
          Name: { type: 'rich_text' },
          'Expires At': { type: 'number' },
        },
      });

      mockQuery.mockResolvedValueOnce({
        results: [
          {
            id: 'page-123',
            properties: {
              Token: { type: 'title', title: [{ plain_text: '654321' }] },
              Email: { type: 'email', email: 'verified@example.com' },
              Name: { type: 'rich_text', rich_text: [{ plain_text: 'Verified User' }] },
              'Expires At': { type: 'number', number: expiresAt },
            },
          },
        ],
      });

      mockUpdate.mockResolvedValueOnce({ id: 'page-123', archived: true });

      const payload = await consumePendingTelegramLink('654321');

      expect(payload).not.toBeNull();
      expect(payload?.email).toBe('verified@example.com');
      expect(payload?.name).toBe('Verified User');
      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'page-123',
        archived: true,
      });
    });

    it('returns null and archives page if token is expired', async () => {
      const pastTime = Date.now() - 1000 * 60 * 5;

      mockDatabasesRetrieve.mockResolvedValueOnce({
        id: 'test-db-id',
        properties: {
          Token: { type: 'title' },
          Email: { type: 'email' },
          'Expires At': { type: 'number' },
        },
      });

      mockQuery.mockResolvedValueOnce({
        results: [
          {
            id: 'page-expired',
            properties: {
              Token: { type: 'title', title: [{ plain_text: '999999' }] },
              Email: { type: 'email', email: 'expired@example.com' },
              'Expires At': { type: 'number', number: pastTime },
            },
          },
        ],
      });

      const payload = await consumePendingTelegramLink('999999');

      expect(payload).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        page_id: 'page-expired',
        archived: true,
      });
    });

    it('returns null when token is not found', async () => {
      mockDatabasesRetrieve.mockResolvedValueOnce({ id: 'test-db-id', properties: {} });
      mockQuery.mockResolvedValueOnce({ results: [] });

      const payload = await consumePendingTelegramLink('000000');
      expect(payload).toBeNull();
    });
  });
});
