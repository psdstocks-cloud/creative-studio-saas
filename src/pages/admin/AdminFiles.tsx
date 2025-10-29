import React from 'react';
import { useAdminFiles } from '../../hooks/admin/useAdminFiles';
import { ArrowPathIcon, LinkIcon } from '../../components/icons/Icons';

const AdminFiles = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminFiles();
  const files = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">File Archive</h2>
          <p className="mt-2 text-sm text-slate-400">
            Browse recently generated download links and quickly open them for customer support or QA purposes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {isFetching ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {(error as Error).message || 'Failed to load files.'}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <div key={file.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-3">
              <img
                src={file.file_info?.preview}
                alt={file.file_info?.title || file.file_info?.name || file.task_id}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {file.file_info?.title || file.file_info?.name || 'Untitled asset'}
                </p>
                <p className="text-xs text-slate-500">{file.file_info?.site?.toUpperCase() || '—'}</p>
                <p className="text-xs text-slate-500">{new Date(file.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>User: {file.user_id}</span>
              <span>Status: {file.status}</span>
            </div>
            <a
              href={file.download_url || '#'}
              onClick={(event) => {
                if (!file.download_url) {
                  event.preventDefault();
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${
                file.download_url
                  ? 'text-sky-300 hover:text-sky-200'
                  : 'cursor-not-allowed text-slate-500'
              }`}
            >
              <LinkIcon className="h-4 w-4" />
              {file.download_url ? 'Open download' : 'Download unavailable'}
            </a>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4 text-xs text-slate-400">
          <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading files…
        </div>
      ) : null}
      {!isLoading && files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-center text-sm text-slate-500">
          No downloadable files captured yet.
        </p>
      ) : null}
    </div>
  );
};

export default AdminFiles;
