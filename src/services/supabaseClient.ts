import { createClient } from '@supabase/supabase-js';

// 🔥 Hardcoded credentials - inline approach
const supabaseUrl = 'https://axjgrfrfhqyqjmksxxld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4amdyZnJmaHF5cWpta3N4eGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTcwMzEsImV4cCI6MjA3Njk5MzAzMX0.fjuzbJDxQ93fVz5CtyzjCrDWtBtQXCminY0q9BShFzM';

// Debug logging
console.log('🚀 Supabase Client Initialization');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key (first 30):', supabaseAnonKey.substring(0, 30) + '...');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  throw new Error("Supabase credentials are not configured");
}

console.log('✅ Creating Supabase client...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client created successfully!');
