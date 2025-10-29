import React from 'react';
import { useAdminSettings } from '../../hooks/admin/useAdminSettings';
import { ArrowPathIcon } from '../../components/icons/Icons';

const AdminSettings = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminSettings();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Platform Settings</h2>
          <p className="mt-2 text-sm text-slate-400">
            Inspect runtime configuration surfaced by the BFF, including polling thresholds, rate limits, and session TTLs.
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
          {(error as Error).message || 'Failed to load settings.'}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading configuration…
          </div>
        ) : data ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Polling</h3>
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p>Minimum interval: {data.polling.minimumIntervalMs}ms</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Rate Limits</h3>
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p>Window: {data.rateLimits.windowMs}ms</p>
                <p>General max: {data.rateLimits.generalMaxRequests}</p>
                <p>Admin max: {data.rateLimits.adminMaxRequests}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Session</h3>
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p>TTL: {Math.round(data.session.ttlMs / 1000 / 60)} minutes</p>
                <p>Refresh threshold: {Math.round(data.session.refreshThresholdMs / 1000 / 60)} minutes</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Audit</h3>
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p>Log path: {data.auditLogPath}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No configuration available.</p>
        )}
      </section>
    </div>
  );
};

export default AdminSettings;
