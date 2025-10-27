// Load Supabase credentials from environment variables
// Get these from your Supabase project settings: https://supabase.com/dashboard

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are available
const areSupabaseCredentialsAvailable = !!(supabaseUrl && supabaseAnonKey);

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isAvailable: areSupabaseCredentialsAvailable
  }
};
