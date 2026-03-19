import {
  isNotionMcpConfigured,
  mcpConsumePendingTelegramLink,
  mcpCreatePendingTelegramLink,
  type PendingTelegramLink,
} from "@/lib/notion-mcp-adapter";

export type { PendingTelegramLink };

function getPendingLinksDbId() {
  const dbId = process.env.NOTION_PENDING_TELEGRAM_LINKS_DB_ID;
  if (!dbId) {
    throw new Error("NOTION_PENDING_TELEGRAM_LINKS_DB_ID is not set. Create a database for pending Telegram links.");
  }
  return dbId;
}

export async function createPendingTelegramLink(input: {
  email: string;
  name: string;
  avatarUrl?: string;
  preferredCode?: string;
}): Promise<string> {
  const dbId = getPendingLinksDbId();

  if (!isNotionMcpConfigured()) {
    throw new Error(
      `Notion MCP is required for pending Telegram links but NOTION_MCP_ENDPOINT is not configured. Database ID: ${dbId}`,
    );
  }

  try {
    return await mcpCreatePendingTelegramLink(input);
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const isNotionAccessError =
      errorMessage.includes("object_not_found") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("restricted_resource");

    if (isNotionAccessError) {
      console.error(
        "Notion Database Access Error: The FlowMind integration does not have access to the Pending Telegram Links database. " +
        "ACTION REQUIRED: In Notion, open the 'Pending Telegram Links' database, click 'Share', search for 'FlowMind' integration, and grant access. " +
          "Database ID: " +
          dbId,
        { errorMessage, input: { email: input.email, name: input.name } },
      );
    } else {
      console.error("Failed to create pending Telegram link via MCP:", {
        errorMessage,
        input: { email: input.email, name: input.name },
      });
    }
    throw error;
  }
}

export async function consumePendingTelegramLink(token: string): Promise<PendingTelegramLink | null> {
  const dbId = getPendingLinksDbId();

  if (!isNotionMcpConfigured()) {
    throw new Error(
      `Notion MCP is required for pending Telegram links but NOTION_MCP_ENDPOINT is not configured. Database ID: ${dbId}`,
    );
  }

  try {
    return await mcpConsumePendingTelegramLink({ token });
  } catch (error: any) {
    const message = error?.message || String(error);
    const isNotionAccessError =
      message.includes("object_not_found") ||
      message.includes("unauthorized") ||
      message.includes("restricted_resource");

    if (isNotionAccessError) {
      console.error(
        "Notion Database Access Error: The FlowMind integration may not have access to the Pending Telegram Links database. " +
        "Please ensure the database is shared with the FlowMind integration in Notion. " +
          "Database ID: " +
          dbId,
        error,
      );
    } else {
      console.error("Failed to consume pending Telegram link via MCP:", error);
    }

    return null;
  }
}
