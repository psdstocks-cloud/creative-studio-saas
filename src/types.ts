

export interface AiJobFile {
  index: number;
  thumb_sm: string;
  thumb_lg: string;
  download: string;
}

export interface AiJob {
  _id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  percentage_complete: number;
  files: AiJobFile[];
  type?: string; // "imagine / vary / upscale"
  cost?: number;
  error_message?: string | null;
  parent_nh_job_id?: string | null;
  get_result_url?: string; // Manually added for state management
  created_at?: number;
}

export interface StockFileInfo {
  id: string;
  site: string;
  preview: string;
  cost: number | null;
  // FIX: Added optional properties to support detailed file views.
  title?: string | null;
  name?: string | null;
  author?: string | null;
  ext?: string | null;
  sizeInBytes?: number | string | null;
  debugid?: string | null;
}

export interface StockOrder {
  task_id: string;
  status: 'pending' | 'ready' | 'failed';
}

// FIX: Added Order interface for database records.
export interface Order {
  id: number;
  user_id: string;
  task_id: string;
  file_info: StockFileInfo;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  download_url: string | null;
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
