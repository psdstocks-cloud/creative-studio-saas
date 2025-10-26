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
    let mounted = true;

    // Failsafe timeout to ensure the app doesn't get stuck on the loading screen.
    const timer = setTimeout(() => {
      if (mounted) {
        console.warn("Auth provider timed out. Unlocking the UI to prevent being stuck.");
        setIsLoading(false);
      }
    }, 7000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        
        try {
          if (session?.user) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('balance')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error("AuthProvider: Error fetching user profile:", error.message);
              setUser(null);
            } else {
              const appUser: User = {
                id: session.user.id,
                email: session.user.email || 'No email found',
                balance: profile?.balance ?? 0,
              };
              setUser(appUser);
            }
          } else {
            setUser(null);
          }
        } catch (e) {
            console.error("AuthProvider: Unexpected error in onAuthStateChange", e);
            setUser(null);
        } finally {
            clearTimeout(timer);
            if (mounted) {
              setIsLoading(false);
            }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timer);
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
    setUser(prevUser => prevUser ? { ...prevUser, balance: newBalance } : null);

  }, [user]);

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
