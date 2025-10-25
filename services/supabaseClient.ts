
import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials when deployed on Vercel.
// For local development, you MUST replace the placeholder values below.
const supabaseUrl = process.env.SUPABASE_URL || "https://axjgrfrfhqyqjmksxxld.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4amdyZnJmaHF5cWpta3N4eGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTcwMzEsImV4cCI6MjA3Njk5MzAzMX0.fjuzbJDxQ93fVz5CtyzjCrDWtBtQXCminY0q9BShFzM";

// The hardcoded values above are placeholders. If the app is run locally
// without environment variables, this check will log a warning to the console
// instead of crashing the application.
if (supabaseUrl === "https://axjgrfrfhqyqjmksxxld.supabase.co") {
    console.warn(
        "Supabase credentials are using placeholder values. " +
        "Please open `services/supabaseClient.ts` and replace the placeholder URL and Key " +
        "with your actual Supabase credentials for the application to function correctly."
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
