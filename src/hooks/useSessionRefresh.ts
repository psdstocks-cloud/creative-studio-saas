import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchBffSession } from '../services/bffSession';

/**
 * Hook to periodically refresh session cookies to keep users logged in
 * Only runs if user is authenticated
 */
export const useSessionRefresh = () => {
  const { isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only set up refresh if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    const REFRESH_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

    const refreshSession = async () => {
      try {
        await fetchBffSession();
      } catch (error) {
        console.warn('Failed to refresh session cookie:', error);
      }
    };

    // Refresh after 1 day, then every 2 days
    const initialTimeout = setTimeout(() => {
      refreshSession();
    }, 1 * 24 * 60 * 60 * 1000); // 1 day

    intervalRef.current = setInterval(() => {
      refreshSession();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated]);
};

