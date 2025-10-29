import { useQuery } from '../../lib/queryClient';
import { getOrders } from '../../services/filesService';
import type { Order } from '../../types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

export const useOrdersQuery = (enabled: boolean) => {
  return useQuery<Order[]>({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrders,
    enabled,
    staleTime: 30_000,
  });
};
