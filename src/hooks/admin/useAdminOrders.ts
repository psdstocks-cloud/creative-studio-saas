import { useMemo } from 'react';
import { useQuery } from '../../lib/queryClient';
import { fetchAdminOrders, type AdminOrdersFilters } from '../../services/admin/ordersService';
import type { Order } from '../../types';

export const serializeAdminOrdersFilters = (filters: AdminOrdersFilters) =>
  JSON.stringify({
    status: filters.status || null,
    site: filters.site || null,
    search: filters.search || null,
    limit: filters.limit || null,
    cursor: filters.cursor || null,
  });

export const useAdminOrders = (filters: AdminOrdersFilters) => {
  const key = useMemo(
    () => ['admin', 'orders', serializeAdminOrdersFilters(filters)] as const,
    [filters]
  );

  return useQuery<Order[]>({
    queryKey: key,
    queryFn: () => fetchAdminOrders(filters),
    enabled: true,
    staleTime: 10_000,
  });
};
