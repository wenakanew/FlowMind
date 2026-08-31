export interface TelegramClientAdapter {
  sendMessage: (token: string, chatId: number, text: string, signal?: AbortSignal) => Promise<Response>;
  sendChatAction: (token: string, chatId: number, action: string, signal?: AbortSignal) => Promise<Response>;
}

export const telegramClient: TelegramClientAdapter = {
  sendMessage(token, chatId, text, signal) {
    return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal,
    });
  },
  sendChatAction(token, chatId, action, signal) {
    return fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal,
    });
  },
};
