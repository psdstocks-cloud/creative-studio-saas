import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Debug: Log config values (REMOVE THIS AFTER TESTING)
console.log('🔍 Supabase Config Debug:');
console.log('URL:', config.supabase.url);
console.log('Key (first 20 chars):', config.supabase.anonKey?.substring(0, 20) + '...');

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey ? 'Exists' : 'Missing');
  throw new Error("Supabase credentials are not configured in config.ts");
}

console.log('✅ Creating Supabase client...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client created successfully!');
