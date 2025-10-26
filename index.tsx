import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { config } from './config';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

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
            Please ensure that <code className="bg-gray-700 p-1 rounded font-mono">SUPABASE_URL</code> and{' '}
            <code className="bg-gray-700 p-1 rounded font-mono">SUPABASE_ANON_KEY</code> environment variables are
            correctly set in your build environment.
          </p>
        </div>
      </div>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
