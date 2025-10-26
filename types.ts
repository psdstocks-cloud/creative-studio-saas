// types for StockDownloader
export interface StockFileInfo {
  site: string;
  id: string;
  preview: string;
  cost: number | null;
}

export interface StockOrder {
  task_id: string;
  status: 'processing' | 'ready' | 'error';
}

// types for SupportedSites
export interface SupportedSite {
  key: string;
  name: string;
  iconUrl: string;
  cost: string | number;
}

// types for AiGenerator
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
