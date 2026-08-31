import { GoogleGenAI } from '@google/genai';

export interface GeminiClientAdapter {
  models: GoogleGenAI['models'];
  chats: GoogleGenAI['chats'];
}

let geminiClient: GeminiClientAdapter | null = null;

export function getGeminiClient(): GeminiClientAdapter {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) as unknown as GeminiClientAdapter;
  }
  return geminiClient;
}
