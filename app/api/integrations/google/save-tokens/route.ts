import { NextRequest, NextResponse } from "next/server";
import { upsertUser, getUserByEmail } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, refreshToken, email } = await req.json();

    if (!email || !accessToken) {
      return NextResponse.json(
        { error: "Email and access token required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await upsertUser({
      name: user.name,
      email: user.email || email,
      gmailAccessToken: accessToken,
      gmailRefreshToken: refreshToken,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing Google tokens:", error);
    return NextResponse.json(
      { error: "Failed to store tokens" },
      { status: 500 }
    );
  }
}
