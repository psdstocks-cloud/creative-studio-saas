// Load Supabase credentials from environment variables
// Get these from your Supabase project settings: https://supabase.com/dashboard

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  (import.meta.env.DEV ? 'https://axjgrfrfhqyqjmksxxld.supabase.co' : '');

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (import.meta.env.DEV ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4amdyZnJmaHF5cWpta3N4eGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTcwMzEsImV4cCI6MjA3Njk5MzAzMX0.fjuzbJDxQ93fVz5CtyzjCrDWtBtQXCminY0q9BShFzM' : '');

// Check if credentials are available
const areSupabaseCredentialsAvailable = !!(supabaseUrl && supabaseAnonKey);

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isAvailable: areSupabaseCredentialsAvailable
  }
};
