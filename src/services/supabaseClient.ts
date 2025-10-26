import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Use hardcoded config instead of process.env
const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are not configured in config.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
