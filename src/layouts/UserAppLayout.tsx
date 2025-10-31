import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

const UserAppLayout = () => {
  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 gradient-bg text-theme-text-primary">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gray-50 dark:bg-slate-900">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default UserAppLayout;
