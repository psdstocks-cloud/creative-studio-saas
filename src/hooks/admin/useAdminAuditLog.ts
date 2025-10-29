import { useMemo } from 'react';
import { useQuery } from '../../lib/queryClient';
import { fetchAuditLog } from '../../services/admin/auditService';
import type { AuditEntry } from '../../types';

export const useAdminAuditLog = (limit = 50) => {
  const key = useMemo(() => ['admin', 'audit-log', String(limit)] as const, [limit]);
  return useQuery<AuditEntry[]>({
    queryKey: key,
    queryFn: () => fetchAuditLog(limit),
    enabled: true,
    staleTime: 10_000,
  });
};
