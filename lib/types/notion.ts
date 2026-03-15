export interface NotionTask {
  id: string;
  title: string;
  status: string;
  owner?: string;
  deadline?: string;
  url: string;
}

export interface NotionProject {
  id: string;
  title: string;
  status: string;
  url: string;
}

export interface NotionUser {
  id: string;
  name: string;
  telegramUsername?: string;
  whatsappNumber?: string;
  email?: string;
  role?: string;
}
