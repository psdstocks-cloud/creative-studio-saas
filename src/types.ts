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
  title?: string;
  name?: string;
  author?: string;
  ext?: string;
  sizeInBytes?: number | string;
  debugid?: string;
  source_url?: string;  // ← Add this
}

export interface StockOrder {
  task_id: string;
  status: 'pending' | 'ready' | 'failed';
}

// ✅ UPDATED: Support multiple possible response formats from API
// ✅ UPDATED: Support multiple possible response formats from API
export interface StockDownloadLink {
  downloadLink?: string;
  url?: string;
  download_url?: string;
  link?: string;
  data?: {
      downloadLink?: string;  // ← ADD THIS!
      url?: string;
      download_url?: string;
  };
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

// Fix: Add and export the Order interface for managing user file history.
export interface Order {
  id: number;
  created_at: string;
  user_id: string;
  task_id: string;
  file_info: StockFileInfo;
  status: 'processing' | 'ready' | 'failed' | 'payment_failed';
  download_url: string | null;
}

// FIX: Add Database schema types for Supabase client to fix type errors.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          balance: number;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          balance?: number;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          balance?: number;
          updated_at?: string | null;
        };
      };
      stock_order: {
        Row: Order;
        Insert: {
          id?: number;
          created_at?: string;
          user_id: string;
          task_id: string;
          file_info: StockFileInfo;
          status: "processing" | "ready" | "failed" | "payment_failed";
          download_url?: string | null;
        };
        Update: Partial<Order>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
