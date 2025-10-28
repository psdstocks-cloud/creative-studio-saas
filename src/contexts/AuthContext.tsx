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

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, 30000);

        let profile: { balance?: number | null } | null = null;
        let profileError: { message: string; code?: string } | null = null;

        try {
            const response = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', session.user.id)
                .abortSignal(abortController.signal)
                .single();

            profile = response.data;
            profileError = response.error;
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                throw new Error('Profile fetch timeout after 30 seconds');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }

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
    let timeoutId: ReturnType<typeof setTimeout>;

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

  const deductPoints = useCallback(async (amount: number): Promise<void> => {
    if (amount < 0) {
        throw new Error('Amount to deduct must be non-negative.');
    }

    if (amount === 0) {
        return;
    }

    if (!user) {
        throw new Error("User not authenticated");
    }

    if (user.balance < amount) {
        throw new Error('Insufficient points.');
    }

    const { data, error } = await supabase.rpc('deduct_points', { amount_to_deduct: amount });

    if (error) {
        console.error("Error deducting balance via RPC:", error.message);
        throw new Error(error.message || "Could not deduct points.");
    }

    if (!data || typeof data.balance === 'undefined') {
        throw new Error('Unexpected response while deducting points.');
    }

    setUser(prevUser => prevUser ? { ...prevUser, balance: Number(data.balance) } : prevUser);
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