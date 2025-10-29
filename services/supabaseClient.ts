import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Only create a client if credentials are provided. Otherwise, the client will be null.
// The main app entry point (index.tsx) will catch this and display an error.
export const supabase = config.supabase.isAvailable
  ? createClient(config.supabase.url, config.supabase.anonKey)
  : null;
