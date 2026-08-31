import type { GeminiClientAdapter } from '@/lib/gemini-client';

export function createGeminiClientMock(): GeminiClientAdapter {
  return {
    models: {
      generateContent: async () => ({ text: 'mock-response' }),
    } as unknown as GeminiClientAdapter['models'],
    chats: {} as unknown as GeminiClientAdapter['chats'],
  };
}
