import { Client } from '@notionhq/client';

export interface NotionClientAdapter {
  [key: string]: any;
  databases: {
    retrieve: (args: { database_id: string }) => Promise<any>;
  };
  dataSources: {
    retrieve: (args: { data_source_id: string }) => Promise<any>;
    query: (args: { data_source_id: string; page_size?: number; filter?: any; sorts?: any[] }) => Promise<any>;
  };
  pages: {
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    retrieve: (args: any) => Promise<any>;
  };
  blocks: {
    children: {
      list: (args: any) => Promise<any>;
    };
  };
}

let notionClient: NotionClientAdapter | null = null;

export function getNotionClient(): NotionClientAdapter {
  if (!notionClient) {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY is not set in environment variables.');
    }
    notionClient = new Client({ auth: process.env.NOTION_API_KEY }) as unknown as NotionClientAdapter;
  }
  return notionClient;
}
