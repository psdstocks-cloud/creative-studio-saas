import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

const UserAppLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 gradient-bg text-gray-800 dark:text-gray-200">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default UserAppLayout;
