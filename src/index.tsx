import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClientProvider, queryClient } from './lib/queryClient';
import { LayoutProvider } from './stores/layoutStore';
import { config } from './config';
import './input.css';
import { ObservabilityBoundary } from './components/ObservabilityBoundary';

const ErrorFallback = () => (
  <>
    <h1 className="text-3xl font-bold text-red-500">Something went wrong</h1>
    <p className="text-gray-200">We're tracking the issue. Please try again in a moment.</p>
  </>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
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
            Please ensure that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are
            correctly set.
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
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LayoutProvider>
            <LanguageProvider>
              <AuthProvider>
                <ObservabilityBoundary fallback={<ErrorFallback />}>
                  <App />
                </ObservabilityBoundary>
              </AuthProvider>
            </LanguageProvider>
          </LayoutProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppWrapper>
  );
}
