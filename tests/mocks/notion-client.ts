import type { NotionClientAdapter } from '@/lib/notion-client';

export function createNotionClientMock(): NotionClientAdapter {
  return {
    databases: {
      retrieve: async () => ({ properties: {}, data_sources: [{ id: 'mock-source' }] }),
    },
    dataSources: {
      retrieve: async () => ({ properties: {} }),
      query: async () => ({ results: [] }),
    },
    pages: {
      create: async () => ({}),
      update: async () => ({}),
      retrieve: async () => ({}),
    },
    blocks: {
      children: {
        list: async () => ({ results: [] }),
      },
    },
  };
}
