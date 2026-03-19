import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, upsertUser } from "@/lib/notion-provider";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const dynamic = "force-dynamic";

async function exchangeCodeForTokens(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.statusText}`);
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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

    const existingUser = await getUserByEmail(stateData.email);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await upsertUser({
      name: existingUser.name,
      email: existingUser.email || stateData.email,
      gmailAccessToken: tokens.access_token,
      gmailRefreshToken: tokens.refresh_token || existingUser.gmailRefreshToken || "",
      googleCalendarAccessToken: tokens.access_token,
      googleCalendarRefreshToken: tokens.refresh_token || existingUser.googleCalendarRefreshToken || "",
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/integrations?google_connected=true`,
      { status: 302 }
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 }
    );
  }
}
