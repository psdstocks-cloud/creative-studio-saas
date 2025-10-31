import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DownloadItem, DownloadJob } from '../../../shared/types/downloads';
import { useDownloadsStore } from '../../stores/downloadsStore';
import { useDownloadsRealtime } from '../../hooks/useDownloadsRealtime';
import {
  useCancelDownloadJob,
  useRecentDownloadJobs,
  useRetryDownloadItem,
} from '../../hooks/queries/useDownloads';
import DownloadJobRow from './DownloadJobRow';
import { toast } from '../../hooks/use-toast';

const connectionBadgeClass = (status: string) => {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40';
    case 'connecting':
      return 'bg-amber-500/20 text-amber-200 border border-amber-500/30';
    case 'error':
      return 'bg-rose-500/20 text-rose-200 border border-rose-500/40';
    default:
      return 'bg-slate-700/40 text-slate-200 border border-slate-700/60';
  }
};

const RUNNING_STATUSES = new Set(['queued', 'starting', 'downloading', 'processing', 'retrying']);

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const DownloadsDock = () => {
  useDownloadsRealtime();
  useRecentDownloadJobs(30);

  const jobs = useDownloadsStore((state) => state.jobs);
  const isDockOpen = useDownloadsStore((state) => state.isDockOpen);
  const toggleDock = useDownloadsStore((state) => state.toggleDock);
  const connectionStatus = useDownloadsStore((state) => state.connectionStatus);

  const cancelJobMutation = useCancelDownloadJob();
  const retryItemMutation = useRetryDownloadItem();

  const sortedJobs = useMemo(
    () =>
      Object.values(jobs)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [jobs]
  );

  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const statusCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    for (const job of sortedJobs) {
      const previousStatus = statusCacheRef.current.get(job.id);
      if (previousStatus && previousStatus !== job.status) {
        if (job.status === 'completed') {
          toast({
            title: 'Download completed',
            description: job.title,
            variant: 'success',
          });
        } else if (job.status === 'failed') {
          toast({
            title: 'Download failed',
            description: job.title,
            variant: 'destructive',
          });
        }
      }
      statusCacheRef.current.set(job.id, job.status);
    }
  }, [sortedJobs]);

  const hasJobs = sortedJobs.length > 0;

  const handleToggleExpand = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleCancelJob = async (job: DownloadJob) => {
    try {
      await cancelJobMutation(job.id);
      toast({
        title: 'Download canceled',
        description: job.title,
      });
    } catch (error) {
      console.error('Failed to cancel download job', error);
      toast({
        title: 'Unable to cancel download',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRetryItem = async (item: DownloadItem) => {
    try {
      await retryItemMutation(item.id);
      toast({
        title: 'Retrying download',
        description: item.filename ?? item.source_url,
      });
    } catch (error) {
      console.error('Failed to retry download item', error);
      toast({
        title: 'Unable to retry download',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRevealHistory = (job: DownloadJob) => {
    toast({
      title: 'Open History to view completed downloads',
      description: job.title,
    });
  };

  if (!isBrowser) {
    return null;
  }

  if (!hasJobs && !isDockOpen) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-3xl justify-end">
      {isDockOpen ? (
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-slate-800/80 bg-slate-900/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 p-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Downloads</h2>
              <p className="text-xs text-slate-500">Live progress for your stock assets</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-medium',
                  connectionBadgeClass(connectionStatus)
                )}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {connectionStatus}
              </span>
              <button
                type="button"
                onClick={toggleDock}
                className="rounded-md border border-slate-700/60 p-2 text-slate-300 transition hover:border-slate-500 hover:text-slate-50"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto p-4">
            {!hasJobs ? (
              <div className="rounded-lg border border-dashed border-slate-700/60 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                No active downloads. Your completed downloads live in History.
              </div>
            ) : (
              sortedJobs.map((job) => (
                <DownloadJobRow
                  key={job.id}
                  job={job}
                  isExpanded={expandedJobs.has(job.id)}
                  onToggle={() => handleToggleExpand(job.id)}
                  onCancel={RUNNING_STATUSES.has(job.status) ? handleCancelJob : undefined}
                  onRevealHistory={!RUNNING_STATUSES.has(job.status) ? handleRevealHistory : undefined}
                  onRetryItem={handleRetryItem}
                />
              ))
            )}
          </div>
        </div>
      ) : hasJobs ? (
        <button
          type="button"
          onClick={toggleDock}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/95 px-4 py-2 text-sm font-medium text-slate-100 shadow-xl backdrop-blur transition hover:border-slate-500"
        >
          <ChevronUp className="h-4 w-4" />
          {sortedJobs.length} active download{sortedJobs.length > 1 ? 's' : ''}
        </button>
      ) : null}
    </div>,
    document.body
  );
};

export default DownloadsDock;
