import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import StockDownloader from './components/StockDownloader';
import AiGenerator from './components/AiGenerator';
import ApiDocumentation from './components/ApiDocumentation';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import AuthCallback from './components/AuthCallback';
import FilesManager from './components/FilesManager';
import ResetPassword from './components/ResetPassword';

const App = () => {
  const { language } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 gradient-bg text-gray-800 dark:text-gray-200">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stock" element={<StockDownloader />} />
            <Route path="/ai" element={<AiGenerator />} />
            <Route path="/files" element={<FilesManager />} />
            <Route path="/api" element={<ApiDocumentation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default App;