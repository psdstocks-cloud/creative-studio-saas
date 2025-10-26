// These variables are injected at build time by esbuild.
// See the 'build' script in package.json.
const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';

// Perform a check to ensure variables are not just empty strings after trimming
const areSupabaseCredentialsAvailable = !!(supabaseUrl && supabaseAnonKey);

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isAvailable: areSupabaseCredentialsAvailable
  }
};
