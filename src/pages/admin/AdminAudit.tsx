import React from 'react';
import { useAdminAuditLog } from '../../hooks/admin/useAdminAuditLog';
import { ArrowPathIcon } from '../../components/icons/Icons';

const AdminAudit = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminAuditLog(75);
  const entries = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Audit Trail</h2>
          <p className="mt-2 text-sm text-slate-400">
            Review the latest admin mutations, proxy operations, and session lifecycle events captured by the BFF audit sink.
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
          {(error as Error).message || 'Failed to load audit log.'}
        </div>
      ) : null}

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={`${entry.requestId}-${entry.timestamp}`}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">{entry.action}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {entry.method} {entry.path}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{entry.timestamp}</p>
                {typeof entry.durationMs === 'number' ? <p>{entry.durationMs}ms</p> : null}
              </div>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actor</p>
                <p className="mt-1 text-sm text-slate-200">
                  {entry.actor?.email || entry.actor?.id || 'Unknown actor'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm text-slate-200">{entry.status ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request ID</p>
                <p className="mt-1 text-sm text-slate-200">{entry.requestId || '—'}</p>
              </div>
            </div>
            {entry.metadata?.auditReason ? (
              <p className="mt-4 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3 text-xs text-slate-300">
                Reason: {String(entry.metadata.auditReason)}
              </p>
            ) : null}
          </div>
        ))}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4 text-xs text-slate-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading audit events…
          </div>
        ) : null}

        {!isLoading && entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-center text-sm text-slate-500">
            No audit events recorded yet.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default AdminAudit;