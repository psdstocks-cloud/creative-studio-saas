import { memo, useCallback } from 'react';
import clsx from 'clsx';
import { Copy, RotateCcw } from 'lucide-react';
import type { DownloadItem } from '../../../shared/types/downloads';
import ProgressBar from '../ui/ProgressBar';
import { toast } from '../../hooks/use-toast';

const statusClasses: Record<string, string> = {
  queued: 'bg-slate-700/60 text-slate-100',
  starting: 'bg-blue-500/20 text-blue-200 border border-blue-500/40',
  downloading: 'bg-blue-500/30 text-blue-100',
  processing: 'bg-sky-500/20 text-sky-100',
  completed: 'bg-emerald-500/20 text-emerald-100',
  failed: 'bg-rose-500/20 text-rose-100',
  canceled: 'bg-slate-600/40 text-slate-200',
  retrying: 'bg-amber-500/20 text-amber-100',
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

const resolveFilename = (item: DownloadItem) => {
  if (item.filename) {
    return item.filename;
  }
  try {
    const url = new URL(item.source_url);
    const pathname = url.pathname;
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    return lastSegment || item.source_url;
  } catch (_error) {
    return item.source_url;
  }
};

export interface DownloadItemRowProps {
  item: DownloadItem;
  onRetry?: (item: DownloadItem) => Promise<void> | void;
}

const DownloadItemRowComponent = ({ item, onRetry }: DownloadItemRowProps) => {
  const isRetryable = item.status === 'failed';
  const isIndeterminate = item.bytes_total === null || item.bytes_total === undefined || item.bytes_total <= 0;
  const progressValue = !isIndeterminate && item.bytes_total ? item.bytes_downloaded / item.bytes_total : 0;
  const downloadedLabel = formatBytes(item.bytes_downloaded);
  const totalLabel = formatBytes(item.bytes_total);
  const filename = resolveFilename(item);

  const handleRetry = useCallback(() => {
    if (!isRetryable || !onRetry) {
      return;
    }
    onRetry(item);
  }, [isRetryable, onRetry, item]);

  const handleCopySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.source_url);
      toast({
        title: 'Source URL copied',
        description: filename,
      });
    } catch (error) {
      console.error('Failed to copy source URL', error);
      toast({
        title: 'Unable to copy source URL',
        description: 'Please copy it manually.',
        variant: 'destructive',
      });
    }
  }, [filename, item.source_url]);

  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-900/80 p-3">
      <div className="flex items-start gap-3">
        {item.thumb_url ? (
          <img
            src={item.thumb_url}
            alt={filename}
            className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300">
            {item.provider.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-100">{filename}</p>
              <p className="text-xs text-slate-400 break-all">{item.source_url}</p>
            </div>
            <div
              className={clsx(
                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                statusClasses[item.status] || statusClasses.queued
              )}
            >
              {item.status}
            </div>
          </div>
          <ProgressBar value={progressValue} isIndeterminate={isIndeterminate} />
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400">
            <span>
              {downloadedLabel}
              {totalLabel ? ` / ${totalLabel}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySource}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-slate-500 hover:text-slate-50"
              >
                <Copy className="h-3 w-3" />
                Copy URL
              </button>
              {isRetryable ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 hover:border-amber-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              ) : null}
            </div>
          </div>
          {item.error_message ? (
            <p className="text-xs text-rose-300">{item.error_message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const DownloadItemRow = memo(DownloadItemRowComponent);

export default DownloadItemRow;
