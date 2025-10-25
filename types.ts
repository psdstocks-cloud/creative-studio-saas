export interface AiJobFile {
  index: number;
  thumb_sm: string;
  thumb_lg: string;
  download: string;
}

export interface AiJob {
  _id: string;
  prompt: string;
  status: 'pending' | 'completed' | 'failed';
  percentage_complete: number;
  files: AiJobFile[];
}

export interface StockFileInfo {
  id: string;
  site: string;
  preview: string;
  cost: number | null;
}

export interface StockOrder {
  task_id: string;
  status: 'pending' | 'ready' | 'failed';
}

export interface StockDownloadLink {
    url: string;
}

export interface SupportedSite {
  key: string;
  name: string;
  cost: number | string | null;
  iconUrl: string;
}

export interface User {
  id: string; // From Supabase Auth
  email: string;
  balance: number; // From our 'profiles' table
}