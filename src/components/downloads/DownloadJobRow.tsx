import { useMemo } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Clock, Download, History, XCircle } from 'lucide-react';
import type { DownloadItem, DownloadJob } from '../../../shared/types/downloads';
import ProgressBar from '../ui/ProgressBar';
import DownloadItemRow from './DownloadItemRow';
import { useDownloadJob } from '../../hooks/queries/useDownloads';
import { useDownloadsStore } from '../../stores/downloadsStore';

const JOB_STATUS_CLASSES: Record<string, string> = {
  queued: 'bg-slate-700/60 text-slate-100',
  starting: 'bg-blue-500/20 text-blue-100 border border-blue-500/30',
  downloading: 'bg-blue-500/30 text-blue-100',
  processing: 'bg-sky-500/30 text-sky-100',
  completed: 'bg-emerald-500/20 text-emerald-100',
  failed: 'bg-rose-500/20 text-rose-100',
  canceled: 'bg-slate-600/40 text-slate-200',
  retrying: 'bg-amber-500/20 text-amber-100',
};

const RUNNING_STATUSES = new Set(['queued', 'starting', 'downloading', 'processing', 'retrying']);

const formatTimestamp = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch (_error) {
    return iso;
  }
};

const aggregateProgress = (job: DownloadJob, items: DownloadItem[]) => {
  if (job.bytes_total && job.bytes_total > 0) {
    return { value: job.bytes_downloaded / job.bytes_total, indeterminate: false };
  }
  const anyUnknown = items.some((item) => !item.bytes_total);
  if (anyUnknown) {
    return { value: 0, indeterminate: true };
  }
  const totalBytes = items.reduce((sum, item) => sum + (item.bytes_total || 0), 0);
  if (totalBytes <= 0) {
    return { value: 0, indeterminate: true };
  }
  const downloaded = items.reduce((sum, item) => sum + (item.bytes_downloaded || 0), 0);
  return { value: downloaded / totalBytes, indeterminate: false };
};

const formatBytes = (bytes: number | null | undefined) => {
  if (!Number.isFinite(bytes) || !bytes) {
    return null;
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || value === Math.floor(value) ? 0 : 1)} ${units[unitIndex]}`;
};

export interface DownloadJobRowProps {
  job: DownloadJob;
  isExpanded: boolean;
  onToggle: () => void;
  onCancel?: (job: DownloadJob) => void;
  onRevealHistory?: (job: DownloadJob) => void;
  onRetryItem?: (item: DownloadItem) => Promise<void> | void;
}

export const DownloadJobRow = ({
  job,
  isExpanded,
  onToggle,
  onCancel,
  onRevealHistory,
  onRetryItem,
}: DownloadJobRowProps) => {
  const itemsMap = useDownloadsStore((state) => state.itemsByJob[job.id] || {});
  const items = useMemo(() => Object.values(itemsMap).sort((a, b) => (a.started_at || a.id).localeCompare(b.started_at || b.id)), [itemsMap]);

  useDownloadJob(job.id, isExpanded && items.length === 0);

  const { value, indeterminate } = aggregateProgress(job, items);
  const isRunning = RUNNING_STATUSES.has(job.status);
  const downloadedLabel = formatBytes(job.bytes_downloaded);
  const totalLabel = formatBytes(job.bytes_total);

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/80 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-100">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{job.title}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(job.created_at)}</span>
              <span>• {job.items_completed}/{job.items_count} completed</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'rounded-full px-2 py-1 text-xs font-medium capitalize',
              JOB_STATUS_CLASSES[job.status] || JOB_STATUS_CLASSES.queued
            )}
          >
            {job.status}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md border border-slate-700/60 p-1 text-slate-300 hover:border-slate-500 hover:text-slate-50"
            aria-expanded={isExpanded}
            aria-controls={`download-job-${job.id}`}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar value={value} isIndeterminate={indeterminate} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {indeterminate ? 'Calculating progress…' : `${Math.round((value || 0) * 100)}%`}
          {job.bytes_total && downloadedLabel && totalLabel
            ? ` • ${downloadedLabel} / ${totalLabel}`
            : ''}
        </span>
        <div className="flex items-center gap-2">
          {isRunning && onCancel ? (
            <button
              type="button"
              onClick={() => onCancel(job)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-200 hover:border-rose-400"
            >
              <XCircle className="h-3 w-3" />
              Cancel
            </button>
          ) : null}
          {!isRunning && onRevealHistory ? (
            <button
              type="button"
              onClick={() => onRevealHistory(job)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-slate-500 hover:text-slate-50"
            >
              <History className="h-3 w-3" />
              History
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <div id={`download-job-${job.id}`} className="mt-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">Preparing item details...</p>
          ) : (
            items.map((item) => (
              <DownloadItemRow key={item.id} item={item} onRetry={onRetryItem} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DownloadJobRow;
