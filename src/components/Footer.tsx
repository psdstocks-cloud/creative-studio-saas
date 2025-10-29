import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>© {new Date().getFullYear()} CreativeSaaS. All Rights Reserved.</span>
        <div className="flex items-center space-x-4 rtl:space-x-reverse mt-2 sm:mt-0">
          <a href="#" className="hover:text-blue-500 transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-blue-500 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-blue-500 transition-colors">
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
