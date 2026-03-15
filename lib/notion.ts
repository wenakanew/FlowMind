import { Client } from '@notionhq/client';
import { NotionTask, NotionProject, NotionUser } from './types/notion';

// Function to get or initialize the Notion client
let _notionClient: Client | null = null;
export function getNotionClient(): Client {
    if (!_notionClient) {
        if (!process.env.NOTION_API_KEY) {
            throw new Error('NOTION_API_KEY is not set in environment variables.');
        }
        _notionClient = new Client({
            auth: process.env.NOTION_API_KEY,
        });
    }
    return _notionClient;
}

/**
 * Helper to extract title text from Notion's rich text array structure safely.
 */
function extractTitle(property: any): string {
    if (property?.type === 'title' && property.title?.length > 0) {
        return property.title[0].plain_text;
    }
    return 'Untitled';
}

/**
 * Helper to extract text from a rich text property.
 */
function extractRichText(property: any): string | undefined {
    if (property?.type === 'rich_text' && property.rich_text?.length > 0) {
        return property.rich_text[0].plain_text;
    }
    return undefined;
}

/**
 * Helper to extract status from a Notion status or select property.
 */
function extractStatus(property: any): string {
    if (property?.type === 'status' && property.status) {
        return property.status.name;
    }
    if (property?.type === 'select' && property.select) {
        return property.select.name;
    }
    return 'No Status';
}

/**
 * Helper to extract a date string from a Notion date property.
 */
function extractDate(property: any): string | undefined {
    if (property?.type === 'date' && property.date) {
        return property.date.start;
    }
    return undefined;
}

/**
 * Fetches tasks from the Notion Tasks Database.
 * Maps the raw page properties into our strongly-typed `NotionTask` interface.
 */
export async function getTasks(statusFilter?: string): Promise<NotionTask[]> {
    const rawId = process.env.NOTION_TASKS_DATABASE_ID;
    if (!rawId) {
        throw new Error('NOTION_TASKS_DATABASE_ID is not set in environment variables.');
    }

    // Normalize to dashed UUID format: 8-4-4-4-12 (Notion accepts either, but this keeps logs clearer)
    const cleaned = rawId.replace(/-/g, '');
    const databaseId =
        cleaned.length === 32
            ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
            : rawId;

    // Optional: Build a filter if statusFilter is provided
    // Note: Adjust the property name ('Status') to match exactly what is in your Notion database.
    const filter = statusFilter
        ? {
            property: 'Status',
            status: {
                equals: statusFilter,
            },
        }
        : undefined;

    const notion = getNotionClient();

    // New Notion API model (2025-09-03+): query the primary data source for this database.
    const db: any = await (notion as any).databases.retrieve({
        database_id: databaseId,
    });

    const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
    if (!dataSourceId) {
        throw new Error('No data source found for the specified Notion database (is this a data-source backed database, and is it shared with the FlowMind integration?).');
    }

    const response = await (notion as any).dataSources.query({
        data_source_id: dataSourceId,
        filter: filter as any,
    });

    const tasks: NotionTask[] = response.results.map((page: any) => {
        // The keys inside `properties` must exactly match your column names in Notion.
        const props = page.properties;

        // Default assumes columns: 'Task Name', 'Status', 'Owner', 'Deadline'
        // You may need to tweak these keys based on your actual Notion DB setup.
        const titleKey = Object.keys(props).find((k) => props[k].type === 'title') || 'Task Name';

        return {
            id: page.id,
            url: page.url,
            title: extractTitle(props[titleKey]),
            status: extractStatus(props['Status']),
            owner: extractRichText(props['Owner']),
            deadline: extractDate(props['Deadline']),
        };
    });

    return tasks;
}

/**
 * Creates a new task in the Notion Tasks Database.
 */
export async function createTask(title: string, status: string = 'To Do'): Promise<NotionTask> {
    const rawId = process.env.NOTION_TASKS_DATABASE_ID;
    if (!rawId) {
        throw new Error('NOTION_TASKS_DATABASE_ID is not set in environment variables.');
    }

    const cleaned = rawId.replace(/-/g, '');
    const databaseId =
        cleaned.length === 32
            ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
            : rawId;

    const response = await getNotionClient().pages.create({
        parent: { database_id: databaseId },
        properties: {
            // Assuming 'Task Name' is the title column
            'Task Name': {
                title: [
                    {
                        text: {
                            content: title,
                        },
                    },
                ],
            },
            Status: {
                status: {
                    name: status,
                },
            },
        },
    });

    return {
        id: response.id,
        url: (response as any).url,
        title,
        status,
    };
}

/**
 * Fetches projects from the Notion Projects database.
 */
export async function getProjects(statusFilter?: string): Promise<NotionProject[]> {
    const rawId = process.env.NOTION_PROJECTS_DATABASE_ID;
    if (!rawId) {
        throw new Error('NOTION_PROJECTS_DATABASE_ID is not set in environment variables.');
    }

    const cleaned = rawId.replace(/-/g, '');
    const databaseId =
        cleaned.length === 32
            ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
            : rawId;

    const filter = statusFilter
        ? {
            property: 'Status',
            status: {
                equals: statusFilter,
            },
        }
        : undefined;

    const notion = getNotionClient();

    const db: any = await (notion as any).databases.retrieve({
        database_id: databaseId,
    });

    const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
    if (!dataSourceId) {
        throw new Error('No data source found for the specified Notion Projects database.');
    }

    const response = await (notion as any).dataSources.query({
        data_source_id: dataSourceId,
        filter: filter as any,
    });

    const projects: NotionProject[] = response.results.map((page: any) => {
        const props = page.properties;
        const titleKey = Object.keys(props).find((k) => props[k].type === 'title') || 'Project Name';

        return {
            id: page.id,
            url: page.url,
            title: extractTitle(props[titleKey]),
            status: extractStatus(props['Status']),
        };
    });

    return projects;
}

/**
 * Fetches users from the Notion Users database.
 */
export async function getUsers(): Promise<NotionUser[]> {
    const rawId = process.env.NOTION_USERS_DATABASE_ID;
    if (!rawId) {
        throw new Error('NOTION_USERS_DATABASE_ID is not set in environment variables.');
    }

    const cleaned = rawId.replace(/-/g, '');
    const databaseId =
        cleaned.length === 32
            ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
            : rawId;

    const notion = getNotionClient();

    const db: any = await (notion as any).databases.retrieve({
        database_id: databaseId,
    });

    const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
    if (!dataSourceId) {
        throw new Error('No data source found for the specified Notion Users database.');
    }

    const response = await (notion as any).dataSources.query({
        data_source_id: dataSourceId,
    });

    const users: NotionUser[] = response.results.map((page: any) => {
        const props = page.properties;
        const titleKey = Object.keys(props).find((k) => props[k].type === 'title') || 'Name';

        return {
            id: page.id,
            name: extractTitle(props[titleKey]),
            telegramUsername: (props['Telegram Username'] as any)?.rich_text?.[0]?.plain_text,
            whatsappNumber: (props['WhatsApp Number'] as any)?.rich_text?.[0]?.plain_text,
            email: (props['Email'] as any)?.email,
            role: (props['Role'] as any)?.select?.name,
        };
    });

    return users;
}
