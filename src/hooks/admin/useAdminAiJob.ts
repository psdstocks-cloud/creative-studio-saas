import { useMemo } from 'react';
import { useQuery } from '../../lib/queryClient';
import { fetchAdminAiJob } from '../../services/admin/aiAdminService';
import type { AiJob } from '../../types';

export const useAdminAiJob = (jobId: string | null) => {
  const key = useMemo(() => ['admin', 'ai-job', jobId || ''] as const, [jobId]);

  return useQuery<AiJob>({
    queryKey: key,
    queryFn: () => {
      if (!jobId) {
        return Promise.reject(new Error('Job ID is required.'));
      }
      return fetchAdminAiJob(jobId);
    },
    enabled: Boolean(jobId),
    staleTime: 5_000,
  });
};
