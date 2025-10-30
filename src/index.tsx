import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClientProvider, queryClient } from './lib/queryClient';
import { LayoutProvider } from './stores/layoutStore';
import { Toaster } from './components/ui/toaster';
import ErrorBoundary from './components/ErrorBoundary';
import { config } from './config';
import { supabase } from './services/supabaseClient';
import './input.css';

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  console.log('✅ Supabase client exposed to window.supabase for debugging');

  // Add helper function to check auth state
  (window as any).checkAuth = async () => {
    console.log('🔍 Checking authentication state...');

    // Check localStorage
    const authKeys = Object.keys(localStorage).filter(key =>
      key.includes('creative-studio-auth') || key.includes('supabase') || key.includes('sb-')
    );
    console.log('📦 Auth keys in localStorage:', authKeys);

    // Check Supabase session
    const { data, error } = await supabase.auth.getSession();
    console.log('🔐 Supabase session:', {
      hasSession: !!data.session,
      hasAccessToken: !!data.session?.access_token,
      tokenLength: data.session?.access_token?.length,
      userId: data.session?.user?.id,
      userEmail: data.session?.user?.email,
      error: error
    });

    // Try session endpoint
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await response.json();
      console.log('🌐 Backend session endpoint:', sessionData);
    } catch (err) {
      console.error('❌ Backend session endpoint error:', err);
    }

    return data;
  };
  console.log('✅ Run window.checkAuth() to debug authentication');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

// Check if Supabase config is available to provide a clear error message
if (!config.supabase.isAvailable) {
  root.render(
    <React.StrictMode>
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white text-center p-8">
        <div>
          <h1 className="text-3xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-gray-200 mb-2">
            The application is missing essential Supabase credentials.
          </p>
          <p className="text-gray-400">
            Please ensure that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables
            are correctly set.
          </p>
        </div>
      </div>
    </React.StrictMode>
  );
} else {
  // Disable StrictMode in production to avoid double-mounting issues
  const AppWrapper = import.meta.env.DEV ? React.StrictMode : React.Fragment;

  root.render(
    <AppWrapper>
      <ErrorBoundary>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <LayoutProvider>
              <LanguageProvider>
                <AuthProvider>
                  <App />
                  <Toaster />
                </AuthProvider>
              </LanguageProvider>
            </LayoutProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </AppWrapper>
  );
}
