import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const token = process.env.NOTION_API_KEY;
    const id = '7da4738ad6f74fec8b79c62d8a3f6359';

    console.log('Fetching blocks for:', id);
    const res = await fetch(`https://api.notion.com/v1/blocks/${id}/children`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28'
        }
    });

    const data = await res.json();
    if (data.object === 'error') {
        console.error('Error fetching blocks:', data);

        // Also check if it's hitting a database instead
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28'
            }
        });
        const dbData = await dbRes.json();
        console.error('Database fetch result:', dbData);
        return;
    }

    console.log('Successfully fetched children!');
    let dbFound = false;
    for (const block of data.results) {
        if (block.type === 'child_database') {
            console.log(`\n🎉 FOUND INLINE DATABASE!`);
            console.log(`Title: ${block.child_database.title}`);
            console.log(`Database ID: ${block.id}`);
            dbFound = true;
        }
    }

    if (!dbFound) {
        console.log('\nNo inline databases found in this page.');
        console.log('First 3 blocks:', data.results.slice(0, 3).map((b: any) => b.type));
    }
}

main();
