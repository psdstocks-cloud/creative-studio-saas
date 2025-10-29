import React from 'react';

interface LayoutStoreState {
  isSidebarCollapsed: boolean;
}

const STORAGE_KEY = 'css-layout-store';

let state: LayoutStoreState = {
  isSidebarCollapsed: false,
};

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const persistState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to persist layout state', error);
    }
  }
};

const hydrateFromStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        state = {
          ...state,
          isSidebarCollapsed: Boolean(parsed.isSidebarCollapsed),
        };
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to hydrate layout state', error);
    }
  }
};

if (typeof window !== 'undefined') {
  hydrateFromStorage();
}

const setState = (partial: Partial<LayoutStoreState>) => {
  state = {
    ...state,
    ...partial,
  };
  persistState();
  notify();
};

const toggleSidebar = () => {
  setState({ isSidebarCollapsed: !state.isSidebarCollapsed });
};

const setSidebarCollapsed = (collapsed: boolean) => {
  setState({ isSidebarCollapsed: collapsed });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => ({
  isSidebarCollapsed: state.isSidebarCollapsed,
  toggleSidebar,
  setSidebarCollapsed,
});

export const useLayoutStore = () => {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
