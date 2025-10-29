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
  MenuIcon,
} from '../icons/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { useLayoutStore } from '../../stores/layoutStore';
import { cn } from '../../lib/utils';

interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const AdminSidebar = () => {
  const { signOut, user } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();

  const navItems: AdminNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: <HomeIcon className="h-5 w-5" /> },
    { id: 'users', label: 'Users', path: '/admin/users', icon: <ServerIcon className="h-5 w-5" /> },
    { id: 'orders', label: 'Orders', path: '/admin/orders', icon: <ImageIcon className="h-5 w-5" /> },
    { id: 'ai-jobs', label: 'AI Jobs', path: '/admin/aijobs', icon: <SparklesIcon className="h-5 w-5" /> },
    { id: 'stock-sources', label: 'Stock Sources', path: '/admin/stock-sources', icon: <ServerIcon className="h-5 w-5" /> },
    { id: 'files', label: 'Files', path: '/admin/files', icon: <LinkIcon className="h-5 w-5" /> },
    { id: 'audit', label: 'Audit Log', path: '/admin/audit', icon: <CheckCircleIcon className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', path: '/admin/settings', icon: <CogIcon className="h-5 w-5" /> },
  ];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
      isActive ? 'bg-blue-500/10 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
      isSidebarCollapsed && 'justify-center px-2',
    );

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-slate-800/80 bg-slate-950/70 text-slate-100 transition-all duration-200',
        isSidebarCollapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex h-20 items-center border-b border-slate-800 px-3">
        <div className={cn('flex-1 font-semibold tracking-tight', isSidebarCollapsed ? 'text-lg text-center' : 'text-lg')}>
          {isSidebarCollapsed ? (
            <span>Admin</span>
          ) : (
            <span>
              Creative<span className="text-blue-400">Admin</span>
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="text-slate-300 hover:text-white"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className={cn('flex-1 space-y-1 px-2 py-4', isSidebarCollapsed && 'px-1')}>
        {navItems.map((item) => (
          <NavLink key={item.id} to={item.path} className={navLinkClasses} end={item.path === '/admin'}>
            <span className={cn('flex items-center justify-center', isSidebarCollapsed ? '' : 'me-3')}>{item.icon}</span>
            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </div>

      {!isSidebarCollapsed && (
        <div className="border-t border-slate-800 px-4 py-4 text-xs text-slate-400">
          <p className="truncate font-medium text-slate-200">{user?.email}</p>
          <p className="mt-1 truncate uppercase tracking-wide">{user?.roles?.join(', ') ?? 'user'}</p>
        </div>
      )}

      <div className="border-t border-slate-800 px-3 py-4">
        <Button
          type="button"
          onClick={signOut}
          variant="ghost"
          className={cn(
            'w-full items-center justify-start gap-3 text-slate-300 hover:bg-red-600/80 hover:text-white',
            isSidebarCollapsed && 'justify-center',
          )}
        >
          <SignOutIcon className="h-5 w-5" />
          {!isSidebarCollapsed && <span>Sign out</span>}
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
