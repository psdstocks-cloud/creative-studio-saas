import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout = () => {
  const { user } = useAuth();
  const roleLabel = user?.roles?.join(', ') ?? 'user';

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Admin Control Center</h1>
            <p className="text-sm text-slate-400">
              Manage orders, users, and AI workloads with full observability.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-200">{user?.email}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">{roleLabel}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-900 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
