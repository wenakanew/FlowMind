import * as notionSdk from "@/lib/notion";

export type NotionProviderMode = "sdk" | "mcp";

interface ProviderOperationMetric {
  attempts: number;
  successes: number;
  failures: number;
  blocked: number;
  fallbackToSdk: number;
  lastError?: string;
  lastRunAt?: string;
}

type ProviderMetricsMap = Record<string, ProviderOperationMetric>;

const NOTION_PROVIDER_ENV = (process.env.NOTION_PROVIDER || "sdk").trim().toLowerCase();
const ACTIVE_PROVIDER: NotionProviderMode = NOTION_PROVIDER_ENV === "mcp" ? "mcp" : "sdk";
const MCP_SDK_FALLBACK_ALLOWED =
  (process.env.NOTION_PROVIDER_ALLOW_SDK_FALLBACK || "true").trim().toLowerCase() !== "false";
const PROVIDER_VERBOSE_LOGGING =
  (process.env.NOTION_PROVIDER_VERBOSE_LOGGING || "false").trim().toLowerCase() === "true";

let hasLoggedProviderMode = false;
const providerMetrics: ProviderMetricsMap = {};

function ensureMetric(operation: string) {
  if (!providerMetrics[operation]) {
    providerMetrics[operation] = {
      attempts: 0,
      successes: 0,
      failures: 0,
      blocked: 0,
      fallbackToSdk: 0,
    };
  }

  return providerMetrics[operation];
}

function logProviderEvent(operation: string, event: string, details?: string) {
  if (!PROVIDER_VERBOSE_LOGGING) return;
  const extra = details ? ` ${details}` : "";
  console.info(`[NotionProvider] ${operation}: ${event}.${extra}`);
}

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
  const metric = ensureMetric(operation);
  metric.attempts += 1;
  metric.lastRunAt = new Date().toISOString();

  // MCP adapter implementation is the next migration step.
  // For now, when mcp is selected we either fallback to SDK (default) or fail fast.
  if (ACTIVE_PROVIDER === "mcp" && !MCP_SDK_FALLBACK_ALLOWED) {
    metric.blocked += 1;
    metric.failures += 1;
    throw new Error(
      `[NotionProvider] Operation '${operation}' blocked: NOTION_PROVIDER=mcp but MCP adapter is not wired yet and SDK fallback is disabled.`,
    );
  }

  if (ACTIVE_PROVIDER === "mcp") {
    metric.fallbackToSdk += 1;
    logProviderEvent(operation, "mcp-selected-fallback-to-sdk");
  } else {
    logProviderEvent(operation, "sdk-selected");
  }

  try {
    const result = await sdkCall();
    metric.successes += 1;
    metric.lastError = undefined;
    return result;
  } catch (error) {
    metric.failures += 1;
    metric.lastError = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

export function getNotionProviderInfo() {
  return {
    activeProvider: ACTIVE_PROVIDER,
    mcpMigrationMode: ACTIVE_PROVIDER === "mcp",
    sdkFallbackAllowed: MCP_SDK_FALLBACK_ALLOWED,
    verboseLogging: PROVIDER_VERBOSE_LOGGING,
  };
}

export function getNotionProviderMetrics() {
  return JSON.parse(JSON.stringify(providerMetrics)) as ProviderMetricsMap;
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
