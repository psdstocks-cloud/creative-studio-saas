import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  SparklesIcon,
  ServerIcon,
  ImageIcon,
  LinkIcon,
  CheckCircleIcon,
  CogIcon,
  SignOutIcon,
} from '../icons/Icons';
import { useAuth } from '../../contexts/AuthContext';

interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const AdminSidebar = () => {
  const { signOut, user } = useAuth();

  const navItems: AdminNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: <HomeIcon /> },
    { id: 'users', label: 'Users', path: '/admin/users', icon: <ServerIcon /> },
    { id: 'orders', label: 'Orders', path: '/admin/orders', icon: <ImageIcon /> },
    { id: 'ai-jobs', label: 'AI Jobs', path: '/admin/aijobs', icon: <SparklesIcon /> },
    { id: 'stock-sources', label: 'Stock Sources', path: '/admin/stock-sources', icon: <ServerIcon /> },
    { id: 'files', label: 'Files', path: '/admin/files', icon: <LinkIcon /> },
    { id: 'audit', label: 'Audit Log', path: '/admin/audit', icon: <CheckCircleIcon /> },
    { id: 'settings', label: 'Settings', path: '/admin/settings', icon: <CogIcon /> },
  ];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
      isActive ? 'bg-blue-500/10 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <aside className="flex w-64 flex-col bg-slate-950/70 border-r border-slate-800/80">
      <div className="flex h-20 items-center justify-center border-b border-slate-800 text-lg font-semibold tracking-tight">
        Creative<span className="text-blue-400">Admin</span>
      </div>
      <div className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.id} to={item.path} className={navLinkClasses} end={item.path === '/admin'}>
            <span className="mr-3 h-5 w-5 text-slate-400">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="border-t border-slate-800 px-4 py-4 text-xs text-slate-500">
        <p className="truncate font-medium text-slate-300">{user?.email}</p>
        <p className="mt-1 truncate uppercase tracking-wide">{user?.roles?.join(', ') ?? 'user'}</p>
      </div>
      <div className="border-t border-slate-800 px-4 py-4">
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-red-600/80 hover:text-white"
        >
          <SignOutIcon className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
