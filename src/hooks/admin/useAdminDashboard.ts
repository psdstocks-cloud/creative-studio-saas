import { useQuery } from '../../lib/queryClient';
import { fetchAdminDashboard } from '../../services/admin/dashboardService';
import type { AdminDashboardSummary } from '../../types';

export const ADMIN_DASHBOARD_QUERY_KEY = ['admin', 'dashboard'] as const;

export const useAdminDashboard = () => {
  return useQuery<AdminDashboardSummary>({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: fetchAdminDashboard,
    enabled: true,
    staleTime: 20_000,
  });
};
