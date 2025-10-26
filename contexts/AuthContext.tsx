import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// This interface defines the user object used throughout the app.
interface User {
  id: string;
  email: string;
  balance: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  deductPoints: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetches extended user profile data (e.g., balance) from a 'profiles' table in Supabase.
  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    if (!supabase) return null; // Guard against uninitialized client
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', supabaseUser.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        // If profile doesn't exist, we can still create a user object with default balance.
        return {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          balance: 0,
        };
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        balance: data.balance || 0,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  // Effect to check for an active session on mount and listen for auth state changes.
  useEffect(() => {
    // If the Supabase client is not initialized, we can't do anything.
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      }
      setIsLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        } else {
          setUser(null);
        }
        if (isLoading) setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, isLoading]);

  const signIn = async (email: string, pass: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: {
            // URL to redirect to after email confirmation
            emailRedirectTo: window.location.origin
        }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const sendPasswordResetEmail = async (email: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`, 
    });
    if (error) throw error;
  };

  const deductPoints = useCallback(async (amount: number): Promise<void> => {
    setUser(currentUser => {
        if (!currentUser || currentUser.balance < amount) {
            throw new Error('Insufficient points.');
        }
        const newBalance = currentUser.balance - amount;

        // TODO: In a real app, this update should be done securely via a Supabase Edge Function
        // to prevent client-side manipulation. For this demo, we only update the local state.
        // Example: await supabase.rpc('deduct_points', { amount_to_deduct: amount });
        
        console.log(`Deducting ${amount} points. New balance (local state): ${newBalance}`);
        return { ...currentUser, balance: newBalance };
    });
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    sendPasswordResetEmail,
    deductPoints
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
