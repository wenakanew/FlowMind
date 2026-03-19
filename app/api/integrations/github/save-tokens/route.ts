import { NextRequest, NextResponse } from "next/server";
import { upsertUser, getUserByEmail } from "@/lib/notion-provider";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, email } = await req.json();

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
      githubAccessToken: accessToken,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing GitHub token:", error);
    return NextResponse.json(
      { error: "Failed to store token" },
      { status: 500 }
    );
  }
}
