import { create } from 'zustand';
import type { DownloadItem, DownloadJob } from '../../shared/types/downloads';

export type DownloadEvent =
  | { type: 'job_created'; job: DownloadJob }
  | { type: 'job_updated'; job: Partial<DownloadJob> & { id: string } }
  | { type: 'item_updated'; item: Partial<DownloadItem> & { id: string; job_id: string; user_id?: string } }
  | { type: 'job_completed'; id: string; reason?: string }
  | { type: 'job_failed'; id: string; reason?: string }
  | { type: 'bootstrap'; jobs: DownloadJob[] }
  | { type: 'connection_ack'; user_id: string; timestamp: string };

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type ItemsByJob = Record<string, Record<string, DownloadItem>>;

interface DownloadsState {
  jobs: Record<string, DownloadJob>;
  itemsByJob: ItemsByJob;
  connectionStatus: ConnectionStatus;
  isDockOpen: boolean;
  lastActivityAt: string | null;
}

interface DownloadsActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
  ingestBootstrap: (jobs: DownloadJob[]) => void;
  upsertJob: (job: DownloadJob | (Partial<DownloadJob> & { id: string })) => void;
  upsertItem: (item: DownloadItem | (Partial<DownloadItem> & { id: string; job_id: string })) => void;
  replaceItemsForJob: (jobId: string, items: DownloadItem[]) => void;
  handleEvent: (event: DownloadEvent) => void;
  reset: () => void;
}

const nowIso = () => new Date().toISOString();

const mergeJob = (existing: DownloadJob | undefined, incoming: Partial<DownloadJob> & { id: string }): DownloadJob => {
  if (!existing) {
    const defaults: DownloadJob = {
      id: incoming.id,
      user_id: incoming.user_id || '',
      title: incoming.title || 'Download job',
      status: incoming.status || 'queued',
      items_count: incoming.items_count ?? 0,
      items_completed: incoming.items_completed ?? 0,
      items_failed: incoming.items_failed ?? 0,
      bytes_total: incoming.bytes_total ?? null,
      bytes_downloaded: incoming.bytes_downloaded ?? 0,
      created_at: incoming.created_at || nowIso(),
      updated_at: incoming.updated_at || nowIso(),
      provider_batch_id: incoming.provider_batch_id ?? null,
    };
    return { ...defaults, ...incoming };
  }
  return {
    ...existing,
    ...incoming,
    items_count: incoming.items_count ?? existing.items_count,
    items_completed: incoming.items_completed ?? existing.items_completed,
    items_failed: incoming.items_failed ?? existing.items_failed,
    bytes_total:
      incoming.bytes_total !== undefined ? incoming.bytes_total : existing.bytes_total,
    bytes_downloaded:
      incoming.bytes_downloaded !== undefined ? incoming.bytes_downloaded : existing.bytes_downloaded,
    updated_at: incoming.updated_at || nowIso(),
  };
};

const mergeItem = (
  existing: DownloadItem | undefined,
  incoming: Partial<DownloadItem> & { id: string; job_id: string }
): DownloadItem => {
  if (!existing) {
    const defaults: DownloadItem = {
      id: incoming.id,
      job_id: incoming.job_id,
      provider: incoming.provider || 'unknown',
      source_url: incoming.source_url || '',
      filename: incoming.filename ?? null,
      bytes_total: incoming.bytes_total ?? null,
      bytes_downloaded: incoming.bytes_downloaded ?? 0,
      status: incoming.status || 'queued',
      error_message: incoming.error_message ?? null,
      thumb_url: incoming.thumb_url ?? null,
      started_at: incoming.started_at ?? null,
      finished_at: incoming.finished_at ?? null,
      meta: incoming.meta ?? {},
    };
    return defaults;
  }

  return {
    ...existing,
    ...incoming,
    bytes_total: incoming.bytes_total !== undefined ? incoming.bytes_total : existing.bytes_total,
    bytes_downloaded:
      incoming.bytes_downloaded !== undefined ? incoming.bytes_downloaded : existing.bytes_downloaded,
    meta:
      incoming.meta && typeof incoming.meta === 'object'
        ? { ...existing.meta, ...incoming.meta }
        : existing.meta,
  };
};

export const useDownloadsStore = create<DownloadsState & DownloadsActions>((set, get) => ({
  jobs: {},
  itemsByJob: {},
  connectionStatus: 'idle',
  isDockOpen: false,
  lastActivityAt: null,
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  openDock: () => set({ isDockOpen: true }),
  closeDock: () => set({ isDockOpen: false }),
  toggleDock: () => set((state) => ({ isDockOpen: !state.isDockOpen })),
  ingestBootstrap: (jobs) =>
    set((state) => {
      const nextJobs = { ...state.jobs };
      for (const job of jobs) {
        nextJobs[job.id] = mergeJob(state.jobs[job.id], job);
      }
      return {
        jobs: nextJobs,
        lastActivityAt: nowIso(),
      };
    }),
  upsertJob: (job) =>
    set((state) => {
      const nextJobs = { ...state.jobs };
      const updated = mergeJob(state.jobs[job.id], job);
      nextJobs[job.id] = updated;
      return {
        jobs: nextJobs,
        lastActivityAt: nowIso(),
      };
    }),
  upsertItem: (item) =>
    set((state) => {
      const itemsForJob = state.itemsByJob[item.job_id] ? { ...state.itemsByJob[item.job_id] } : {};
      const updated = mergeItem(itemsForJob[item.id], item);
      itemsForJob[item.id] = updated;
      return {
        itemsByJob: {
          ...state.itemsByJob,
          [item.job_id]: itemsForJob,
        },
        lastActivityAt: nowIso(),
      };
    }),
  replaceItemsForJob: (jobId, items) =>
    set((state) => {
      const record: Record<string, DownloadItem> = {};
      for (const item of items) {
        record[item.id] = item;
      }
      return {
        itemsByJob: {
          ...state.itemsByJob,
          [jobId]: record,
        },
        lastActivityAt: nowIso(),
      };
    }),
  handleEvent: (event) => {
    const actions = get();
    switch (event.type) {
      case 'job_created':
        actions.upsertJob(event.job);
        actions.openDock();
        break;
      case 'job_updated':
        actions.upsertJob(event.job);
        break;
      case 'job_completed':
        actions.upsertJob({ id: event.id, status: 'completed' });
        break;
      case 'job_failed':
        actions.upsertJob({ id: event.id, status: 'failed' });
        break;
      case 'item_updated':
        actions.upsertItem(event.item);
        break;
      case 'bootstrap':
        actions.ingestBootstrap(event.jobs);
        break;
      case 'connection_ack':
        set({ connectionStatus: 'connected' });
        break;
      default:
        break;
    }
  },
  reset: () =>
    set({
      jobs: {},
      itemsByJob: {},
      connectionStatus: 'idle',
      isDockOpen: false,
      lastActivityAt: null,
    }),
}));
