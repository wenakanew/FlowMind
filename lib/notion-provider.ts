import * as notionSdk from "@/lib/notion";

export type NotionProviderMode = "sdk" | "mcp";

const NOTION_PROVIDER_ENV = (process.env.NOTION_PROVIDER || "sdk").trim().toLowerCase();
const ACTIVE_PROVIDER: NotionProviderMode = NOTION_PROVIDER_ENV === "mcp" ? "mcp" : "sdk";
const MCP_SDK_FALLBACK_ALLOWED =
  (process.env.NOTION_PROVIDER_ALLOW_SDK_FALLBACK || "true").trim().toLowerCase() !== "false";

let hasLoggedProviderMode = false;

function logProviderModeOnce() {
  if (hasLoggedProviderMode) return;
  hasLoggedProviderMode = true;

  if (ACTIVE_PROVIDER === "mcp") {
    console.info(
      `[NotionProvider] ACTIVE_PROVIDER=mcp (migration mode). SDK fallback is ${MCP_SDK_FALLBACK_ALLOWED ? "ENABLED" : "DISABLED"}.`,
    );
  } else {
    console.info("[NotionProvider] ACTIVE_PROVIDER=sdk.");
  }
}

async function withNotionProvider<T>(operation: string, sdkCall: () => Promise<T>): Promise<T> {
  logProviderModeOnce();

  // MCP adapter implementation is the next migration step.
  // For now, when mcp is selected we either fallback to SDK (default) or fail fast.
  if (ACTIVE_PROVIDER === "mcp" && !MCP_SDK_FALLBACK_ALLOWED) {
    throw new Error(
      `[NotionProvider] Operation '${operation}' blocked: NOTION_PROVIDER=mcp but MCP adapter is not wired yet and SDK fallback is disabled.`,
    );
  }

  return sdkCall();
}

export function getNotionProviderInfo() {
  return {
    activeProvider: ACTIVE_PROVIDER,
    mcpMigrationMode: ACTIVE_PROVIDER === "mcp",
    sdkFallbackAllowed: MCP_SDK_FALLBACK_ALLOWED,
  };
}

export async function getTasks(...args: Parameters<typeof notionSdk.getTasks>) {
  return withNotionProvider("getTasks", () => notionSdk.getTasks(...args));
}

export async function getProjects(...args: Parameters<typeof notionSdk.getProjects>) {
  return withNotionProvider("getProjects", () => notionSdk.getProjects(...args));
}

export async function createTask(...args: Parameters<typeof notionSdk.createTask>) {
  return withNotionProvider("createTask", () => notionSdk.createTask(...args));
}

export async function updateTaskStatus(...args: Parameters<typeof notionSdk.updateTaskStatus>) {
  return withNotionProvider("updateTaskStatus", () => notionSdk.updateTaskStatus(...args));
}

export async function getUserByEmail(...args: Parameters<typeof notionSdk.getUserByEmail>) {
  return withNotionProvider("getUserByEmail", () => notionSdk.getUserByEmail(...args));
}

export async function upsertUser(...args: Parameters<typeof notionSdk.upsertUser>) {
  return withNotionProvider("upsertUser", () => notionSdk.upsertUser(...args));
}

export async function getUserByTelegramIdentifier(...args: Parameters<typeof notionSdk.getUserByTelegramIdentifier>) {
  return withNotionProvider("getUserByTelegramIdentifier", () => notionSdk.getUserByTelegramIdentifier(...args));
}

export async function getUserByWhatsAppNumber(...args: Parameters<typeof notionSdk.getUserByWhatsAppNumber>) {
  return withNotionProvider("getUserByWhatsAppNumber", () => notionSdk.getUserByWhatsAppNumber(...args));
}
