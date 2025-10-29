import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface LayoutState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutState | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  }, []);

  const value = useMemo<LayoutState>(
    () => ({ isSidebarCollapsed, toggleSidebar, setSidebarCollapsed }),
    [isSidebarCollapsed, toggleSidebar, setSidebarCollapsed]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayoutStore = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutStore must be used within a LayoutProvider');
  }
  return context;
};
