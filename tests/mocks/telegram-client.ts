import type { TelegramClientAdapter } from '@/lib/telegram-client';

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export function createTelegramClientMock(): TelegramClientAdapter {
  return {
    sendMessage: async () => okResponse(),
    sendChatAction: async () => okResponse(),
  };
}
