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
        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
      isSidebarCollapsed && 'justify-center px-2'
    );

  return (
    <aside
      className={cn(
        'flex flex-col bg-white text-gray-900 dark:bg-gray-800 dark:text-white transition-all duration-200 border-r border-gray-200 dark:border-gray-700',
        isSidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-20 items-center border-b border-gray-200 dark:border-gray-700 px-3">
        <div
          className={cn(
            'flex-1 font-bold text-gray-900 dark:text-white',
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
          className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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
              'w-full justify-start gap-3 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
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
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('availablePoints')}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {user?.balance.toFixed(2)}{' '}
              <span className="text-base font-medium text-gray-700 dark:text-gray-300">{t('points')}</span>
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="truncate text-sm text-gray-600 dark:text-gray-400" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        <Button
          type="button"
          onClick={signOut}
          variant="ghost"
          className={cn(
            'w-full items-center justify-start gap-3 text-gray-600 hover:bg-red-100 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-800/50 dark:hover:text-white',
            isSidebarCollapsed && 'justify-center'
          )}
        >
          <SignOutIcon className="h-5 w-5" />
          {!isSidebarCollapsed && <span>{t('signOut')}</span>}
        </Button>
      </div>

      <div
        className={cn(
          'border-t border-gray-200 dark:border-gray-700 p-4',
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
