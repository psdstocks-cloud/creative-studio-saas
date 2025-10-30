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
  source_url?: string; // Added
}

export interface StockOrder {
  task_id: string;
  status: 'pending' | 'ready' | 'failed';
}

// ✅ UPDATED: Support multiple possible response formats from API
export interface StockDownloadLink {
  downloadLink?: string;
  url?: string;
  download_url?: string;
  link?: string;
  data?: {
    downloadLink?: string;
    url?: string;
    download_url?: string;
  };
}

export interface SupportedSite {
  key: string;
  name: string;
  cost: number | string | null;
  icon?: string;
  iconUrl?: string;
  active?: boolean;
}

export interface User {
  id: string; // From Supabase Auth
  email: string;
  balance: number; // From our 'profiles' table
  roles: string[];
  metadata?: Record<string, unknown> | null;
}

export interface AccountOverview {
  id: string | null;
  email: string | null;
  username: string | null;
  balance: number;
  plan?: string | null;
  lastLoginAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SendPointsResult {
  success: boolean;
  balance: number | null;
  message: string;
  metadata?: Record<string, unknown> | null;
}

export interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  monthly_points: number;
  billing_interval: 'month' | 'one_time';
  active?: boolean;
}

export interface BillingSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  last_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: BillingPlan;
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount_cents: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id: string;
  plan_snapshot: Record<string, unknown>;
  amount_cents: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  next_payment_attempt: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: InvoiceItem[];
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

export interface AuditEntry {
  timestamp: string | null;
  action: string;
  actor: { id: string; email?: string | null; roles?: string[] | null } | null;
  method: string | null;
  path: string | null;
  status: number | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  durationMs: number | null;
}

export interface AdminOrderSummary extends Order {}

export interface AdminUserOrderStats {
  total: number;
  ready: number;
  failed: number;
  processing: number;
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  roles: string[];
  lastSignInAt: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown>;
  balance: number;
  updatedAt: string | null;
  orderStats: AdminUserOrderStats;
}

export interface AdminDashboardSummary {
  summary: {
    ordersLast24h: number;
    processingOrders: number;
    totalSpend30d: number;
  };
  topSites: { site: string; count: number }[];
  recentOrders: Order[];
  recentAudit: AuditEntry[];
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
          status: 'processing' | 'ready' | 'failed' | 'payment_failed';
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
