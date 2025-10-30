import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import type { Database } from '../types';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  throw new Error('Supabase credentials are not configured in config.ts');
}

// Singleton pattern to ensure only one instance
// FIX: Add Database generic to provide table types to the client.
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    // FIX: Add Database generic to the createClient call.
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Prevent multiple instances warning
        storageKey: 'creative-studio-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Use PKCE flow for better security and cookie support
        flowType: 'pkce',
        // Use localStorage for session storage
        storage: window.localStorage,
      },
    });
  }
  return supabaseInstance;
})();
