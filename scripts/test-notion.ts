import { getTasks, createTask } from '../lib/notion';
import * as dotenv from 'dotenv';

// Load environment variables from .env if running standalone
dotenv.config();

async function main() {
    console.log('Testing Notion Context Layer...\n');

    try {
        const tasks = await getTasks();
        console.log(`✅ Successfully fetched ${tasks.length} tasks from Notion:\n`);

        tasks.forEach(task => {
            console.log(`- [${task.status}] ${task.title}`);
            if (task.owner) console.log(`  Owner: ${task.owner}`);
            if (task.deadline) console.log(`  Deadline: ${task.deadline}`);
            console.log(`  URL: ${task.url}`);
        });

    } catch (error) {
        console.error('❌ Failed to interact with Notion:');
        console.error(error);
    }
}

main();
