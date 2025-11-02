import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AuthCallback from './components/AuthCallback';
import ResetPassword from './components/ResetPassword';
import Pricing from './pages/Pricing';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import UserAppLayout from './layouts/UserAppLayout';
import Home from './components/Home';
import StockDownloader from './components/StockDownloader';
import AiGenerator from './components/AiGenerator';
import ApiDocumentation from './components/ApiDocumentation';
import FilesManager from './components/FilesManager';
import Billing from './pages/Billing';
import Receipt from './pages/Receipt';
import Account from './pages/Account';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminAiJobs from './pages/admin/AdminAiJobs';
import AdminStockSources from './pages/admin/AdminStockSources';
import AdminFiles from './pages/admin/AdminFiles';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSettings from './pages/admin/AdminSettings';

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
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pricing" element={<Pricing />} />

      {isAuthenticated ? (
        <>
          <Route path="/app/*" element={<UserAppLayout />}>
            <Route index element={<Home />} />
            <Route path="stock" element={<StockDownloader />} />
            <Route path="ai" element={<AiGenerator />} />
            <Route path="files" element={<FilesManager />} />
            <Route path="api" element={<ApiDocumentation />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="billing" element={<Billing />} />
            <Route path="billing/receipt/:id" element={<Receipt />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRoles={['admin', 'ops', 'support', 'finance', 'superadmin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:userId" element={<AdminUsers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:taskId" element={<AdminOrderDetail />} />
            <Route path="aijobs" element={<AdminAiJobs />} />
            <Route path="aijobs/:jobId" element={<AdminAiJobs />} />
            <Route path="stock-sources" element={<AdminStockSources />} />
            <Route path="files" element={<AdminFiles />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
};

export default App;
