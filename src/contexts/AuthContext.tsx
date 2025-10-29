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
  refreshProfile: () => Promise<User | null>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  userRoles: string[];
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
const DEFAULT_ROLE = 'user';
const EMPTY_ROLES: string[] = [];

const normalizeRoleInput = (input: unknown): string[] => {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map((role) => (typeof role === 'string' ? role : String(role)))
      .map((role) => role.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [String(input)];
};

const extractRolesFromSession = (sessionUser: Session['user']): string[] => {
  const rawRoles = [
    ...normalizeRoleInput(sessionUser.app_metadata?.roles),
    ...normalizeRoleInput(sessionUser.app_metadata?.role),
    ...normalizeRoleInput(sessionUser.user_metadata?.roles),
    ...normalizeRoleInput(sessionUser.user_metadata?.role),
  ];

  const normalized = new Set<string>(
    rawRoles.map((role) => role.toLowerCase())
  );

  normalized.add(DEFAULT_ROLE);

  return Array.from(normalized);
};

const buildFallbackUser = (sessionUser: Session['user']): User => ({
  id: sessionUser.id,
  email: sessionUser.email || 'No email found',
  balance: 100,
  roles: extractRolesFromSession(sessionUser),
});

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
  const userRoles = user?.roles ?? EMPTY_ROLES;

  const getAppUserFromSession = useCallback(async (session: Session | null): Promise<User | null> => {
    if (!session?.user) {
        return null;
    }

    try {
        console.log("AuthProvider: Fetching profile for user", session.user.id);

        let lastError: ProfileFetchError | Error | null = null;
        const fallbackUser = buildFallbackUser(session.user);

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

                        return { ...fallbackUser, balance: 100 };
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
                    break;
                }

                console.log('AuthProvider: Successfully fetched profile for user', {
                    attempt,
                    userId: session.user.id,
                });

                return {
                    ...fallbackUser,
                    balance: Number(profile?.balance ?? fallbackUser.balance),
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
                    lastError = createProfileFetchError('Profile fetch timeout after 30 seconds', 'timeout', {
                        original: error,
                    });
                    break;
                }

                console.error('AuthProvider: Unexpected exception during profile fetch', {
                    attempt,
                    error,
                });
                lastError = error instanceof Error
                    ? error
                    : createProfileFetchError('Profile fetch failed due to unexpected exception', 'unknown', {
                        original: error,
                    });
                break;
            } finally {
                clearTimeout(timeoutId);
            }
        }

        if (lastError) {
            const failureType = (lastError as ProfileFetchError)?.failureType ?? 'unknown';
            console.warn('AuthProvider: Falling back to default profile after fetch failures', {
                userId: session.user.id,
                failureType,
            });
            return fallbackUser;
        }

        console.warn('AuthProvider: Profile fetch returned no data, using fallback profile', {
            userId: session.user.id,
        });
        return fallbackUser;
    } catch (error: any) {
        console.error("AuthProvider: Error fetching profile:", error);
        return session?.user ? buildFallbackUser(session.user) : null;
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

                    if (session?.user) {
                        console.warn('AuthProvider: Using fallback profile during initialization due to fetch failure', {
                            failureType,
                            userId: session.user.id,
                        });
                        setUser(buildFallbackUser(session.user));
                    } else if (failureType !== 'timeout' && failureType !== 'permission') {
                        console.warn('AuthProvider: Signing out due to unrecoverable profile fetch error');
                        await supabase.auth.signOut();
                        setUser(null);
                    } else {
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

                    if (session?.user) {
                        console.warn('AuthProvider: Using fallback profile after auth state change failure', {
                            failureType,
                            userId: session.user.id,
                        });
                        setUser(buildFallbackUser(session.user));
                    } else if (failureType !== 'timeout' && failureType !== 'permission') {
                        console.warn('AuthProvider: Signing out after auth state change due to profile fetch error');
                        await supabase.auth.signOut();
                        setUser(null);
                    } else {
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

    let session: Session | null = data.session ?? null;

    try {
      // Ensure the user's profile can be fetched right after sign-in so any
      // profile-related issues surface immediately instead of silently failing.
      session = session ?? (await supabase.auth.getSession()).data.session;

      if (!session) {
        throw new Error('No active session found after sign in.');
      }

      const appUser = await getAppUserFromSession(session);

      setUser(appUser);
    } catch (profileError: any) {
      const failureType = (profileError as ProfileFetchError)?.failureType ?? 'unknown';
      console.error('AuthProvider: Failed to resolve profile after sign in', profileError);

      if (session?.user) {
        console.warn('AuthProvider: Using fallback profile after sign-in due to profile error', {
          failureType,
          userId: session.user.id,
        });
        setUser(buildFallbackUser(session.user));
        return;
      }

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

  const hasRole = useCallback((rolesToCheck: string | string[]): boolean => {
    const requiredRoles = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];

    if (requiredRoles.length === 0) {
      return true;
    }

    const normalizedUserRoles = new Set(userRoles.map((role) => role.toLowerCase()));

    return requiredRoles.some((role) => normalizedUserRoles.has(role.toLowerCase()));
  }, [userRoles]);

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

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        setUser(null);
        return null;
    }

    try {
        const appUser = await getAppUserFromSession(session);
        setUser(appUser);
        return appUser;
    } catch (profileError) {
        const failureType = (profileError as ProfileFetchError)?.failureType ?? 'unknown';
        console.error('AuthProvider: Failed to refresh user profile', profileError);

        if (session?.user) {
            console.warn('AuthProvider: Using fallback profile after refresh failure', {
                failureType,
                userId: session.user.id,
            });
            const fallbackUser = buildFallbackUser(session.user);
            setUser(fallbackUser);
            return fallbackUser;
        }

        if (failureType !== 'timeout' && failureType !== 'permission') {
            await supabase.auth.signOut();
        }

        setUser(null);
        throw profileError instanceof Error
            ? profileError
            : new Error('Could not refresh profile.');
    }
  }, [getAppUserFromSession]);

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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signIn, signUp, signOut, deductPoints, updateUserBalance, refreshProfile, sendPasswordResetEmail, resendConfirmationEmail, hasRole, userRoles }}>
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