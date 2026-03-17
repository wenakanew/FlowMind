import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/notion";

interface DisconnectBody {
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DisconnectBody;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await upsertUser({
      name,
      email,
      avatarUrl: body.avatarUrl?.trim() || undefined,
      githubAccessToken: "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting GitHub:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
