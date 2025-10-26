import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  deductPoints: (amount: number) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Perform a one-time, robust check for the user's session on initial load.
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error("Error fetching user profile, session may be invalid:", error.message);
            // If the profile is inaccessible, the session is corrupt or user deleted. Sign out.
            await supabase.auth.signOut();
            setUser(null);
          } else {
            const appUser: User = {
              id: session.user.id,
              email: session.user.email!,
              balance: data?.balance ?? 0,
            };
            setUser(appUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Critical error during session check:", error);
        setUser(null);
      } finally {
        // This is crucial: guarantee that the loading state is resolved.
        setIsLoading(false);
      }
    };

    checkUserSession();

    // Set up the listener for real-time auth changes (e.g., login, logout in another tab).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // This listener now only handles state *changes*, not the initial load.
        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error("Error refreshing profile on auth state change:", error.message);
            setUser(null);
          } else {
            const appUser: User = {
              id: session.user.id,
              email: session.user.email!,
              balance: data?.balance ?? 0,
            };
            setUser(appUser);
          }
        } else {
          setUser(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || "Invalid credentials. Please try again.");
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    // Sign up the user in the 'auth' schema.
    // A database trigger (configured in Supabase) will automatically create their corresponding profile.
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Could not sign up user.');
    }

    // Note: By default, Supabase may require email confirmation. The onAuthStateChange
    // listener will set the user session only after they've confirmed their email.
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
     if (error) {
      console.error("Error signing out:", error.message);
    }
  }, []);

  const deductPoints = useCallback(async (amount: number) => {
    if (!user) throw new Error("User not authenticated");

    const newBalance = Math.max(0, user.balance - amount);
    
    // Update the database first
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);
    
    if (error) {
      console.error("Error updating balance:", error.message);
      throw new Error("Could not deduct points.");
    }
    
    // Then, update the local state for immediate UI feedback
    setUser({ ...user, balance: newBalance });

  }, [user]);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // IMPORTANT: You must configure this URL in your Supabase project's email templates.
        redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) {
        // We don't throw an error to the user to prevent email enumeration.
        // We just log it for debugging.
        console.error('Password reset error:', error.message);
    }
    // Always resolve successfully from the user's perspective.
    return Promise.resolve();
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
        console.error("Error resending confirmation email:", error.message);
        throw new Error(error.message || "Could not resend confirmation email.");
    }
  }, []);


  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signIn, signUp, signOut, deductPoints, sendPasswordResetEmail, resendConfirmationEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
