import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ImageIcon,
  SparklesIcon,
  CodeBracketIcon,
  ServerIcon,
  CogIcon,
  SignOutIcon,
  WalletIcon,
  TagIcon,
  MenuIcon,
  UserCircleIcon,
} from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { useLayoutStore } from '../stores/layoutStore';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const Sidebar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();

  const navItems: NavItem[] = [
    { id: 'home', label: t('home'), icon: <HomeIcon className="h-5 w-5" />, path: '/app' },
    {
      id: 'stock',
      label: t('stockFullSize'),
      icon: <ImageIcon className="h-5 w-5" />,
      path: '/app/stock',
    },
    {
      id: 'ai',
      label: t('aiGeneration'),
      icon: <SparklesIcon className="h-5 w-5" />,
      path: '/app/ai',
    },
    {
      id: 'files',
      label: t('filesManager'),
      icon: <ServerIcon className="h-5 w-5" />,
      path: '/app/files',
    },
    { id: 'api', label: t('api'), icon: <CodeBracketIcon className="h-5 w-5" />, path: '/app/api' },
    {
      id: 'pricing',
      label: t('pricing'),
      icon: <TagIcon className="h-5 w-5" />,
      path: '/app/pricing',
    },
    {
      id: 'billing',
      label: t('billing'),
      icon: <WalletIcon className="h-5 w-5" />,
      path: '/app/billing',
    },
    {
      id: 'account',
      label: t('account'),
      icon: <UserCircleIcon className="h-5 w-5" />,
      path: '/app/account',
    },
  ];

  const otherItems: NavItem[] = [
    { id: 'settings', label: t('settings'), icon: <CogIcon className="h-5 w-5" />, path: '#' },
  ];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
      isActive
        ? 'bg-blue-600 text-white dark:bg-blue-500'
        : 'text-theme-text-secondary hover:bg-theme-bg-tertiary dark:hover:bg-slate-700 hover:text-theme-text-primary',
      isSidebarCollapsed && 'justify-center px-2'
    );

  return (
    <aside
      className={cn(
        'flex flex-col bg-theme-bg-primary text-theme-text-primary border-r border-theme-border transition-all duration-200',
        isSidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-20 items-center border-b border-theme-border px-3">
        <div
          className={cn(
            'flex-1 font-bold text-theme-text-primary',
            isSidebarCollapsed ? 'text-xl text-center' : 'text-2xl'
          )}
        >
          {isSidebarCollapsed ? (
            <span>CS</span>
          ) : (
            <span>
              Creative<span className="text-blue-500">SaaS</span>
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="text-theme-text-secondary hover:text-theme-text-primary"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </div>

      <nav className={cn('flex-1 space-y-1 px-2 py-4', isSidebarCollapsed && 'px-1')}>
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={navLinkClasses}
            end={item.path === '/app'}
          >
            <span
              className={cn('flex items-center justify-center', isSidebarCollapsed ? '' : 'me-3')}
            >
              {item.icon}
            </span>
            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4">
        {otherItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary dark:hover:bg-slate-700',
              isSidebarCollapsed && 'justify-center'
            )}
          >
            <span className="flex items-center justify-center">{item.icon}</span>
            {!isSidebarCollapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </div>

      {!isSidebarCollapsed && (
        <>
          <div className="border-t border-theme-border px-4 py-3">
            <p className="text-sm text-theme-text-secondary">{t('availablePoints')}</p>
            <p className="text-xl font-bold text-theme-text-primary">
              {user?.balance.toFixed(2)}{' '}
              <span className="text-base font-medium text-theme-text-secondary">{t('points')}</span>
            </p>
          </div>
          <div className="border-t border-theme-border px-4 py-3">
            <p className="truncate text-sm text-theme-text-secondary" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </>
      )}

      <div className="border-t border-theme-border p-2">
        <Button
          type="button"
          onClick={signOut}
          variant="ghost"
          className={cn(
            'w-full items-center justify-start gap-3 text-theme-text-secondary hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-800/50 dark:hover:text-white',
            isSidebarCollapsed && 'justify-center'
          )}
        >
          <SignOutIcon className="h-5 w-5" />
          {!isSidebarCollapsed && <span>{t('signOut')}</span>}
        </Button>
      </div>

      <div
        className={cn(
          'border-t border-theme-border p-4',
          isSidebarCollapsed ? 'flex flex-col gap-2' : 'flex items-center justify-around'
        )}
      >
        <ThemeToggle />
        <Button
          type="button"
          onClick={() => setLanguage('en')}
          variant={language === 'en' ? 'default' : 'ghost'}
          size="sm"
          className={cn(isSidebarCollapsed ? 'w-full justify-center' : 'px-4')}
          aria-pressed={language === 'en'}
        >
          EN
        </Button>
        <Button
          type="button"
          onClick={() => setLanguage('ar')}
          variant={language === 'ar' ? 'default' : 'ghost'}
          size="sm"
          className={cn(isSidebarCollapsed ? 'w-full justify-center' : 'px-4')}
          aria-pressed={language === 'ar'}
        >
          AR
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
