import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

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

// Mock user data and authentication logic
const MOCK_USER: User = {
    id: 'user-123',
    email: 'test@example.com',
    balance: 1000.00
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate checking for an existing session on app load
  useEffect(() => {
    const session = sessionStorage.getItem('mock-auth-session');
    if (session) {
      setUser(MOCK_USER);
    }
    setTimeout(() => setIsLoading(false), 500); // Simulate loading delay
  }, []);

  const signIn = async (email: string, pass: string): Promise<void> => {
    console.log('Signing in with:', email, pass);
    setIsLoading(true);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simple mock validation
        if (email === MOCK_USER.email && pass === 'password') {
          setUser(MOCK_USER);
          sessionStorage.setItem('mock-auth-session', 'true');
          setIsLoading(false);
          resolve();
        } else {
          setIsLoading(false);
          reject(new Error('Invalid email or password.'));
        }
      }, 1000);
    });
  };

  const signUp = async (email: string, pass: string): Promise<void> => {
    console.log('Signing up with:', email, pass);
    setIsLoading(true);
    // In a real app, this would call an API, and the user would need to confirm their email.
    // For this mock, we just show a success message in the component.
    return new Promise(resolve => {
        setTimeout(() => {
            setIsLoading(false);
            resolve();
        }, 1000);
    });
  };

  const signOut = async (): Promise<void> => {
    setUser(null);
    sessionStorage.removeItem('mock-auth-session');
  };

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    console.log('Sending password reset to:', email);
    // Don't throw an error to prevent email enumeration
    return Promise.resolve();
  };
  
  const deductPoints = useCallback(async (amount: number): Promise<void> => {
    setUser(currentUser => {
        if (!currentUser || currentUser.balance < amount) {
            throw new Error('Insufficient points.');
        }
        return { ...currentUser, balance: currentUser.balance - amount };
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
