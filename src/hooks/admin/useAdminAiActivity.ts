import { useQuery } from '../../lib/queryClient';
import { fetchAdminAiActivity } from '../../services/admin/aiAdminService';
import type { AuditEntry } from '../../types';

export const useAdminAiActivity = () => {
  return useQuery<AuditEntry[]>({
    queryKey: ['admin', 'ai-activity'],
    queryFn: fetchAdminAiActivity,
    enabled: true,
    staleTime: 10_000,
  });
};
