import * as dotenv from 'dotenv';
dotenv.config();
import { runAgent } from '../lib/ai';

async function main() {
    console.log("Testing AI Engine (Gemini) Tool Calling...\n");
    console.log("Prompt: 'What are my tasks?'");

    try {
        const reply = await runAgent("What are my tasks?");
        console.log("\n=========================");
        console.log("FINAL AI RESPONSE:");
        console.log("=========================\n");
        console.log(reply);
    } catch (err) {
        console.error("Agent failed:", err);
    }
}

main();
