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

function normalizeDatabaseId(rawId: string): string {
  const cleaned = rawId.replace(/-/g, "");
  return cleaned.length === 32
    ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
    : rawId;
}

async function getPendingLinksDataSourceId(notion: Client, rawDbId: string) {
  const databaseId = normalizeDatabaseId(rawDbId);
  const db: any = await (notion as any).databases.retrieve({
    database_id: databaseId,
  });

  const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error("No data source found for NOTION_PENDING_TELEGRAM_LINKS_DB_ID.");
  }

  return { databaseId, dataSourceId };
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
    const { databaseId } = await getPendingLinksDataSourceId(notion, dbId);

    await notion.pages.create({
      parent: { database_id: databaseId },
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
    const { dataSourceId } = await getPendingLinksDataSourceId(notion, dbId);
    const now = Date.now();

    // Query via Data Sources API (compatible with current Notion SDK)
    const response: any = await (notion as any).dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
    });

    const page = (response?.results || []).find((item: any) => {
      const value = item?.properties?.["Token"]?.title?.[0]?.plain_text;
      return value === token;
    });

    if (!page) {
      return null;
    }

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
