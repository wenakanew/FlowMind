import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config({ path: [".env.local", ".env"] });

interface DatabaseRetrieveResult {
  data_sources?: Array<{ id: string }>;
}

interface DataSourceQueryResult {
  results?: Array<{ properties?: Record<string, unknown> }>;
}

function normalizeDatabaseId(rawId: string): string {
  const cleaned = rawId.replace(/-/g, "");
  return cleaned.length === 32
    ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
    : rawId;
}

async function inspectDatabase(notion: Client, label: string, rawId?: string) {
  if (!rawId) {
    console.log(`${label}: MISSING_ID`);
    return;
  }

  const databaseId = normalizeDatabaseId(rawId);
  try {
    const db = (await notion.databases.retrieve({ database_id: databaseId })) as unknown as DatabaseRetrieveResult;
    const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;

    if (!dataSourceId) {
      console.log(`${label}: NO_DATA_SOURCE`);
      return;
    }

    const notionWithDataSources = notion as unknown as {
      dataSources: {
        query: (args: { data_source_id: string; page_size: number }) => Promise<DataSourceQueryResult>;
      };
    };

    const query = await notionWithDataSources.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 5,
    });

    const first = query.results?.[0];
    const keys = first?.properties ? Object.keys(first.properties) : [];

    console.log(`${label}: OK`);
    console.log(`  databaseId=${databaseId}`);
    console.log(`  dataSourceId=${dataSourceId}`);
    console.log(`  rowCount(sample)=${query.results?.length ?? 0}`);
    console.log(`  sampleKeys=${keys.join(", ")}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${label}: FAIL`);
    console.log(`  ${message}`);
  }
}

async function main() {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error("NOTION_API_KEY missing");
  }

  const notion = new Client({ auth: token });

  await inspectDatabase(notion, "TASKS", process.env.NOTION_TASKS_DATABASE_ID);
  await inspectDatabase(notion, "PROJECTS", process.env.NOTION_PROJECTS_DATABASE_ID);
  await inspectDatabase(notion, "KNOWLEDGE", process.env.NOTION_KNOWLEDGE_DATABASE_ID);
  await inspectDatabase(notion, "USERS", process.env.NOTION_USERS_DATABASE_ID);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
