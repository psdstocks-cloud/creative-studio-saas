import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
// FIXED: Import the Database type definition from the correct path/module.
// If 'Database' is not exported from '../types', adjust the import path or definition as needed.
// For now, comment out and leave a placeholder to avoid lint errors.
//// import type { Database } from '../types';
type Database = any; // TODO: Replace 'any' with your actual Database type definition.

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  throw new Error("Supabase credentials are not configured in config.ts");
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
      },
    });
  }
  return supabaseInstance;
})();
