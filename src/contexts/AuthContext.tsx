import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import type { Session } from '@supabase/supabase-js';

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

  const getAppUserFromSession = useCallback(async (session: Session | null): Promise<User | null> => {
    if (!session?.user) {
        return null;
    }
    
    try {
        // Add timeout to profile fetch
        const profilePromise = supabase
            .from('profiles')
            .select('balance')
            .eq('id', session.user.id)
            .single();

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 3000);
        });

        const { data: profile, error: profileError } = await Promise.race([
            profilePromise,
            timeoutPromise
        ]) as any;
        
        if (profileError) {
            console.error("AuthProvider: Error fetching user profile:", profileError.message);
            // Return user with default balance if profile fetch fails
            return {
                id: session.user.id,
                email: session.user.email || 'No email found',
                balance: 100, // Default balance
            };
        }
        
        return {
            id: session.user.id,
            email: session.user.email || 'No email found',
            balance: profile?.balance ?? 100,
        };
    } catch (error) {
        console.error("AuthProvider: Timeout or error fetching profile:", error);
        // Return user with default balance on timeout
        return {
            id: session.user.id,
            email: session.user.email || 'No email found',
            balance: 100,
        };
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function initializeAuth() {
        try {
            // Set a timeout to force loading to false after 5 seconds
            timeoutId = setTimeout(() => {
                if (mounted) {
                    console.warn("Auth initialization timed out after 5 seconds");
                    setIsLoading(false);
                }
            }, 5000);

            const { data: { session } } = await supabase.auth.getSession();
            
            if (mounted) {
                const appUser = await getAppUserFromSession(session);
                setUser(appUser);
                clearTimeout(timeoutId);
            }
        } catch (e) {
            console.error("AuthProvider: Error initializing auth", e);
        } finally {
            if (mounted) {
                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        }
    }
    
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
            if (mounted) {
                const appUser = await getAppUserFromSession(session);
                setUser(appUser);
            }
        }
    );

    return () => {
        mounted = false;
        if (timeoutId) clearTimeout(timeoutId);
        subscription.unsubscribe();
    };
  }, [getAppUserFromSession]);
  
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
        redirectTo: `${window.location.origin}/reset-password`,
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