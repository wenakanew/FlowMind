import { NextRequest, NextResponse } from "next/server";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/github/callback`;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "GitHub OAuth credentials not configured" },
      { status: 500 }
    );
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required" },
      { status: 400 }
    );
  }

  // Store email in state for callback validation
  const state = Buffer.from(JSON.stringify({ email, timestamp: Date.now() })).toString("base64");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "repo,user,workflow",
    allow_signup: "true",
  });

  const authUrl = `${GITHUB_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
