// Load Supabase credentials from environment variables
// Get these from your Supabase project settings: https://supabase.com/dashboard

// TODO: Replace PLACEHOLDER_KEY with your actual anon key from:
// https://supabase.com/dashboard/project/gvipnadjxnjznjzvxqvg/settings/api

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gvipnadjxnjznjzvxqvg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aXBuYWRqeG5qem5qenZ4cXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTQ1NTEsImV4cCI6MjA3NzA5MDU1MX0.KvK88ghUAa267HmKo03iiyEEoYPHDjc-Tt-Ht6Ehnl0';

// Check if credentials are available
const areSupabaseCredentialsAvailable = !!(supabaseUrl && supabaseAnonKey);

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isAvailable: areSupabaseCredentialsAvailable
  }
};
