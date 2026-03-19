import { NextResponse } from "next/server";
import { getNotionProviderInfo, getNotionProviderMetrics } from "@/lib/notion-provider";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "flowmind-dashboard",
      timestamp: new Date().toISOString(),
      notionProvider: getNotionProviderInfo(),
      notionProviderMetrics: getNotionProviderMetrics(),
    },
    { status: 200 },
  );
}

