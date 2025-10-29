import { supabase } from './supabaseClient';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// This service encapsulates all Supabase authentication logic.

if (!supabase) {
  console.error('AuthService: Supabase client is not initialized. Authentication will not work.');
}

export const signInUser = (email: string, pass: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signInWithPassword({ email, password: pass });
};

export const signUpUser = (email: string, pass: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signUp({
    email,
    password: pass,
    options: {
      emailRedirectTo: `${window.location.origin}/#/auth/callback`,
    },
  });
};

export const signOutUser = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signOut();
};

export const resetPasswordForEmail = (email: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  });
};

export const getSupabaseSession = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.getSession();
};

export const onSupabaseAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  if (!supabase) {
    // Return a mock subscription object if supabase is not available
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
};

export const fetchUserProfileFromDb = (supabaseUser: SupabaseUser) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.from('profiles').select('balance').eq('id', supabaseUser.id).single();
};
