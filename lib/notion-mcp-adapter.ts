import type { NotionTask, NotionUser } from "@/lib/types/notion";

interface McpJsonRpcSuccess<T> {
  jsonrpc?: string;
  id?: string | number;
  result?: T;
}

interface McpJsonRpcError {
  jsonrpc?: string;
  id?: string | number;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

type McpJsonRpcResponse<T> = McpJsonRpcSuccess<T> & McpJsonRpcError;

type McpCallOutput = {
  content?: Array<{ type?: string; text?: string }>;
  data?: unknown;
};

const MCP_ENDPOINT = (process.env.NOTION_MCP_ENDPOINT || "").trim();
const MCP_AUTH_TOKEN = (process.env.NOTION_MCP_AUTH_TOKEN || "").trim();
const MCP_TOOL_PREFIX = (process.env.NOTION_MCP_TOOL_PREFIX || "notion").trim();

function buildToolName(operation: string) {
  return `${MCP_TOOL_PREFIX}.${operation}`;
}

function parseMcpResult<T>(payload: McpCallOutput | undefined): T {
  if (!payload) {
    throw new Error("MCP call returned no result payload.");
  }

  if (typeof payload.data !== "undefined") {
    return payload.data as T;
  }

  const firstText = payload.content?.find((item) => item.type === "text" && item.text)?.text;
  if (!firstText) {
    throw new Error("MCP call returned no usable content.");
  }

  try {
    return JSON.parse(firstText) as T;
  } catch {
    throw new Error("MCP response text is not valid JSON.");
  }
}

async function callNotionMcpTool<T>(operation: string, args: Record<string, unknown>): Promise<T> {
  if (!MCP_ENDPOINT) {
    throw new Error("NOTION_MCP_ENDPOINT is not configured.");
  }

  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(MCP_AUTH_TOKEN ? { Authorization: `Bearer ${MCP_AUTH_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${operation}-${Date.now()}`,
      method: "tools/call",
      params: {
        name: buildToolName(operation),
        arguments: args,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MCP endpoint returned HTTP ${response.status}.`);
  }

  const json = (await response.json()) as McpJsonRpcResponse<McpCallOutput>;
  if (json.error) {
    const message = json.error.message || "Unknown MCP error";
    throw new Error(`MCP tool error (${operation}): ${message}`);
  }

  return parseMcpResult<T>(json.result);
}

export function isNotionMcpConfigured() {
  return Boolean(MCP_ENDPOINT);
}

export async function mcpCreateTask(input: {
  title: string;
  status?: string;
  owner?: string;
  deadline?: string;
}): Promise<NotionTask> {
  return callNotionMcpTool<NotionTask>("createTask", input);
}

export async function mcpUpdateTaskStatus(input: { taskId: string; status: string }): Promise<NotionTask | null> {
  return callNotionMcpTool<NotionTask | null>("updateTaskStatus", input);
}

export async function mcpGetUserByEmail(input: { email: string }): Promise<NotionUser | null> {
  return callNotionMcpTool<NotionUser | null>("getUserByEmail", input);
}

export async function mcpUpsertUser(input: {
  name: string;
  email: string;
  avatarUrl?: string;
  telegramUsername?: string;
  telegramChatId?: string;
  whatsappNumber?: string;
  role?: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  githubAccessToken?: string;
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
}): Promise<NotionUser> {
  return callNotionMcpTool<NotionUser>("upsertUser", input);
}
