import { useQuery } from '../../lib/queryClient';
import { fetchAdminStockSources, type StockSource } from '../../services/admin/stockSourcesService';

export const useAdminStockSources = () => {
  return useQuery<StockSource[]>({
    queryKey: ['admin', 'stock-sources'],
    queryFn: fetchAdminStockSources,
    enabled: true,
    staleTime: 60_000,
  });
};
