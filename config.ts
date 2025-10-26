// Hardcoded credentials for testing, as requested.
// In production, these should be handled securely via environment variables.
const supabaseUrl = 'https://axjgrfrfhqyqjmksxxld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4amdyZnJmaHF5cWpta3N4eGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTcwMzEsImV4cCI6MjA3Njk5MzAzMX0.fjuzbJDxQ93fVz5CtyzjCrDWtBtQXCminY0q9BShFzM';

// Check remains useful to ensure the hardcoded values are not empty.
const areSupabaseCredentialsAvailable = !!(supabaseUrl && supabaseAnonKey);

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isAvailable: areSupabaseCredentialsAvailable
  }
};
