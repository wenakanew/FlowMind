import { Client } from '@notionhq/client';
import { NotionTask, NotionProject, NotionUser } from './types/notion';

interface UsersDatabaseContext {
    databaseId: string;
    dataSourceId: string;
    properties: Record<string, any>;
}

interface UpsertUserInput {
    name: string;
    email: string;
    avatarUrl?: string;
    telegramUsername?: string;
    whatsappNumber?: string;
    role?: string;
    gmailAccessToken?: string;
    gmailRefreshToken?: string;
    githubAccessToken?: string;
    googleCalendarAccessToken?: string;
    googleCalendarRefreshToken?: string;
}

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

function normalizeDatabaseId(rawId: string): string {
    const cleaned = rawId.replace(/-/g, '');
    return cleaned.length === 32
        ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
        : rawId;
}

async function getDatabaseContext(rawId: string, label: string): Promise<UsersDatabaseContext> {
    const databaseId = normalizeDatabaseId(rawId);
    const notion = getNotionClient();
    const db: any = await (notion as any).databases.retrieve({
        database_id: databaseId,
    });

    const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
    if (!dataSourceId) {
        throw new Error(`No data source found for the specified Notion ${label} database.`);
    }

    let properties: Record<string, any> = db?.properties ?? {};

    // In newer Notion data-source-backed databases, `database.properties` can be empty.
    // Pull schema from data source metadata, then fall back to a sample row shape.
    if (!properties || Object.keys(properties).length === 0) {
        try {
            const dataSourceMeta: any = await (notion as any).dataSources.retrieve({
                data_source_id: dataSourceId,
            });
            properties = dataSourceMeta?.properties ?? properties;
        } catch {
            // ignore and try row-based inference below
        }
    }

    if (!properties || Object.keys(properties).length === 0) {
        try {
            const sample: any = await (notion as any).dataSources.query({
                data_source_id: dataSourceId,
                page_size: 1,
            });
            properties = sample?.results?.[0]?.properties ?? properties;
        } catch {
            // ignore
        }
    }

    return {
        databaseId,
        dataSourceId,
        properties: properties ?? {},
    };
}

function findFirstPropertyNameByType(properties: Record<string, any>, type: string, fallback: string): string {
    return Object.keys(properties).find((key) => properties[key]?.type === type) || fallback;
}

function hasProperty(properties: Record<string, any>, name: string, type?: string) {
    const property = properties[name];
    if (!property) return false;
    return type ? property.type === type : true;
}

function findPropertyByName(properties: Record<string, any>, name: string) {
    const exact = Object.keys(properties).find((key) => key === name);
    if (exact) return exact;

    const insensitive = Object.keys(properties).find((key) => key.toLowerCase() === name.toLowerCase());
    return insensitive || null;
}

function findPropertyByNameAndTypes(
    properties: Record<string, any>,
    name: string,
    allowedTypes: string[],
) {
    const byName = findPropertyByName(properties, name);
    if (byName && allowedTypes.includes(properties[byName]?.type)) {
        return byName;
    }

    return Object.keys(properties).find(
        (key) => key.toLowerCase() === name.toLowerCase() && allowedTypes.includes(properties[key]?.type),
    ) || null;
}

function findPropertyByCandidateNamesAndTypes(
    properties: Record<string, any>,
    names: string[],
    allowedTypes: string[],
) {
    for (const name of names) {
        const key = findPropertyByNameAndTypes(properties, name, allowedTypes);
        if (key) {
            return key;
        }
    }

    return null;
}

function extractEmailOrRichText(property: any): string | undefined {
    if (!property) return undefined;
    if (property.type === 'email') return property.email || undefined;
    if (property.type === 'rich_text' && property.rich_text?.length > 0) {
        return property.rich_text[0].plain_text;
    }
    return undefined;
}

function buildUserProperties(properties: Record<string, any>, input: UpsertUserInput) {
    const result: Record<string, any> = {};
    const titleKey = findFirstPropertyNameByType(properties, 'title', 'Name');

    result[titleKey] = {
        title: [
            {
                text: {
                    content: input.name || input.email,
                },
            },
        ],
    };

    const emailKey = findPropertyByNameAndTypes(properties, 'Email', ['email', 'rich_text']);
    if (emailKey) {
        if (properties[emailKey]?.type === 'email') {
            result[emailKey] = { email: input.email };
        } else {
            result[emailKey] = {
                rich_text: [
                    {
                        text: {
                            content: input.email,
                        },
                    },
                ],
            };
        }
    }

    const telegramKey = findPropertyByNameAndTypes(properties, 'Telegram Username', ['rich_text']);
    if (typeof input.telegramUsername !== 'undefined' && telegramKey) {
        result[telegramKey] = {
            rich_text: input.telegramUsername
                ? [
                    {
                        text: {
                            content: input.telegramUsername,
                        },
                    },
                ]
                : [],
        };
    }

    const whatsappKey = findPropertyByNameAndTypes(properties, 'WhatsApp Number', ['rich_text']);
    if (typeof input.whatsappNumber !== 'undefined' && whatsappKey) {
        result[whatsappKey] = {
            rich_text: input.whatsappNumber
                ? [
                    {
                        text: {
                            content: input.whatsappNumber,
                        },
                    },
                ]
                : [],
        };
    }

    if (typeof input.avatarUrl !== 'undefined' && hasProperty(properties, 'Avatar URL', 'url')) {
        result['Avatar URL'] = { url: input.avatarUrl || null };
    }

    const roleKey = findPropertyByNameAndTypes(properties, 'Role', ['select']);
    if (typeof input.role !== 'undefined' && roleKey && input.role) {
        result[roleKey] = {
            select: {
                name: input.role,
            },
        };
    }

    const gmailAccessTokenKey = findPropertyByCandidateNamesAndTypes(
        properties,
        ['Gmail Access Token', 'Google Access Token', 'Gmail Token'],
        ['rich_text'],
    );
    if (typeof input.gmailAccessToken !== 'undefined' && gmailAccessTokenKey) {
        result[gmailAccessTokenKey] = {
            rich_text: input.gmailAccessToken
                ? [
                    {
                        text: {
                            content: input.gmailAccessToken,
                        },
                    },
                ]
                : [],
        };
    }

    const gmailRefreshTokenKey = findPropertyByCandidateNamesAndTypes(
        properties,
        ['Gmail Refresh Token', 'Google Refresh Token', 'Gmail Refresh'],
        ['rich_text'],
    );
    if (typeof input.gmailRefreshToken !== 'undefined' && gmailRefreshTokenKey) {
        result[gmailRefreshTokenKey] = {
            rich_text: input.gmailRefreshToken
                ? [
                    {
                        text: {
                            content: input.gmailRefreshToken,
                        },
                    },
                ]
                : [],
        };
    }

    const githubAccessTokenKey = findPropertyByCandidateNamesAndTypes(
        properties,
        ['GitHub Access Token', 'Github Access Token', 'GitHub Token'],
        ['rich_text'],
    );
    if (typeof input.githubAccessToken !== 'undefined' && githubAccessTokenKey) {
        result[githubAccessTokenKey] = {
            rich_text: input.githubAccessToken
                ? [
                    {
                        text: {
                            content: input.githubAccessToken,
                        },
                    },
                ]
                : [],
        };
    }

    const calendarAccessTokenKey = findPropertyByCandidateNamesAndTypes(
        properties,
        ['Google Calendar Access Token', 'Calendar Access Token', 'Google Calendar Token'],
        ['rich_text'],
    );
    if (typeof input.googleCalendarAccessToken !== 'undefined' && calendarAccessTokenKey) {
        result[calendarAccessTokenKey] = {
            rich_text: input.googleCalendarAccessToken
                ? [
                    {
                        text: {
                            content: input.googleCalendarAccessToken,
                        },
                    },
                ]
                : [],
        };
    }

    const calendarRefreshTokenKey = findPropertyByCandidateNamesAndTypes(
        properties,
        ['Google Calendar Refresh Token', 'Calendar Refresh Token', 'Google Calendar Refresh'],
        ['rich_text'],
    );
    if (typeof input.googleCalendarRefreshToken !== 'undefined' && calendarRefreshTokenKey) {
        result[calendarRefreshTokenKey] = {
            rich_text: input.googleCalendarRefreshToken
                ? [
                    {
                        text: {
                            content: input.googleCalendarRefreshToken,
                        },
                    },
                ]
                : [],
        };
    }

    const requiredIntegrationFields: Array<{ provided: boolean; key: string | null; label: string }> = [
        { provided: typeof input.gmailAccessToken !== 'undefined', key: gmailAccessTokenKey, label: 'Gmail Access Token' },
        { provided: typeof input.gmailRefreshToken !== 'undefined', key: gmailRefreshTokenKey, label: 'Gmail Refresh Token' },
        { provided: typeof input.githubAccessToken !== 'undefined', key: githubAccessTokenKey, label: 'GitHub Access Token' },
        { provided: typeof input.googleCalendarAccessToken !== 'undefined', key: calendarAccessTokenKey, label: 'Google Calendar Access Token' },
        { provided: typeof input.googleCalendarRefreshToken !== 'undefined', key: calendarRefreshTokenKey, label: 'Google Calendar Refresh Token' },
    ];

    const missing = requiredIntegrationFields
        .filter((field) => field.provided && !field.key)
        .map((field) => field.label);

    if (missing.length > 0) {
        throw new Error(
            `Notion Users database is missing required integration token fields: ${missing.join(', ')}. ` +
            'Add these as Rich text properties to store connected account tokens.',
        );
    }

    return result;
}

function mapNotionUser(page: any): NotionUser {
    const props = page.properties;
    const titleKey = Object.keys(props).find((k) => props[k].type === 'title') || 'Name';
    const emailKey = findPropertyByNameAndTypes(props, 'Email', ['email', 'rich_text']);
    const telegramKey = findPropertyByNameAndTypes(props, 'Telegram Username', ['rich_text']);
    const whatsappKey = findPropertyByNameAndTypes(props, 'WhatsApp Number', ['rich_text']);
    const roleKey = findPropertyByNameAndTypes(props, 'Role', ['select']);
    const avatarKey = findPropertyByNameAndTypes(props, 'Avatar URL', ['url']);
    const gmailAccessTokenKey = findPropertyByCandidateNamesAndTypes(
        props,
        ['Gmail Access Token', 'Google Access Token', 'Gmail Token'],
        ['rich_text'],
    );
    const gmailRefreshTokenKey = findPropertyByCandidateNamesAndTypes(
        props,
        ['Gmail Refresh Token', 'Google Refresh Token', 'Gmail Refresh'],
        ['rich_text'],
    );
    const githubAccessTokenKey = findPropertyByCandidateNamesAndTypes(
        props,
        ['GitHub Access Token', 'Github Access Token', 'GitHub Token'],
        ['rich_text'],
    );
    const calendarAccessTokenKey = findPropertyByCandidateNamesAndTypes(
        props,
        ['Google Calendar Access Token', 'Calendar Access Token', 'Google Calendar Token'],
        ['rich_text'],
    );
    const calendarRefreshTokenKey = findPropertyByCandidateNamesAndTypes(
        props,
        ['Google Calendar Refresh Token', 'Calendar Refresh Token', 'Google Calendar Refresh'],
        ['rich_text'],
    );

    return {
        id: page.id,
        name: extractTitle(props[titleKey]),
        telegramUsername: telegramKey ? extractRichText(props[telegramKey]) : undefined,
        whatsappNumber: whatsappKey ? extractRichText(props[whatsappKey]) : undefined,
        email: emailKey ? extractEmailOrRichText(props[emailKey]) : undefined,
        role: roleKey ? props[roleKey]?.select?.name : undefined,
        avatarUrl: avatarKey ? props[avatarKey]?.url : undefined,
        gmailAccessToken: gmailAccessTokenKey ? extractRichText(props[gmailAccessTokenKey]) : undefined,
        gmailRefreshToken: gmailRefreshTokenKey ? extractRichText(props[gmailRefreshTokenKey]) : undefined,
        githubAccessToken: githubAccessTokenKey ? extractRichText(props[githubAccessTokenKey]) : undefined,
        googleCalendarAccessToken: calendarAccessTokenKey ? extractRichText(props[calendarAccessTokenKey]) : undefined,
        googleCalendarRefreshToken: calendarRefreshTokenKey ? extractRichText(props[calendarRefreshTokenKey]) : undefined,
    };
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
    const databaseId = normalizeDatabaseId(rawId);

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
export async function createTask(title: string, status: string = 'To Do', owner?: string): Promise<NotionTask> {
    const rawId = process.env.NOTION_TASKS_DATABASE_ID;
    if (!rawId) {
        throw new Error('NOTION_TASKS_DATABASE_ID is not set in environment variables.');
    }

    const context = await getDatabaseContext(rawId, 'Tasks');
    const titleKey = findFirstPropertyNameByType(context.properties, 'title', 'Task Name');
    const statusKey = findPropertyByNameAndTypes(context.properties, 'Status', ['status', 'select']) || 'Status';
    const ownerKey = findPropertyByNameAndTypes(context.properties, 'Owner', ['rich_text']);

    const properties: Record<string, any> = {
        [titleKey]: {
            title: [
                {
                    text: {
                        content: title,
                    },
                },
            ],
        },
    };

    if (context.properties[statusKey]?.type === 'select') {
        properties[statusKey] = {
            select: {
                name: status,
            },
        };
    } else {
        properties[statusKey] = {
            status: {
                name: status,
            },
        };
    }

    if (owner && ownerKey) {
        properties[ownerKey] = {
            rich_text: [
                {
                    text: {
                        content: owner,
                    },
                },
            ],
        };
    }

    const response = await getNotionClient().pages.create({
        parent: { database_id: context.databaseId },
        properties,
    });

    return {
        id: response.id,
        url: (response as any).url,
        title,
        status: extractStatus((response as any).properties?.[statusKey]) || status,
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

    const databaseId = normalizeDatabaseId(rawId);

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

    const { dataSourceId } = await getDatabaseContext(rawId, 'Users');
    const notion = getNotionClient();

    const response = await (notion as any).dataSources.query({
        data_source_id: dataSourceId,
    });

    const users: NotionUser[] = response.results.map(mapNotionUser);

    return users;
}

export async function getUserByEmail(email: string): Promise<NotionUser | null> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
        return null;
    }
    // Using full scan here is more reliable across Notion schema/version variations.
    const users = await getUsers();
    return users.find((user) => user.email?.trim().toLowerCase() === trimmedEmail) || null;
}

export async function getUserByTelegramUsername(username: string): Promise<NotionUser | null> {
    const normalized = username.trim().replace(/^@/, '').toLowerCase();
    if (!normalized) {
        return null;
    }

    const users = await getUsers();
    return users.find((user) => user.telegramUsername?.trim().replace(/^@/, '').toLowerCase() === normalized) || null;
}

export async function getUserByWhatsAppNumber(phone: string): Promise<NotionUser | null> {
    const normalize = (value: string) => value
        .trim()
        .replace(/^whatsapp:/i, '')
        .replace(/[\s()-]/g, '')
        .toLowerCase();

    const normalized = normalize(phone);
    if (!normalized) {
        return null;
    }

    const users = await getUsers();
    return users.find((user) => {
        if (!user.whatsappNumber) return false;
        return normalize(user.whatsappNumber) === normalized;
    }) || null;
}

export async function upsertUser(input: UpsertUserInput): Promise<NotionUser> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
        throw new Error('Email is required to sync a user to Notion.');
    }

    const rawId = process.env.NOTION_USERS_DATABASE_ID;
    if (!rawId) {
        throw new Error('NOTION_USERS_DATABASE_ID is not set in environment variables.');
    }

    const notion = getNotionClient();
    const context = await getDatabaseContext(rawId, 'Users');
    const properties = buildUserProperties(context.properties, {
        ...input,
        email,
        name: input.name.trim() || email,
    });

    const existingByEmail = await getUserByEmail(email);
    const users = existingByEmail ? [] : await getUsers();
    const existingByNameWithoutEmail = users.find(
        (user) =>
            user.name.trim().toLowerCase() === input.name.trim().toLowerCase() &&
            (!user.email || !user.email.trim()),
    );
    const existing = existingByEmail || existingByNameWithoutEmail || null;

    if (existing) {
        const response = await notion.pages.update({
            page_id: existing.id,
            properties,
        });

        return mapNotionUser(response);
    }

    const response = await notion.pages.create({
        parent: { database_id: context.databaseId },
        properties,
    });

    return mapNotionUser(response);
}
