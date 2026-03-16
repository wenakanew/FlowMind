import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = ai.chats.create({ model: 'gemini-2.5-flash' });

    console.log("Testing ContentUnion wrapper with role='user'...");
    try {
        const r4 = await chat.sendMessage({
            role: "user",
            parts: [{ functionResponse: { name: "test", response: { ok: true } } }]
        } as any);
        console.log("User Role OK:", r4.text);
    } catch (e: any) { console.error("User ERROR:", e.message); }

    console.log("\nTesting ContentUnion wrapper with role='function'...");
    try {
        const r5 = await chat.sendMessage({
            role: "function",
            parts: [{ functionResponse: { name: "test", response: { ok: true } } }]
        } as any);
        console.log("Function Role OK:", r5.text);
    } catch (e: any) { console.error("Function ERROR:", e.message); }

    console.log("\nTesting ContentUnion wrapper with role='tool'...");
    try {
        const r6 = await chat.sendMessage({
            role: "tool",
            parts: [{ functionResponse: { name: "test", response: { ok: true } } }]
        } as any);
        console.log("Tool Role OK:", r6.text);
    } catch (e: any) { console.error("Tool ERROR:", e.message); }
}

main();
