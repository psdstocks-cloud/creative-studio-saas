import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import type { Database } from '../types';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  throw new Error('Supabase credentials are not configured in config.ts');
}

// Cookie-based storage adapter - tokens are stored in httpOnly cookies by backend
// This adapter provides a no-op implementation since we don't need client-side storage
const cookieStorageAdapter = {
  getItem: (_key: string): Promise<string | null> => {
    // Session tokens are in httpOnly cookies, not accessible via JavaScript
    return Promise.resolve(null);
  },
  setItem: (_key: string, _value: string): Promise<void> => {
    // Cookies are set by backend, not client
    return Promise.resolve();
  },
  removeItem: (_key: string): Promise<void> => {
    // Cookies are cleared by backend
    return Promise.resolve();
  },
};

// Singleton pattern to ensure only one instance
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Prevent multiple instances warning
        storageKey: 'creative-studio-auth',
        autoRefreshToken: true,
        persistSession: false, // Session stored in cookies by backend, not localStorage
        detectSessionInUrl: true,
        // Use PKCE flow for better security
        flowType: 'pkce',
        // Use custom storage adapter - cookies handled by backend
        // This adapter prevents localStorage usage
        storage: cookieStorageAdapter,
      },
    });
  }
  return supabaseInstance;
})();
