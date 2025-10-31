import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '../../lib/queryClient';
import {
  cancelDownloadJob,
  createDownloadJob,
  fetchDownloadJob,
  fetchRecentDownloadJobs,
  retryDownloadItem,
  type CreateDownloadJobInput,
  type CreateDownloadJobResponse,
  type DownloadJobWithItems,
  type ListDownloadJobsResponse,
} from '../../services/downloadsService';
import { useDownloadsStore } from '../../stores/downloadsStore';

export const DOWNLOAD_JOBS_QUERY_KEY = ['downloads', 'jobs'] as const;
export const downloadJobQueryKey = (jobId: string) => ['downloads', 'job', jobId] as const;

export const useRecentDownloadJobs = (limit = 20) => {
  const ingestBootstrap = useDownloadsStore((state) => state.ingestBootstrap);

  const query = useQuery<ListDownloadJobsResponse>({
    queryKey: DOWNLOAD_JOBS_QUERY_KEY,
    queryFn: () => fetchRecentDownloadJobs(limit),
    staleTime: 5000,
  });

  useEffect(() => {
    if (query.data?.jobs) {
      ingestBootstrap(query.data.jobs);
    }
  }, [query.data, ingestBootstrap]);

  return query;
};

export const useDownloadJob = (jobId: string | null, enabled = true) => {
  const upsertJob = useDownloadsStore((state) => state.upsertJob);
  const replaceItemsForJob = useDownloadsStore((state) => state.replaceItemsForJob);

  const shouldFetch = Boolean(jobId) && enabled;

  const query = useQuery<DownloadJobWithItems>({
    queryKey: downloadJobQueryKey(jobId ?? 'unknown'),
    queryFn: () => fetchDownloadJob(jobId as string),
    enabled: shouldFetch,
    staleTime: 5000,
  });

  useEffect(() => {
    if (query.data) {
      upsertJob(query.data.job);
      replaceItemsForJob(query.data.job.id, query.data.items);
    }
  }, [query.data, replaceItemsForJob, upsertJob]);

  return query;
};

export const useCreateDownloadJob = () => {
  const upsertJob = useDownloadsStore((state) => state.upsertJob);
  const replaceItemsForJob = useDownloadsStore((state) => state.replaceItemsForJob);
  const openDock = useDownloadsStore((state) => state.openDock);
  const queryClient = useQueryClient();

  return useCallback(
    async (payload: CreateDownloadJobInput): Promise<CreateDownloadJobResponse> => {
      const result = await createDownloadJob(payload);
      upsertJob(result.job);
      replaceItemsForJob(result.job.id, result.items);
      openDock();

      queryClient.setQueryData<ListDownloadJobsResponse>(DOWNLOAD_JOBS_QUERY_KEY, (previous) => {
        const nextJobs = previous?.jobs ? [result.job, ...previous.jobs.filter((job) => job.id !== result.job.id)] : [result.job];
        return {
          jobs: nextJobs,
          nextCursor: previous?.nextCursor ?? null,
        };
      });

      return result;
    },
    [openDock, queryClient, replaceItemsForJob, upsertJob]
  );
};

export const useCancelDownloadJob = () => {
  const upsertJob = useDownloadsStore((state) => state.upsertJob);
  const queryClient = useQueryClient();

  return useCallback(
    async (jobId: string) => {
      const job = await cancelDownloadJob(jobId);
      upsertJob(job);
      await queryClient.invalidateQueries({ queryKey: DOWNLOAD_JOBS_QUERY_KEY });
      return job;
    },
    [queryClient, upsertJob]
  );
};

export const useRetryDownloadItem = () => {
  const upsertItem = useDownloadsStore((state) => state.upsertItem);

  return useCallback(
    async (itemId: string) => {
      const item = await retryDownloadItem(itemId);
      upsertItem(item);
      return item;
    },
    [upsertItem]
  );
};
