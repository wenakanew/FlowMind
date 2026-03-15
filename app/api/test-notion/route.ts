import { NextResponse } from 'next/server';
import { getTasks } from '@/lib/notion';

export async function GET() {
    try {
        const tasks = await getTasks();
        return NextResponse.json({
            success: true,
            count: tasks.length,
            tasks,
        });
    } catch (error: any) {
        console.error('Notion Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
}
