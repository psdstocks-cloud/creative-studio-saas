import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ImageIcon, SparklesIcon, CodeBracketIcon, ServerIcon, CogIcon, SignOutIcon, WalletIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const Sidebar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  
  const navItems: NavItem[] = [
    { id: 'home', label: t('home'), icon: <HomeIcon />, path: '/' },
    { id: 'stock', label: t('stockFullSize'), icon: <ImageIcon />, path: '/stock' },
    { id: 'ai', label: t('aiGeneration'), icon: <SparklesIcon />, path: '/ai' },
    { id: 'files', label: t('filesManager'), icon: <ServerIcon />, path: '/files' },
    { id: 'api', label: t('api'), icon: <CodeBracketIcon />, path: '/api' },
    { id: 'billing', label: t('billing'), icon: <WalletIcon />, path: '/dashboard/billing' },
  ];

  const otherItems = [
    { id: 'settings', label: t('settings'), icon: <CogIcon /> },
  ];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
      <div className="h-20 flex items-center justify-center text-2xl font-bold border-b border-gray-700">
        Creative<span className="text-blue-500">SaaS</span>
      </div>
      <nav className="flex-1 mt-4">
        {navItems.map((item) => (
            <NavLink 
                key={item.id} 
                to={item.path}
                className={navLinkClasses}
            >
                {item.icon}
                <span className="ms-4">{item.label}</span>
            </NavLink>
        ))}
      </nav>
      <div className="pb-4">
        {otherItems.map((item) => (
             <button
             key={item.id}
             className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors duration-200"
           >
             {item.icon}
             <span className="ms-4">{item.label}</span>
           </button>
        ))}
      </div>
       <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-sm text-gray-400">{t('availablePoints')}</p>
          <p className="text-xl font-bold text-white">{user?.balance.toFixed(2)} <span className="text-base font-medium text-gray-300">{t('points')}</span></p>
      </div>
       <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-sm text-gray-400 truncate" title={user?.email}>{user?.email}</p>
      </div>
      <div className="p-2 border-t border-gray-700">
         <button
            onClick={signOut}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-400 hover:bg-red-800/50 hover:text-white transition-colors duration-200 rounded-md"
          >
            <SignOutIcon />
            <span className="ms-4">{t('signOut')}</span>
          </button>
      </div>
      <div className="p-4 flex justify-around border-t border-gray-700">
        <button
          onClick={() => setLanguage('en')}
          className={`font-bold py-1 px-3 rounded ${language === 'en' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          aria-pressed={language === 'en'}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('ar')}
          className={`font-bold py-1 px-3 rounded ${language === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
          aria-pressed={language === 'ar'}
        >
          AR
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;