import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-3d group relative"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={isDark}
    >
      {/* Glassmorphism container with 3D effect */}
      <div className="relative flex items-center justify-between w-16 h-8 rounded-full overflow-hidden
                      bg-gradient-to-br from-gray-200/80 to-gray-300/80 dark:from-slate-700/80 dark:to-slate-800/80
                      backdrop-blur-xl border border-white/20 dark:border-slate-600/30
                      shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                      transition-all duration-500 ease-in-out
                      hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]
                      hover:scale-105 active:scale-95">

        {/* Sun icon (visible in light mode) */}
        <div className={`absolute left-1.5 transition-all duration-500 ${
          isDark ? 'opacity-0 -translate-x-2 scale-75' : 'opacity-100 translate-x-0 scale-100'
        }`}>
          <Sun className="w-4 h-4 text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
        </div>

        {/* Moon icon (visible in dark mode) */}
        <div className={`absolute right-1.5 transition-all duration-500 ${
          isDark ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-2 scale-75'
        }`}>
          <Moon className="w-4 h-4 text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]" />
        </div>

        {/* Sliding toggle knob with 3D effect */}
        <div className={`absolute top-0.5 w-7 h-7 rounded-full
                        bg-gradient-to-br from-white to-gray-100 dark:from-slate-200 dark:to-slate-300
                        shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]
                        dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.6)]
                        transition-all duration-500 ease-in-out
                        ${isDark ? 'translate-x-8' : 'translate-x-0.5'}
                        group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]
                        dark:group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)]`}>

          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent" />

          {/* Center icon that rotates */}
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500"
               style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
        </div>

        {/* Animated gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r transition-opacity duration-500
                        ${isDark
                          ? 'from-blue-500/10 to-purple-500/10 opacity-100'
                          : 'from-amber-500/10 to-orange-500/10 opacity-100'}`} />
      </div>

      {/* Pulsing glow effect on hover */}
      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-500/30 dark:to-purple-500/30
                      blur-xl -z-10" />
    </button>
  );
};
