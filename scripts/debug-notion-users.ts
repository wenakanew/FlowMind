import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config({ path: [".env.local", ".env"] });

interface DatabaseRetrieveResult {
  properties?: Record<string, unknown>;
  data_sources?: Array<{ id: string }>;
}

interface DataSourceQueryResult {
  results: Array<{ id: string; properties?: Record<string, unknown> }>;
}

interface LooseNotionProperty {
  type?: string;
  email?: string;
  rich_text?: Array<{ plain_text?: string }>;
  title?: Array<{ plain_text?: string }>;
}

function normalizeDatabaseId(rawId: string): string {
  const cleaned = rawId.replace(/-/g, "");
  return cleaned.length === 32
    ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
    : rawId;
}

async function main() {
  const token = process.env.NOTION_API_KEY;
  const usersDb = process.env.NOTION_USERS_DATABASE_ID;

  if (!token || !usersDb) {
    throw new Error("NOTION_API_KEY or NOTION_USERS_DATABASE_ID missing");
  }

  const notion = new Client({ auth: token });
  const databaseId = normalizeDatabaseId(usersDb);

  const db = (await notion.databases.retrieve({ database_id: databaseId })) as unknown as DatabaseRetrieveResult;
  console.log("DB properties:", Object.keys(db.properties || {}));

  const dsId: string | undefined = db.data_sources?.[0]?.id;
  console.log("Data source id:", dsId);
  if (!dsId) return;

  const notionWithDataSources = notion as unknown as {
    dataSources: {
      query: (args: { data_source_id: string; page_size: number }) => Promise<DataSourceQueryResult>;
    };
  };

  const response = await notionWithDataSources.dataSources.query({
    data_source_id: dsId,
    page_size: 10,
  });

  console.log("Rows:", response.results.length);
  for (const page of response.results) {
    const props = (page.properties || {}) as Record<string, LooseNotionProperty>;
    const titleKey = Object.keys(props).find((k) => props[k]?.type === "title") || "Name";
    const name = props?.[titleKey]?.title?.[0]?.plain_text;

    const emailKey = Object.keys(props).find((k) => k.toLowerCase() === "email");
    const emailProp = emailKey ? props[emailKey] : undefined;
    const email =
      emailProp?.email ||
      emailProp?.rich_text?.[0]?.plain_text ||
      emailProp?.title?.[0]?.plain_text;

    console.log({
      id: page.id,
      name,
      emailKey,
      emailType: emailProp?.type,
      email,
      keys: Object.keys(props),
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
