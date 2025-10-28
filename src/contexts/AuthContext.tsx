import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import type { Session, PostgrestError } from '@supabase/supabase-js';
import { deductBalance } from '../services/profileService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  deductPoints: (amount: number) => Promise<void>;
  updateUserBalance: (balance: number) => void;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

type ProfileFetchFailureType = 'timeout' | 'permission' | 'missing' | 'unknown';

interface ProfileFetchError extends Error {
  failureType: ProfileFetchFailureType;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
  original?: unknown;
}

const PROFILE_FETCH_TIMEOUT_MS = 30000;
const PROFILE_FETCH_RETRY_DELAY_MS = 500;
const MAX_PROFILE_FETCH_ATTEMPTS = 2;

const classifyPostgrestError = (error: PostgrestError | null): ProfileFetchFailureType => {
  if (!error) {
    return 'unknown';
  }

  if (error.code === 'PGRST116') {
    return 'missing';
  }

  if (error.code === 'PGRST301' || error.code === '42501') {
    return 'permission';
  }

  const combined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();

  if (
    combined.includes('permission denied') ||
    combined.includes('row-level security') ||
    combined.includes('row level security') ||
    combined.includes('not authorized')
  ) {
    return 'permission';
  }

  return 'unknown';
};

const createProfileFetchError = (
  message: string,
  failureType: ProfileFetchFailureType,
  meta: { code?: string; details?: string | null; hint?: string | null; status?: number; original?: unknown } = {}
): ProfileFetchError => {
  const error = new Error(message) as ProfileFetchError;
  error.failureType = failureType;
  error.code = meta.code;
  error.details = typeof meta.details === 'undefined' ? null : meta.details;
  error.hint = typeof meta.hint === 'undefined' ? null : meta.hint;
  error.status = meta.status;
  error.original = meta.original;
  return error;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAppUserFromSession = useCallback(async (session: Session | null): Promise<User | null> => {
    if (!session?.user) {
        return null;
    }

    try {
        console.log("AuthProvider: Fetching profile for user", session.user.id);

        let lastError: ProfileFetchError | Error | null = null;

        for (let attempt = 1; attempt <= MAX_PROFILE_FETCH_ATTEMPTS; attempt++) {
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, PROFILE_FETCH_TIMEOUT_MS);

            try {
                const response = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', session.user.id)
                    .abortSignal(abortController.signal)
                    .single();

                const { data: profile, error: profileError, status } = response;

                console.log('AuthProvider: Profile fetch attempt completed', {
                    attempt,
                    status,
                    hasError: Boolean(profileError),
                });

                if (profileError) {
                    const failureType = classifyPostgrestError(profileError);

                    console.error('AuthProvider: Error fetching user profile from Supabase', {
                        attempt,
                        failureType,
                        code: profileError.code,
                        message: profileError.message,
                        details: profileError.details,
                        hint: profileError.hint,
                        status,
                    });

                    if (failureType === 'missing') {
                        console.log("AuthProvider: Creating missing profile for user", session.user.id);
                        const { error: insertError, status: insertStatus } = await supabase
                            .from('profiles')
                            .insert([{ id: session.user.id, balance: 100 }]);

                        if (insertError) {
                            console.error('AuthProvider: Error creating profile in Supabase', {
                                code: insertError.code,
                                message: insertError.message,
                                details: insertError.details,
                                hint: insertError.hint,
                                status: insertStatus,
                            });
                            throw createProfileFetchError('Could not create user profile', 'unknown', {
                                code: insertError.code,
                                details: insertError.details,
                                hint: insertError.hint,
                                status: insertStatus,
                                original: insertError,
                            });
                        }

                        return {
                            id: session.user.id,
                            email: session.user.email || 'No email found',
                            balance: 100,
                        };
                    }

                    const errorToThrow = createProfileFetchError(
                        `Profile fetch failed: ${profileError.message}`,
                        failureType,
                        {
                            code: profileError.code,
                            details: profileError.details,
                            hint: profileError.hint,
                            status,
                            original: profileError,
                        }
                    );

                    lastError = errorToThrow;

                    if (attempt < MAX_PROFILE_FETCH_ATTEMPTS && failureType === 'unknown') {
                        console.warn('AuthProvider: Retrying profile fetch due to unexpected error', {
                            attempt,
                            code: profileError.code,
                        });
                        await new Promise((resolve) =>
                            setTimeout(resolve, PROFILE_FETCH_RETRY_DELAY_MS * attempt)
                        );
                        continue;
                    }

                    throw errorToThrow;
                }

                console.log('AuthProvider: Successfully fetched profile for user', {
                    attempt,
                    userId: session.user.id,
                });

                return {
                    id: session.user.id,
                    email: session.user.email || 'No email found',
                    balance: Number(profile?.balance ?? 100),
                };
            } catch (error: any) {
                if (error?.name === 'AbortError') {
                    console.error('AuthProvider: Profile fetch aborted due to timeout', { attempt });

                    if (attempt < MAX_PROFILE_FETCH_ATTEMPTS) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, PROFILE_FETCH_RETRY_DELAY_MS * attempt)
                        );
                        continue;
                    }

                    throw createProfileFetchError('Profile fetch timeout after 30 seconds', 'timeout', {
                        original: error,
                    });
                }

                console.error('AuthProvider: Unexpected exception during profile fetch', {
                    attempt,
                    error,
                });
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }
        }

        if (lastError) {
            throw lastError;
        }

        throw createProfileFetchError('Profile fetch failed for unknown reasons', 'unknown');
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
                    const failureType = (profileError as ProfileFetchError)?.failureType ?? 'unknown';
                    console.error("Failed to load user profile:", profileError);

                    if (failureType === 'timeout' || failureType === 'permission') {
                        console.warn('AuthProvider: Preserving Supabase session despite profile fetch failure', {
                            failureType,
                        });
                        setUser(null);
                    } else {
                        console.warn('AuthProvider: Signing out due to unrecoverable profile fetch error');
                        await supabase.auth.signOut();
                        setUser(null);
                    }
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
                    const failureType = (profileError as ProfileFetchError)?.failureType ?? 'unknown';
                    console.error("Failed to load user profile during auth state change:", profileError);

                    if (failureType === 'timeout' || failureType === 'permission') {
                        console.warn('AuthProvider: Retaining Supabase session after auth state change error', {
                            failureType,
                        });
                        setUser(null);
                    } else {
                        console.warn('AuthProvider: Signing out after auth state change due to profile fetch error');
                        await supabase.auth.signOut();
                        setUser(null);
                    }
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(error.message || "Invalid credentials. Please try again.");
    }

    try {
      // Ensure the user's profile can be fetched right after sign-in so any
      // profile-related issues surface immediately instead of silently failing.
      const session = data.session ?? (await supabase.auth.getSession()).data.session;

      if (!session) {
        throw new Error('No active session found after sign in.');
      }

      const appUser = await getAppUserFromSession(session);

      setUser(appUser);
    } catch (profileError: any) {
      const failureType = (profileError as ProfileFetchError)?.failureType ?? 'unknown';
      console.error('AuthProvider: Failed to resolve profile after sign in', profileError);

      if (failureType !== 'timeout' && failureType !== 'permission') {
        await supabase.auth.signOut();
      }

      const message = profileError?.message || 'Could not complete sign in.';
      throw new Error(message);
    }
  }, [getAppUserFromSession]);

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

  const updateUserBalance = useCallback((balance: number) => {
    setUser(prevUser => (prevUser ? { ...prevUser, balance: Number(balance) } : prevUser));
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

    try {
      const result = await deductBalance(amount);

      if (!result || typeof result.balance === 'undefined') {
        throw new Error('Unexpected response while deducting points.');
      }

      updateUserBalance(result.balance);
    } catch (error: any) {
      console.error('Error deducting balance via API:', error);
      throw new Error(error?.message || 'Could not deduct points.');
    }
  }, [user, updateUserBalance]);

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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signIn, signUp, signOut, deductPoints, updateUserBalance, sendPasswordResetEmail, resendConfirmationEmail }}>
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