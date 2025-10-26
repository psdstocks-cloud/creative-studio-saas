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
    // onAuthStateChange is the single source of truth for the user's session.
    // It fires immediately on load with an INITIAL_SESSION event, handling all cases.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        let appUser: User | null = null;

        if (session?.user) {
          // If a session exists, fetch the associated profile to get the balance.
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error("Auth: Error fetching user profile:", error.message);
            // If we can't get profile info, the session is likely invalid (e.g., user deleted).
            // Treat the user as logged out to prevent app errors.
            appUser = null; 
          } else {
            appUser = {
              id: session.user.id,
              email: session.user.email!,
              balance: profile?.balance ?? 0,
            };
          }
        }
        
        setUser(appUser);

        // This is the definitive fix: No matter the outcome (logged in, logged out, or error),
        // we now know the initial auth state is resolved, so we must stop the loading indicator.
        setIsLoading(false);
      }
    );

    // Cleanup the subscription when the component unmounts.
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Could not sign up user.');
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
     if (error) {
      console.error("Error signing out:", error.message);
    }
  }, []);

  const deductPoints = useCallback(async (amount: number) => {
    // Use a function for setUser to avoid stale state issues.
    let currentUser: User | null = null;
    setUser(prevUser => {
        currentUser = prevUser;
        return prevUser;
    });

    if (!currentUser) throw new Error("User not authenticated");

    const newBalance = Math.max(0, currentUser.balance - amount);
    
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', currentUser.id);
    
    if (error) {
      console.error("Error updating balance:", error.message);
      throw new Error("Could not deduct points.");
    }
    
    setUser(prevUser => prevUser ? { ...prevUser, balance: newBalance } : null);

  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) {
        console.error('Password reset error:', error.message);
    }
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