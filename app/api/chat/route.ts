import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/ai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required." }, { status: 400 });
        }

        const reply = await runAgent(message);

        return NextResponse.json({ reply });
    } catch (error: any) {
        console.error("Agent Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
    }
}
