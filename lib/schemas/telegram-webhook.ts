import { z } from 'zod';

export const telegramWebhookSchema = z.object({
  message: z.object({
    text: z.string(),
    chat: z.object({
      id: z.number(),
    }),
    from: z
      .object({
        username: z.string().optional(),
        id: z.number().optional(),
      })
      .optional(),
  }).optional(),
});

export type TelegramWebhookPayload = z.infer<typeof telegramWebhookSchema>;
