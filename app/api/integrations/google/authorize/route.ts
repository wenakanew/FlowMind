import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const dynamic = "force-dynamic";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar",
];

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth credentials not configured" },
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
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    prompt: "consent",
    access_type: "offline",
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
