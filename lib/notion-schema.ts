import { getNotionClient } from './notion-client';

export type NotionProperty =
    | { type: 'title'; title?: Array<{ plain_text: string }> }
    | { type: 'rich_text'; rich_text?: Array<{ plain_text: string }> }
    | { type: 'status'; status?: { name: string } | null }
    | { type: 'select'; select?: { name: string } | null }
    | { type: 'date'; date?: { start: string } | null }
    | { type: 'email'; email?: string | null }
    | { type: 'number'; number?: number | null }
    | { type: string; [key: string]: any };

export type NotionProperties = Record<string, NotionProperty>;

export interface UsersDatabaseContext {
    databaseId: string;
    dataSourceId: string;
    properties: NotionProperties;
}

export function extractTitle(property: NotionProperty | undefined): string {
    if (property?.type === 'title') {
        const title = property.title;
        if (Array.isArray(title) && title.length > 0) {
            return title[0].plain_text;
        }
    }
    return 'Untitled';
}

export function extractRichText(property: any): string | undefined {
    if (property?.type === 'rich_text' && property.rich_text?.length > 0) {
        return property.rich_text[0].plain_text;
    }
    return undefined;
}

export function extractStatus(property: NotionProperty | undefined): string {
    if (property?.type === 'status' && property.status?.name) {
        return property.status.name;
    }
    if (property?.type === 'select' && property.select?.name) {
        return property.select.name;
    }
    return 'No Status';
}

export function extractDate(property: NotionProperty | undefined): string | undefined {
    if (property?.type === 'date' && property.date?.start) {
        return property.date.start;
    }
    return undefined;
}

export function extractEmailOrRichText(property: any): string | undefined {
    if (!property) return undefined;
    if (property.type === 'email') return property.email || undefined;
    if (property.type === 'rich_text' && property.rich_text?.length > 0) {
        return property.rich_text[0].plain_text;
    }
    return undefined;
}

export function normalizeDatabaseId(rawId: string): string {
    const cleaned = rawId.replace(/-/g, '');
    return cleaned.length === 32
        ? `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
        : rawId;
}

export async function getDatabaseContext(rawId: string, label: string): Promise<UsersDatabaseContext> {
    const databaseId = normalizeDatabaseId(rawId);
    const notion = getNotionClient();
    const db: any = await (notion as any).databases.retrieve({
        database_id: databaseId,
    });

    const dataSourceId: string | undefined = db?.data_sources?.[0]?.id;
    if (!dataSourceId) {
        throw new Error(`No data source found for the specified Notion ${label} database.`);
    }

    let properties: NotionProperties = db?.properties ?? {};

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

export function findFirstPropertyNameByType(properties: NotionProperties, type: string, fallback: string): string {
    return Object.keys(properties).find((key) => properties[key]?.type === type) || fallback;
}

export function hasProperty(properties: NotionProperties, name: string, type?: string) {
    const property = properties[name];
    if (!property) return false;
    return type ? property.type === type : true;
}

export function findPropertyByName(properties: NotionProperties, name: string) {
    const exact = Object.keys(properties).find((key) => key === name);
    if (exact) return exact;

    const insensitive = Object.keys(properties).find((key) => key.toLowerCase() === name.toLowerCase());
    return insensitive || null;
}

export function findPropertyByNameAndTypes(
    properties: NotionProperties,
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

export function findPropertyByCandidateNamesAndTypes(
    properties: NotionProperties,
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
