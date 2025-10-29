// Load Supabase credentials from environment variables
// Get these from your Supabase project settings: https://supabase.com/dashboard

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are available
const areSupabaseCredentialsAvailable = !!(supabaseUrl && supabaseAnonKey);

// Only log configuration status in development
if (import.meta.env.DEV) {
  if (areSupabaseCredentialsAvailable) {
    console.log('✓ Supabase configured:', supabaseUrl);
  } else {
    console.error('✗ Missing Supabase credentials (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)');
  }
}

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isAvailable: areSupabaseCredentialsAvailable,
  },
};
