import { z } from 'zod';

export const whatsappWebhookSchema = z.object({
  from: z.string().min(1),
  body: z.string().min(1),
});

export type WhatsAppWebhookPayload = z.infer<typeof whatsappWebhookSchema>;
