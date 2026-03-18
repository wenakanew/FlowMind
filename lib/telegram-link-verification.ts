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

type NotionProps = Record<string, any>;

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
  const notionAny = notion as any;
  const normalizedId = normalizeDatabaseId(rawDbId);

  // Allow users to provide either a Data Source ID or a Database ID.
  try {
    if (notionAny.dataSources?.retrieve) {
      const dataSource = await notionAny.dataSources.retrieve({
        data_source_id: normalizedId,
      });

      if (dataSource?.id) {
        const parentDatabaseId = dataSource?.parent?.database_id
          ? normalizeDatabaseId(dataSource.parent.database_id)
          : undefined;
        const properties: NotionProps = dataSource?.properties || {};

        return {
          databaseId: parentDatabaseId,
          dataSourceId: dataSource.id as string,
          parent: { data_source_id: dataSource.id as string },
          properties,
        };
      }
    }
  } catch {
    // Fall through and try as database id.
  }

  const db: any = await notionAny.databases.retrieve({
    database_id: normalizedId,
  });

  const databaseId = normalizeDatabaseId(db?.id || normalizedId);
  const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
  let properties: NotionProps = db?.properties || {};

  if ((!properties || Object.keys(properties).length === 0) && dataSourceId && notionAny.dataSources?.retrieve) {
    try {
      const ds: any = await notionAny.dataSources.retrieve({ data_source_id: dataSourceId });
      properties = ds?.properties || properties;
    } catch {
      // ignore
    }
  }

  return {
    databaseId,
    dataSourceId: dataSourceId || null,
    parent: dataSourceId
      ? { data_source_id: dataSourceId }
      : { database_id: databaseId },
    properties,
  };
}

function findPropertyByType(properties: NotionProps, type: string) {
  return Object.keys(properties).find((key) => properties[key]?.type === type) || null;
}

function findPropertyByNameAndTypes(properties: NotionProps, names: string[], allowedTypes: string[]) {
  for (const name of names) {
    const exact = Object.keys(properties).find((k) => k === name && allowedTypes.includes(properties[k]?.type));
    if (exact) return exact;

    const insensitive = Object.keys(properties).find(
      (k) => k.toLowerCase() === name.toLowerCase() && allowedTypes.includes(properties[k]?.type),
    );
    if (insensitive) return insensitive;
  }

  return null;
}

function getRichText(property: any): string {
  if (!property) return "";
  if (property.type === "title" && property.title?.length) return property.title[0].plain_text || "";
  if (property.type === "rich_text" && property.rich_text?.length) return property.rich_text[0].plain_text || "";
  if (property.type === "email" && property.email) return property.email;
  return "";
}

function findTokenInPage(item: any): string {
  const props: NotionProps = item?.properties || {};

  const namedKey = findPropertyByNameAndTypes(props, ["Token"], ["title", "rich_text"]);
  if (namedKey) {
    return getRichText(props[namedKey]).trim();
  }

  // fallback: first title property
  const titleKey = findPropertyByType(props, "title");
  if (titleKey) {
    return getRichText(props[titleKey]).trim();
  }

  return "";
}

function buildPendingLinkProperties(
  schema: NotionProps,
  input: { email: string; name: string; avatarUrl?: string },
  token: string,
  now: number,
  expiresAt: number,
): NotionProps {
  const properties: NotionProps = {};

  const titleKey = findPropertyByNameAndTypes(schema, ["Token"], ["title"]) || findPropertyByType(schema, "title");
  if (!titleKey) {
    throw new Error("Pending Telegram links database is missing a title property (recommended name: Token).");
  }

  properties[titleKey] = {
    title: [{ text: { content: token } }],
  };

  const emailKey = findPropertyByNameAndTypes(schema, ["Email"], ["email", "rich_text"]);
  if (emailKey) {
    if (schema[emailKey]?.type === "email") {
      properties[emailKey] = { email: input.email };
    } else {
      properties[emailKey] = { rich_text: [{ text: { content: input.email } }] };
    }
  }

  const nameKey = findPropertyByNameAndTypes(schema, ["Name", "User Name"], ["rich_text"]);
  if (nameKey) {
    properties[nameKey] = { rich_text: [{ text: { content: input.name } }] };
  }

  const avatarKey = findPropertyByNameAndTypes(schema, ["Avatar URL", "Avatar", "Photo URL"], ["url"]);
  if (avatarKey) {
    properties[avatarKey] = { url: input.avatarUrl || null };
  }

  const createdAtKey = findPropertyByNameAndTypes(schema, ["Created At", "Created"], ["number"]);
  if (createdAtKey) {
    properties[createdAtKey] = { number: now };
  }

  const expiresAtKey = findPropertyByNameAndTypes(schema, ["Expires At", "Expires"], ["number"]);
  if (expiresAtKey) {
    properties[expiresAtKey] = { number: expiresAt };
  }

  return properties;
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
    const { parent, properties: schema } = await getPendingLinksDataSourceId(notion, dbId);

    const properties = buildPendingLinkProperties(schema || {}, input, token, now, expiresAt);

    await notion.pages.create({
      parent: parent as any,
      properties,
    });

    return token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to create pending Telegram link in Notion:", {
      errorMessage,
      fullError: error,
      input: { email: input.email, name: input.name },
    });
    throw error;
  }
}

export async function consumePendingTelegramLink(token: string): Promise<PendingTelegramLink | null> {
  try {
    const notion = getNotionClient();
    const notionAny = notion as any;
    const dbId = getPendingLinksDbId();
    const { databaseId, dataSourceId } = await getPendingLinksDataSourceId(notion, dbId);
    const now = Date.now();

    // Query via Data Sources API when available, fallback to Databases API.
    const response: any = dataSourceId && notionAny.dataSources?.query
      ? await notionAny.dataSources.query({
          data_source_id: dataSourceId,
          page_size: 100,
        })
      : await notionAny.databases.query({
          database_id: databaseId,
          page_size: 100,
        });

    const page = (response?.results || []).find((item: any) => findTokenInPage(item) === token);

    if (!page) {
      return null;
    }

    const props = page.properties as Record<string, any>;

    // Check if expired
    const expiresKey = findPropertyByNameAndTypes(props, ["Expires At", "Expires"], ["number"]);
    const expiresAt = expiresKey ? props[expiresKey]?.number : undefined;
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
    const emailKey = findPropertyByNameAndTypes(props, ["Email"], ["email", "rich_text"]);
    const nameKey = findPropertyByNameAndTypes(props, ["Name", "User Name"], ["rich_text", "title"]);
    const avatarKey = findPropertyByNameAndTypes(props, ["Avatar URL", "Avatar", "Photo URL"], ["url"]);
    const createdAtKey = findPropertyByNameAndTypes(props, ["Created At", "Created"], ["number"]);

    const payload: PendingTelegramLink = {
      email: emailKey ? getRichText(props[emailKey]) : "",
      name: nameKey ? getRichText(props[nameKey]) : "",
      avatarUrl: avatarKey ? props[avatarKey]?.url || undefined : undefined,
      token: findTokenInPage(page) || token,
      createdAt: createdAtKey ? props[createdAtKey]?.number || now : now,
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
