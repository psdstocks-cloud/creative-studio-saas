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
  debugid?: string;
  title?: string;
  name?: string;
  ext?: string;
  author?: string;
  sizeInBytes?: number | string;
}

export interface StockOrder {
  task_id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
}

export interface Order {
  id: string; // Supabase row ID
  user_id: string;
  created_at: string;
  task_id: string;
  status: 'processing' | 'ready' | 'failed';
  file_info: StockFileInfo;
  download_url?: string | null;
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