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
        console.log("Fetching profile for user:", session.user.id);
        
        // Fetch profile with timeout
        const profilePromise = supabase
            .from('profiles')
            .select('balance')
            .eq('id', session.user.id)
            .single();

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout after 30 seconds')), 30000); // Increased to 30 seconds
        });

        const { data: profile, error: profileError } = await Promise.race([
            profilePromise,
            timeoutPromise
        ]) as any;
        
        console.log("Profile fetch completed:", { profile, error: profileError });
        
        if (profileError) {
            console.error("AuthProvider: Error fetching user profile:", profileError.message);
            
            // CRITICAL FIX: Don't create profile automatically if it doesn't exist
            // This was causing the balance reset bug
            if (profileError.code === 'PGRST116') {
                // Profile doesn't exist - create it with 100 balance (new user)
                console.log("Creating new profile for user:", session.user.id);
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ id: session.user.id, balance: 100 }]);
                
                if (insertError) {
                    console.error("Error creating profile:", insertError.message);
                    throw new Error("Could not create user profile");
                }
                
                return {
                    id: session.user.id,
                    email: session.user.email || 'No email found',
                    balance: 100,
                };
            }
            
            // For other errors, throw to prevent login
            throw new Error(`Profile fetch failed: ${profileError.message}`);
        }
        
        return {
            id: session.user.id,
            email: session.user.email || 'No email found',
            balance: Number(profile?.balance ?? 100), // Convert to number to handle numeric type
        };
    } catch (error: any) {
        console.error("AuthProvider: Error fetching profile:", error);
        // Don't return default balance on error - throw instead
        throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function initializeAuth() {
        try {
            // Set a timeout to force loading to false after 15 seconds
            timeoutId = setTimeout(() => {
                if (mounted) {
                    console.warn("Auth initialization timed out after 15 seconds");
                    setIsLoading(false);
                }
            }, 15000); // Increased to 15 seconds

            const { data: { session } } = await supabase.auth.getSession();
            
            if (mounted) {
                try {
                    const appUser = await getAppUserFromSession(session);
                    setUser(appUser);
                    clearTimeout(timeoutId);
                } catch (profileError) {
                    // If profile fetch fails, log out the user to prevent showing incorrect balance
                    console.error("Failed to load user profile, signing out:", profileError);
                    await supabase.auth.signOut();
                    setUser(null);
                }
            }
        } catch (e) {
            console.error("AuthProvider: Error initializing auth", e);
            setUser(null);
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
                try {
                    const appUser = await getAppUserFromSession(session);
                    setUser(appUser);
                } catch (profileError) {
                    // If profile fetch fails during auth state change, sign out to prevent showing incorrect data
                    console.error("Failed to load user profile during auth state change:", profileError);
                    await supabase.auth.signOut();
                    setUser(null);
                }
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
        throw new Error(error.message || 'Could not send password reset email.');
    }
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