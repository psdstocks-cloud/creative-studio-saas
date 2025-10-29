import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import * as authService from '../services/authService';


// This interface defines the user object used throughout the app.
interface User {
  id: string;
  email: string;
  balance: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  deductPoints: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetches extended user profile data (e.g., balance) from a 'profiles' table in Supabase.
  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data, error } = await authService.fetchUserProfileFromDb(supabaseUser);
      
      if (error) {
        console.error('Error fetching user profile:', error);
        // If profile doesn't exist, we can still create a user object with default balance.
        return {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          balance: 0,
        };
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        balance: data.balance || 0,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  // Effect to check for an active session on mount and listen for auth state changes.
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await authService.getSupabaseSession();
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        }
      } catch (e) {
        console.error("AuthContext: Cannot get session.", e);
      } finally {
        setIsLoading(false);
      }
    };
    getSession();

    const { data: authListener } = authService.onSupabaseAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        } else {
          setUser(null);
        }
        if (isLoading) setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, isLoading]);

  const signIn = async (email: string, pass: string) => {
    const { error } = await authService.signInUser(email, pass);
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string) => {
    const { error } = await authService.signUpUser(email, pass);
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await authService.signOutUser();
    if (error) throw error;
  };

  const sendPasswordResetEmail = async (email: string) => {
    const { error } = await authService.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const deductPoints = useCallback(async (amount: number): Promise<void> => {
    if (amount < 0) {
        throw new Error('Amount to deduct must be non-negative.');
    }

    setUser(currentUser => {
        if (!currentUser || currentUser.balance < amount) {
            throw new Error('Insufficient points.');
        }
        const newBalance = currentUser.balance - amount;

        // TODO: In a real app, this update should be done securely via a Supabase Edge Function
        // to prevent client-side manipulation. For this demo, we only update the local state.
        // Example: await supabase.rpc('deduct_points', { amount_to_deduct: amount });
        
        console.log(`Deducting ${amount} points. New balance (local state): ${newBalance}`);
        return { ...currentUser, balance: newBalance };
    });
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    sendPasswordResetEmail,
    deductPoints
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};