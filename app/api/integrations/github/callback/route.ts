import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, upsertUser } from "@/lib/notion-provider";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const dynamic = "force-dynamic";

async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state parameter" },
      { status: 400 }
    );
  }

  let stateData: { email: string; timestamp: number };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/github/callback`;

  if (!clientId || !clientSecret || !redirectUri || clientId.startsWith("placeholder_")) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured. Configure in production." },
      { status: 500 }
    );
  }

  try {
    const tokens = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri!);
    
    if (tokens.error) {
      return NextResponse.json({ error: tokens.error }, { status: 400 });
    }

    const existingUser = await getUserByEmail(stateData.email);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await upsertUser({
      name: existingUser.name,
      email: existingUser.email || stateData.email,
      githubAccessToken: tokens.access_token,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/integrations?github_connected=true`,
      { status: 302 }
    );
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 }
    );
  }
}
