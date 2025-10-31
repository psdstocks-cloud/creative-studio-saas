import type { DownloadItem, DownloadJob } from '../../shared/types/downloads';
import { apiFetch } from './api';

export interface CreateDownloadItemInput {
  source_url: string;
  provider?: string;
  filename?: string | null;
  bytes_total?: number | null;
  thumb_url?: string | null;
  meta?: Record<string, unknown>;
}

export interface CreateDownloadJobInput {
  title?: string;
  items: CreateDownloadItemInput[];
}

export interface CreateDownloadJobResponse {
  job: DownloadJob;
  items: DownloadItem[];
}

export interface ListDownloadJobsResponse {
  jobs: DownloadJob[];
  nextCursor: string | null;
}

export interface DownloadJobWithItems {
  job: DownloadJob;
  items: DownloadItem[];
}

export const createDownloadJob = async (
  payload: CreateDownloadJobInput
): Promise<CreateDownloadJobResponse> => {
  if (!payload.items || payload.items.length === 0) {
    throw new Error('At least one download item is required.');
  }

  return apiFetch('/downloads', {
    method: 'POST',
    auth: true,
    body: payload,
  });
};

export const fetchRecentDownloadJobs = async (
  limit = 20,
  cursor?: string | null
): Promise<ListDownloadJobsResponse> => {
  return apiFetch('/downloads', {
    method: 'GET',
    auth: true,
    body: {
      limit,
      cursor: cursor ?? undefined,
    },
  });
};

export const fetchDownloadJob = async (jobId: string): Promise<DownloadJobWithItems> => {
  if (!jobId) {
    throw new Error('Job id is required.');
  }
  return apiFetch(`/downloads/${jobId}`, {
    method: 'GET',
    auth: true,
  });
};

export const cancelDownloadJob = async (jobId: string): Promise<DownloadJob> => {
  if (!jobId) {
    throw new Error('Job id is required.');
  }
  const result = await apiFetch(`/downloads/${jobId}/cancel`, {
    method: 'POST',
    auth: true,
  });
  if (!result?.job) {
    throw new Error('Unexpected response while canceling job.');
  }
  return result.job as DownloadJob;
};

export const retryDownloadItem = async (itemId: string): Promise<DownloadItem> => {
  if (!itemId) {
    throw new Error('Item id is required.');
  }
  const result = await apiFetch(`/download-items/${itemId}/retry`, {
    method: 'POST',
    auth: true,
  });
  if (!result?.item) {
    throw new Error('Unexpected response while retrying item.');
  }
  return result.item as DownloadItem;
};
