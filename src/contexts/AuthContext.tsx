import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { supabase } from '../services/supabaseClient';
import { logger } from '../lib/logger';
import type { User } from '../types';
import type { Session, PostgrestError } from '@supabase/supabase-js';
import { deductBalance } from '../services/profileService';
import { setAuthTokenGetter } from '../services/api';

/**
 * Resolve the absolute URL for API requests
 */
function resolveApiUrl(path: string): string {
  // If path is already absolute, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Get the API base URL from environment
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If VITE_API_BASE_URL is set, use it to construct absolute URL
  if (apiBaseUrl) {
    const base = apiBaseUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
  
  // Fallback to relative URL (for same-origin requests)
  return path;
}

/**
 * Small BFF helpers that ALWAYS include cookies (HttpOnly).
 */
async function bffGet<T>(url: string): Promise<T> {
  const absoluteUrl = resolveApiUrl(url);
  try {
    console.log('[BFF] GET request:', { url, absoluteUrl, hasCredentials: true });
    
    // Create a fetch request with credentials
    const fetchOptions: RequestInit = {
      credentials: 'include',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };
    
    // Log fetch options for debugging
    console.log('[BFF] Fetch options:', {
      credentials: fetchOptions.credentials,
      method: fetchOptions.method,
      headers: fetchOptions.headers,
    });
    
    const res = await fetch(absoluteUrl, fetchOptions);
    console.log('[BFF] Response:', { status: res.status, statusText: res.statusText, url: absoluteUrl });
    
    if (!res.ok) {
      // Try to parse error message from response
      try {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `GET ${url} failed: ${res.status}`);
      } catch {
        throw new Error(`GET ${url} failed: ${res.status}`);
      }
    }
    try {
      const data = await res.json() as T;
      if (url.includes('/api/auth/session')) {
        console.log('[BFF] Session response parsed:', { hasUser: !!(data as any)?.user });
      }
      return data;
    } catch (jsonError) {
      console.error('[BFF] JSON parse error:', jsonError);
      // If JSON parsing fails, return null for session endpoint
      if (url.includes('/api/auth/session')) {
        return { user: null } as T;
      }
      throw new Error(`Invalid JSON response from ${url}`);
    }
  } catch (error) {
    console.error('[BFF] Request failed:', error);
    // If fetch itself fails (network error), handle gracefully
    if (url.includes('/api/auth/session')) {
      // For session endpoint, return null user instead of throwing
      return { user: null } as T;
    }
    throw error;
  }
}

async function bffPost<T>(url: string, body?: unknown): Promise<T> {
  const absoluteUrl = resolveApiUrl(url);
  const res = await fetch(absoluteUrl, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  // BFF returns JSON on errors too
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (payload && (payload.message || payload.error)) || `POST ${url} failed: ${res.status}`;
    throw new Error(message);
  }
  return payload as T;
}

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
  // Keep these for API compatibility but do not use tokens (HttpOnly cookies instead)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const userRoles = user?.roles ?? EMPTY_ROLES;
  const accessTokenRef = useRef<string | null>(null);

  // Keep ref in sync (no logs)
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  // Register token getter ONCE — but return null to force cookie auth everywhere.
  useEffect(() => {
    setAuthTokenGetter(() => null);
    return () => {
      setAuthTokenGetter(() => null);
    };
  }, []);

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
        // Keep quiet; not critical in cookie mode
      }
    }

    return null;
  }, []);

  /**
   * IMPORTANT CHANGE:
   * Instead of reading profile directly from Supabase with a browser token,
   * we hydrate from the BFF session (HttpOnly cookies) which already returns balance & roles.
   * This keeps the rest of your function shapes intact.
   */
  const getAppUserFromSession = useCallback(
    async (_session: Session | null): Promise<User | null> => {
      try {
        const data = await bffGet<{ user: User | null }>('/api/auth/session');
        if (!data?.user) return null;

        const normalized: User = {
          id: data.user.id,
          email: data.user.email || 'No email found',
          roles: Array.isArray(data.user.roles) && data.user.roles.length
            ? data.user.roles
            : [DEFAULT_ROLE],
          balance: Number((data.user as any).balance ?? 100),
          metadata: (data.user as any).metadata ?? null,
        };

        return normalized;
      } catch (error) {
        logger.error('Failed to fetch user from BFF session', error);
        return null;
      }
    },
    []
  );

  // Initialize from BFF cookie session to survive page refresh and cross-origin
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        console.log('[AUTH] Initializing auth on page load...');
        const apiUrl = resolveApiUrl('/api/auth/session');
        console.log('[AUTH] Calling session endpoint:', apiUrl);
        
        // Debug: Check if cookies are accessible (HttpOnly cookies won't be accessible via document.cookie)
        // But we can log what cookies JS can see (non-HttpOnly ones like XSRF-TOKEN)
        try {
          const visibleCookies = document.cookie;
          console.log('[AUTH] Visible cookies (non-HttpOnly):', visibleCookies || 'none');
          if (visibleCookies.includes('XSRF-TOKEN')) {
            console.log('[AUTH] ✅ XSRF-TOKEN cookie is present');
          } else {
            console.log('[AUTH] ⚠️ XSRF-TOKEN cookie NOT found (sb-access-token is HttpOnly, so not visible here)');
          }
        } catch (e) {
          console.log('[AUTH] Could not check document.cookie:', e);
        }
        
        const data = await bffGet<{ user: User | null }>('/api/auth/session');
        if (!mounted) return;

        console.log('[AUTH] Session response:', { hasUser: !!data?.user, userId: data?.user?.id });

        if (data?.user) {
          const normalized: User = {
            id: data.user.id,
            email: data.user.email || 'No email found',
            roles: Array.isArray(data.user.roles) && data.user.roles.length
              ? data.user.roles
              : [DEFAULT_ROLE],
            balance: Number((data.user as any).balance ?? 100),
            metadata: (data.user as any).metadata ?? null,
          };
          console.log('[AUTH] User authenticated:', normalized.email);
          setUser(normalized);
          setAccessToken(null); // cookie-auth only
        } else {
          console.log('[AUTH] No user in session, user is null');
          setUser(null);
          setAccessToken(null);
        }
      } catch (error) {
        console.error('[AUTH] Session check failed:', error);
        setUser(null);
        setAccessToken(null);
      } finally {
        if (mounted) {
          console.log('[AUTH] Auth initialization complete, isLoading = false');
          setIsLoading(false);
        }
      }
    }

    void initializeAuth();

    // Keep listener minimal (no logs); on any auth change, just re-pull from BFF
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      try {
        const data = await bffGet<{ user: User | null }>('/api/auth/session');
        if (data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || 'No email found',
            roles: Array.isArray(data.user.roles) && data.user.roles.length
              ? data.user.roles
              : [DEFAULT_ROLE],
            balance: Number((data.user as any).balance ?? 100),
            metadata: (data.user as any).metadata ?? null,
          });
        } else {
          setUser(null);
        }
        setAccessToken(null);
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // SIGN IN via BFF — sets HttpOnly cookies; no tokens stored on client
  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await bffPost<{ user: User }>('/api/auth/signin', { email, password });
      setUser({
        id: result.user.id,
        email: result.user.email || 'No email found',
        roles: Array.isArray(result.user.roles) && result.user.roles.length
          ? result.user.roles
          : [DEFAULT_ROLE],
        balance: Number((result.user as any).balance ?? 100),
        metadata: (result.user as any).metadata ?? null,
      });
      setAccessToken(null);
    },
    []
  );

  // Optionally keep Supabase sign-up flow (email confirmation); does not persist token locally.
  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw new Error(error.message || 'Could not sign up user.');
    }
  }, []);

  // SIGN OUT via BFF — clears cookies; also clear any sb-* localStorage remnants
  const signOut = useCallback(async () => {
    try {
      await bffPost<{ message: string }>('/api/auth/signout');
    } catch {
      // ignore network hiccups on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch {
        // ignore
      }
    }
  }, []);

  const hasRole = useCallback(
    (rolesToCheck: string | string[]): boolean => {
      const requiredRoles = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
      if (requiredRoles.length === 0) return true;
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
      if (amount === 0) return;
      if (!user) throw new Error('User not authenticated');
      if (user.balance < amount) throw new Error('Insufficient points.');

      const result = await deductBalance(amount); // your API uses cookie auth now
      if (!result || typeof result.balance === 'undefined') {
        throw new Error('Unexpected response while deducting points.');
      }
      updateUserBalance(result.balance);
    },
    [user, updateUserBalance]
  );

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new Error(error.message || 'Could not send password reset email.');
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    try {
      const data = await bffGet<{ user: User | null }>('/api/auth/session');
      if (data?.user) {
        const normalized: User = {
          id: data.user.id,
          email: data.user.email || 'No email found',
          roles: Array.isArray(data.user.roles) && data.user.roles.length
            ? data.user.roles
            : [DEFAULT_ROLE],
          balance: Number((data.user as any).balance ?? 100),
          metadata: (data.user as any).metadata ?? null,
        };
        setUser(normalized);
        setAccessToken(null);
        return normalized;
      }
      setUser(null);
      setAccessToken(null);
      return null;
    } catch (error) {
      setUser(null);
      setAccessToken(null);
      throw error instanceof Error ? error : new Error('Could not refresh profile.');
    }
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) {
      throw new Error(error.message || 'Could not resend confirmation email.');
    }
  }, []);

  const getAccessToken = useCallback(() => null, []); // always null in cookie mode

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
        accessToken, // will be null
        getAccessToken, // returns null
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
