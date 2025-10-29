import { useQuery } from '../../lib/queryClient';
import { fetchAdminSettings } from '../../services/admin/settingsService';

type AdminSettings = Awaited<ReturnType<typeof fetchAdminSettings>>;

export const useAdminSettings = () => {
  return useQuery<AdminSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAdminSettings,
    enabled: true,
    staleTime: 60_000,
  });
};
