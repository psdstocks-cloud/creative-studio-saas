import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  throw new Error("Supabase credentials are not configured in config.ts");
}

// Singleton pattern to ensure only one instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Prevent multiple instances warning
        storageKey: 'creative-studio-auth',
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return supabaseInstance;
})();
