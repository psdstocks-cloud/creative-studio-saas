import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

const AdminLayout = () => {
  const { user } = useAuth();
  const roleLabel = user?.roles?.join(', ') ?? 'user';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 transition-colors">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-6 py-4 backdrop-blur transition-colors">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white transition-colors">
              Admin Control Center
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 transition-colors">
              Manage orders, users, and AI workloads with full observability.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle for Admin */}
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200 transition-colors">
                {user?.email}
              </p>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 transition-colors">
                {roleLabel}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-900 px-6 py-6 transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
