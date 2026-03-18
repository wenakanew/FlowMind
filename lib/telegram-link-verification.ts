import { Client } from "@notionhq/client";

interface PendingTelegramLink {
  email: string;
  name: string;
  avatarUrl?: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

const TTL_MS = 1000 * 60 * 30; // 30 minutes

function getNotionClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not set");
  }
  return new Client({ auth: apiKey });
}

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
}): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const now = Date.now();
  const expiresAt = now + TTL_MS;

  try {
    const notion = getNotionClient();
    const dbId = getPendingLinksDbId();

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        "Token": {
          title: [{ text: { content: token } }],
        },
        "Email": {
          email: input.email,
        },
        "Name": {
          rich_text: [{ text: { content: input.name } }],
        },
        "Avatar URL": {
          url: input.avatarUrl || null,
        },
        "Created At": {
          number: now,
        },
        "Expires At": {
          number: expiresAt,
        },
      },
    });

    return token;
  } catch (error) {
    console.error("Failed to create pending Telegram link in Notion:", error);
    throw error;
  }
}

export async function consumePendingTelegramLink(token: string): Promise<PendingTelegramLink | null> {
  try {
    const notion = getNotionClient();
    const dbId = getPendingLinksDbId();
    const now = Date.now();

    // Query for token
    const response = await notion.databases.query({
      database_id: dbId,
      filter: {
        property: "Token",
        title: {
          equals: token,
        },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0];
    const props = page.properties as Record<string, any>;

    // Check if expired
    const expiresAt = props["Expires At"]?.number;
    if (!expiresAt || now > expiresAt) {
      // Delete expired token
      try {
        await notion.pages.update({
          page_id: page.id,
          archived: true,
        });
      } catch (e) {
        console.warn("Failed to archive expired pending link:", e);
      }
      return null;
    }

    // Extract payload
    const payload: PendingTelegramLink = {
      email: props["Email"]?.email || "",
      name: props["Name"]?.rich_text?.[0]?.plain_text || "",
      avatarUrl: props["Avatar URL"]?.url || undefined,
      token: props["Token"]?.title?.[0]?.plain_text || token,
      createdAt: props["Created At"]?.number || now,
      expiresAt,
    };

    // Delete the consumed token (archive it)
    await notion.pages.update({
      page_id: page.id,
      archived: true,
    });

    return payload;
  } catch (error) {
    console.error("Failed to consume pending Telegram link from Notion:", error);
    return null;
  }
}
