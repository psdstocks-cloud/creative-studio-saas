import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { supabase } from '../services/supabaseClient';
import { logger } from '../lib/logger';
import type { User } from '../types';
import type { Session, PostgrestError } from '@supabase/supabase-js';
import { deductBalance } from '../services/profileService';
import { setAuthTokenGetter } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deductPoints: (amount: number) => Promise<void>;
  updateUserBalance: (balance: number) => void;
  refreshProfile: () => Promise<User | null>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  userRoles: string[];
  accessToken: string | null;
  getAccessToken: () => string | null;
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

const PROFILE_FETCH_TIMEOUT_MS = 5000;
const PROFILE_FETCH_RETRY_DELAY_MS = 500;
const MAX_PROFILE_FETCH_ATTEMPTS = 2;
const DEFAULT_ROLE = 'user';
const EMPTY_ROLES: string[] = [];
const SUPABASE_STORAGE_KEYS = ['creative-studio-auth', 'supabase.auth.token'];

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

  const normalized = new Set<string>(rawRoles.map((role) => role.toLowerCase()));
  normalized.add(DEFAULT_ROLE);

  return Array.from(normalized);
};

const buildFallbackUser = (sessionUser: Session['user']): User => ({
  id: sessionUser.id,
  email: sessionUser.email || 'No email found',
  balance: 100,
  roles: extractRolesFromSession(sessionUser),
  metadata: null,
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

  const combined =
    `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();

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
  meta: {
    code?: string;
    details?: string | null;
    hint?: string | null;
    status?: number;
    original?: unknown;
  } = {}
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const userRoles = user?.roles ?? EMPTY_ROLES;

  // Register token getter with API client
  useEffect(() => {
    console.log('🔐 Registering auth token getter', { 
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0 
    });
    
    setAuthTokenGetter(() => accessToken);
    
    return () => {
      console.log('🔐 Unregistering auth token getter');
      setAuthTokenGetter(() => null);
    };
  }, [accessToken]);

  const getStoredSession = useCallback((): Session | null => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    for (const key of SUPABASE_STORAGE_KEYS) {
      try {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) {
          continue;
        }

        const parsedValue: unknown = JSON.parse(rawValue);
        const candidateSessions: Array<unknown> = [];

        if (parsedValue && typeof parsedValue === 'object') {
          const recordValue = parsedValue as Record<string, unknown>;

          if ('currentSession' in recordValue) {
            candidateSessions.push((recordValue as { currentSession?: unknown }).currentSession);
          }

          if ('session' in recordValue) {
            candidateSessions.push((recordValue as { session?: unknown }).session);
          }

          candidateSessions.push(recordValue);
        }

        for (const candidate of candidateSessions) {
          if (candidate && typeof candidate === 'object') {
            const potentialSession = candidate as Partial<Session>;
            if (potentialSession.user && typeof potentialSession.user === 'object') {
              return potentialSession as Session;
            }
          }
        }
      } catch (error) {
        console.warn('AuthProvider: Failed to parse stored Supabase session', { key, error });
      }
    }

    return null;
  }, []);

  const getAppUserFromSession = useCallback(
    async (session: Session | null): Promise<User | null> => {
      if (!session?.user) {
        return null;
      }

      try {
        logger.debug('Fetching profile for user', { userId: session.user.id });

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

            if (profileError) {
              const failureType = classifyPostgrestError(profileError);

              logger.error('Error fetching user profile', profileError, {
                attempt,
                failureType,
                code: profileError.code,
                status,
              });

              if (failureType === 'missing') {
                logger.info('Creating missing profile for user', { userId: session.user.id });
                
                const { error: insertError, status: insertStatus } = await supabase
                  .from('profiles')
                  .insert([{ id: session.user.id, balance: 100 }] as any);

                if (insertError) {
                  logger.error('Error creating profile', insertError, {
                    code: insertError.code,
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
                logger.warn('Retrying profile fetch due to unexpected error', {
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

            logger.debug('Successfully fetched profile for user', {
              attempt,
              userId: session.user.id,
            });

            return {
              ...fallbackUser,
              balance: profile ? Number(profile.balance ?? fallbackUser.balance) : fallbackUser.balance,
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
              lastError = createProfileFetchError(
                'Profile fetch timeout after 5 seconds',
                'timeout',
                {
                  original: error,
                }
              );
              break;
            }

            console.error('AuthProvider: Unexpected exception during profile fetch', {
              attempt,
              error,
            });
            lastError =
              error instanceof Error
                ? error
                : new Error('Unexpected error while fetching profile.');

            if (attempt < MAX_PROFILE_FETCH_ATTEMPTS) {
              await new Promise((resolve) =>
                setTimeout(resolve, PROFILE_FETCH_RETRY_DELAY_MS * attempt)
              );
              continue;
            }
            break;
          } finally {
            clearTimeout(timeoutId);
          }
        }

        const errorToReport =
          lastError instanceof Error
            ? lastError
            : new Error('Failed to fetch profile after multiple attempts.');

        if (lastError && 'failureType' in lastError) {
          const typedError = lastError as ProfileFetchError;

          if (typedError.failureType === 'permission') {
            console.warn(
              'AuthProvider: Profile fetch failed due to permission issues. Using fallback user.',
              {
                userId: session.user.id,
                code: typedError.code,
              }
            );
            return fallbackUser;
          } else if (typedError.failureType === 'timeout') {
            console.warn(
              'AuthProvider: Profile fetch timed out. Using fallback user.',
              {
                userId: session.user.id,
              }
            );
            return fallbackUser;
          }
        }

        console.error('AuthProvider: Profile fetch failed with unrecoverable error', {
          error: errorToReport.message,
          userId: session.user.id,
        });

        throw errorToReport;
      } catch (error: any) {
        logger.error('Unexpected exception in getAppUserFromSession', error);
        throw error instanceof Error
          ? error
          : new Error('Unexpected exception while fetching user profile.');
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // CHANGED: Get session directly from Supabase (includes access_token)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error('AuthProvider: Error getting session', error);
          setUser(null);
          setAccessToken(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('🔐 Session found, extracting token', {
            userId: session.user.id,
            hasToken: !!session.access_token,
            tokenLength: session.access_token?.length || 0
          });

          const appUser = await getAppUserFromSession(session);
          
          if (appUser) {
            setUser(appUser);
            // CHANGED: Store the actual access token from Supabase
            setAccessToken(session.access_token);
          } else {
            setUser(null);
            setAccessToken(null);
          }
        } else {
          setUser(null);
          setAccessToken(null);
        }
        
        setIsLoading(false);
      } catch (e) {
        console.error('AuthProvider: Error initializing auth', e);

        if (!mounted) {
          return;
        }

        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    }

    void initializeAuth();

    // CHANGED: Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, {
          hasSession: !!session,
          hasToken: !!session?.access_token
        });

        if (session?.user) {
          const appUser = await getAppUserFromSession(session);
          if (appUser) {
            setUser(appUser);
            setAccessToken(session.access_token);
          } else {
            setUser(null);
            setAccessToken(null);
          }
        } else {
          setUser(null);
          setAccessToken(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [getAppUserFromSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        // CHANGED: Use Supabase directly to get access token
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message || 'Invalid credentials. Please try again.');
        }

        if (!data.session || !data.user) {
          throw new Error('Invalid credentials. Please try again.');
        }

        console.log('🔐 Sign in successful', {
          userId: data.user.id,
          hasToken: !!data.session.access_token,
          tokenLength: data.session.access_token?.length || 0
        });

        const appUser = await getAppUserFromSession(data.session);
        
        if (!appUser) {
          throw new Error('Failed to load user profile.');
        }

        setUser(appUser);
        // CHANGED: Store the actual access token
        setAccessToken(data.session.access_token);

      } catch (error: any) {
        console.error('AuthProvider: Sign in error', error);
        const message = error?.message || 'Could not complete sign in.';
        throw new Error(message);
      }
    },
    [getAppUserFromSession]
  );

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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }

      setUser(null);
      setAccessToken(null);
      
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Failed to clear localStorage during sign out', e);
      }
    } catch (error: any) {
      console.error('Unexpected error during sign out', error);
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const hasRole = useCallback(
    (rolesToCheck: string | string[]): boolean => {
      const requiredRoles = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];

      if (requiredRoles.length === 0) {
        return true;
      }

      const normalizedUserRoles = new Set(userRoles.map((role) => role.toLowerCase()));

      return requiredRoles.some((role) => normalizedUserRoles.has(role.toLowerCase()));
    },
    [userRoles]
  );

  const updateUserBalance = useCallback((balance: number) => {
    setUser((prevUser) => (prevUser ? { ...prevUser, balance: Number(balance) } : prevUser));
  }, []);

  const deductPoints = useCallback(
    async (amount: number): Promise<void> => {
      if (amount < 0) {
        throw new Error('Amount to deduct must be non-negative.');
      }

      if (amount === 0) {
        return;
      }

      if (!user) {
        throw new Error('User not authenticated');
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
    },
    [user, updateUserBalance]
  );

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
    try {
      // CHANGED: Get session directly from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (session?.user) {
        const appUser = await getAppUserFromSession(session);
        
        if (appUser) {
          setUser(appUser);
          setAccessToken(session.access_token);
          return appUser;
        }
      }
      
      setUser(null);
      setAccessToken(null);
      return null;
    } catch (error) {
      console.error('AuthProvider: Failed to refresh user profile', error);
      setUser(null);
      setAccessToken(null);
      throw error instanceof Error ? error : new Error('Could not refresh profile.');
    }
  }, [getAppUserFromSession]);

  const resendConfirmationEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      console.error('Error resending confirmation email:', error.message);
      throw new Error(error.message || 'Could not resend confirmation email.');
    }
  }, []);

  const getAccessToken = useCallback(() => accessToken, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        deductPoints,
        updateUserBalance,
        refreshProfile,
        sendPasswordResetEmail,
        resendConfirmationEmail,
        hasRole,
        userRoles,
        accessToken,
        getAccessToken,
      }}
    >
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