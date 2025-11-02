import { useQuery } from '../../lib/queryClient';
import { getOrders } from '../../services/filesService';
import { useAuth } from '../../contexts/AuthContext';
import type { Order } from '../../types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

export const useOrdersQuery = (enabled: boolean) => {
  const { user, isAuthenticated } = useAuth();
  // With cookie auth, we check isAuthenticated instead of accessToken
  const shouldFetch = isAuthenticated && Boolean(user?.id) && enabled;

  return useQuery<Order[]>({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrders,
    enabled: shouldFetch,
    staleTime: 30_000,
    retry: false,
  });
};
