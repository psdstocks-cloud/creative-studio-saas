export type DownloadStatus =
  | 'queued'
  | 'starting'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'retrying';

export interface DownloadItem {
  id: string;
  job_id: string;
  provider: 'shutterstock' | 'pexels' | 'unsplash' | 'adobe' | 'getty' | string;
  source_url: string;
  filename: string | null;
  bytes_total: number | null;
  bytes_downloaded: number;
  status: DownloadStatus;
  error_message?: string | null;
  thumb_url?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  meta?: Record<string, unknown>;
}

export interface DownloadJob {
  id: string;
  user_id: string;
  title: string;
  status: DownloadStatus;
  items_count: number;
  items_completed: number;
  items_failed: number;
  bytes_total: number | null;
  bytes_downloaded: number;
  created_at: string;
  updated_at: string;
  provider_batch_id?: string | null;
}
