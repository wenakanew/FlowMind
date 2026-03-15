/**
 * User-facing integrations only. The system has its own Telegram bot and WhatsApp number;
 * users link their Telegram username or WhatsApp number and get a confirmation on that platform.
 * Gmail, GitHub, and Cal.com are the user's own accounts.
 */

export interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  /** For messaging: "link" (user links identity). For tools: "connect" (user connects account). */
  action: "link" | "connect";
}

export const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "telegram",
    name: "Telegram",
    description:
      "Link your Telegram username. The system will send a confirmation message to your Telegram; after you confirm, you can chat with the FlowMind bot and run flows.",
    action: "link",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description:
      "Link your WhatsApp number. The system will send a confirmation to your WhatsApp; after you confirm, you can continue chatting and receive flow updates.",
    action: "link",
  },
  {
    id: "gmail",
    name: "Gmail / Google",
    description: "Connect your Gmail or Google account to send mail and use Google services from flows.",
    action: "connect",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Connect your GitHub account for repos, PRs, and dev workflows in flows.",
    action: "connect",
  },
  {
    id: "calcom",
    name: "Cal.com",
    description: "Connect your Cal.com for scheduling and managing meetings from flows.",
    action: "connect",
  },
];
