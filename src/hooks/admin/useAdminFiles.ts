import { useQuery } from '../../lib/queryClient';
import { fetchAdminFiles } from '../../services/admin/ordersService';
import type { Order } from '../../types';

export const useAdminFiles = () => {
  return useQuery<Order[]>({
    queryKey: ['admin', 'files'],
    queryFn: fetchAdminFiles,
    enabled: true,
    staleTime: 15_000,
  });
};
