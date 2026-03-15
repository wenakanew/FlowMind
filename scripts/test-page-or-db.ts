import { getNotionClient } from '../lib/notion';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const id = '7da4738ad6f74fec8b79c62d8a3f6359';
    const client = getNotionClient();

    try {
        const page = await client.pages.retrieve({ page_id: id });
        console.log('SUCCESS! It is a PAGE:', page.url);

        // If it's a page, let's list its blocks to find inline databases
        const blocks = await client.blocks.children.list({ block_id: id });
        const databases = blocks.results.filter((b: any) => b.type === 'child_database');
        console.log('Child databases found:', databases.map((b: any) => ({ id: b.id, title: b.child_database.title })));
        return;
    } catch (err: any) {
        console.error('Not a page?', err.message);
    }

    try {
        const db = await client.databases.retrieve({ database_id: id });
        console.log('SUCCESS! It is a DATABASE:', db.url);
    } catch (err: any) {
        console.error('Not a database?', err.message);
    }
}

check();
