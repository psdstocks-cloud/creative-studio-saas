import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchBffSession } from '../services/bffSession';

/**
 * Hook to periodically refresh session cookies to extend user session
 * Cookies are automatically refreshed on each check to maintain 3-day expiration
 */
export const useSessionRefresh = () => {
  const { isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only set up refresh if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Refresh session every 2 days to keep cookies fresh
    // Cookie expires after 3 days, so refreshing at 2 days gives us 1 day buffer
    const REFRESH_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

    const refreshSession = async () => {
      try {
        await fetchBffSession();
      } catch (error) {
        console.warn('Failed to refresh session cookie:', error);
      }
    };

    // Initial refresh after 1 day (optional, just to keep cookies fresh)
    const initialTimeout = setTimeout(() => {
      refreshSession();
    }, 1 * 24 * 60 * 60 * 1000); // 1 day

    // Set up periodic refresh
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

