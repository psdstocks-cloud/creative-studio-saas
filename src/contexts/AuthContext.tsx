import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { supabase } from '../services/supabaseClient';
import type { User } from '../types';
import { deductBalance } from '../services/profileService';
import { fetchBffSession, destroyBffSession, type BffSessionResponse } from '../services/bffSession';
import { apiFetch } from '../services/api';

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

const EMPTY_ROLES: string[] = [];

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const userRoles = user?.roles ?? EMPTY_ROLES;


  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleInitializationTimeout = () => {
      if (!mounted) {
        return;
      }

      console.warn('Auth initialization timed out after 15 seconds');
      setIsLoading(false);
    };

    async function initializeAuth() {
      try {
        timeoutId = setTimeout(handleInitializationTimeout, 15000);

        // Check for session via cookies via BFF endpoint
        const bffSession = await fetchBffSession();

        if (!mounted) {
          return;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        if (bffSession?.user) {
          // User is authenticated via cookies
          const appUser: User = {
            id: bffSession.user.id,
            email: bffSession.user.email,
            roles: bffSession.user.roles,
            metadata: bffSession.user.metadata,
            balance: bffSession.user.balance || 100, // Use balance from session
          };

          // Set user immediately
          setUser(appUser);
          setIsLoading(false);
        } else {
          setUser(null);
          setAccessToken(null);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('AuthProvider: Error initializing auth', e);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        if (!mounted) {
          return;
        }

        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    }

    void initializeAuth();

    // Note: onAuthStateChange not used with cookie-based auth
    // All auth state is managed via cookies and session endpoint

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      // Use backend sign-in endpoint that sets httpOnly cookies
      const response = await apiFetch('/api/auth/signin', {
        method: 'POST',
        body: { email, password },
        auth: false,
      }) as BffSessionResponse;

      if (!response || !response.user) {
        throw new Error('Invalid credentials. Please try again.');
      }

      // Convert BFF user to app user
      const appUser: User = {
        id: response.user.id,
        email: response.user.email,
        roles: response.user.roles,
        metadata: response.user.metadata,
        balance: response.user.balance || 100, // Use balance from response
      };

      // Set the user immediately
      setUser(appUser);
    },
    []
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
      // Call backend signout endpoint which clears cookies
      await destroyBffSession();
      
      // Clear local state
      setUser(null);
      setAccessToken(null);
      
      // Also clear Supabase session if any (for other auth flows like password reset)
      try {
        await supabase.auth.signOut();
      } catch (error: any) {
        console.warn('AuthProvider: Error clearing Supabase session', error);
      }
    } catch (error: any) {
      console.error('Unexpected error during sign out', error);
      // Still clear local state on error
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
    // Refresh profile via BFF session endpoint
    try {
      const bffSession = await fetchBffSession();
      
      if (!bffSession?.user) {
        setUser(null);
        setAccessToken(null);
        return null;
      }

      const appUser: User = {
        id: bffSession.user.id,
        email: bffSession.user.email,
        roles: bffSession.user.roles,
        metadata: bffSession.user.metadata,
        balance: bffSession.user.balance || 100,
      };

      setUser(appUser);
      return appUser;
    } catch (error) {
      console.error('AuthProvider: Failed to refresh profile', error);
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