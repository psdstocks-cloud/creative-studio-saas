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
import { deductBalance } from '../services/profileService';

// Simple helper to call BFF with cookies
async function bffGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function bffPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = (err && err.message) || `POST ${url} failed: ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const DEFAULT_ROLE = 'user';
const EMPTY_ROLES: string[] = [];

const normalizeRoleInput = (input: unknown): string[] => {
  if (!input) return [];
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

const hasRoleInternal = (userRoles: string[], rolesToCheck: string | string[]) => {
  const required = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
  if (required.length === 0) return true;
  const set = new Set(userRoles.map((r) => r.toLowerCase()));
  return required.some((r) => set.has(r.toLowerCase()));
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userRoles = user?.roles ?? EMPTY_ROLES;

  // ---- Init from BFF cookie session
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await bffGet<{ user: User | null }>('/api/auth/session');
        if (!mounted) return;

        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            roles: data.user.roles && data.user.roles.length
              ? data.user.roles
              : [DEFAULT_ROLE],
            metadata: data.user.metadata ?? null,
            balance: Number(data.user.balance ?? 100),
          });
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ---- Actions

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await bffPost<{ user: User }>('/api/auth/signin', { email, password });
    setUser({
      id: result.user.id,
      email: result.user.email,
      roles: result.user.roles && result.user.roles.length
        ? result.user.roles
        : [DEFAULT_ROLE],
      metadata: result.user.metadata ?? null,
      balance: Number(result.user.balance ?? 100),
    });
  }, []);

  // Keep Supabase-only sign up (email confirmation flow). This does not persist tokens locally.
  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message || 'Could not sign up user.');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await bffPost<{ message: string }>('/api/auth/signout');
    } catch (e) {
      // ignore network hiccups on logout
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (rolesToCheck: string | string[]): boolean => hasRoleInternal(userRoles, rolesToCheck),
    [userRoles]
  );

  const updateUserBalance = useCallback((balance: number) => {
    setUser((prev) => (prev ? { ...prev, balance: Number(balance) } : prev));
  }, []);

  const deductPoints = useCallback(
    async (amount: number): Promise<void> => {
      if (amount < 0) throw new Error('Amount to deduct must be non-negative.');
      if (amount === 0) return;
      if (!user) throw new Error('User not authenticated');
      if (user.balance < amount) throw new Error('Insufficient points.');

      const result = await deductBalance(amount); // cookie-auth API
      if (!result || typeof result.balance === 'undefined') {
        throw new Error('Unexpected response while deducting points.');
      }
      updateUserBalance(result.balance);
    },
    [user, updateUserBalance]
  );

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    try {
      const data = await bffGet<{ user: User | null }>('/api/auth/session');
      if (data.user) {
        const normalized: User = {
          id: data.user.id,
          email: data.user.email,
          roles: data.user.roles && data.user.roles.length
            ? data.user.roles
            : [DEFAULT_ROLE],
          metadata: data.user.metadata ?? null,
          balance: Number(data.user.balance ?? 100),
        };
        setUser(normalized);
        return normalized;
      }
      setUser(null);
      return null;
    } catch (e) {
      setUser(null);
      throw e instanceof Error ? e : new Error('Could not refresh profile.');
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new Error(error.message || 'Could not send password reset email.');
    }
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      throw new Error(error.message || 'Could not resend confirmation email.');
    }
  }, []);

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
