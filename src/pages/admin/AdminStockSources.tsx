import React from 'react';
import { useAdminStockSources } from '../../hooks/admin/useAdminStockSources';
import { ArrowPathIcon } from '../../components/icons/Icons';

const AdminStockSources = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminStockSources();
  const sources = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Stock Sources</h2>
          <p className="mt-2 text-sm text-slate-400">
            Review the upstream catalog, price points, and availability for each supported stock provider.
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
          {(error as Error).message || 'Failed to load stock sources.'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950/50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {sources.map((source) => (
              <tr key={source.key} className="bg-slate-950/30">
                <td className="px-4 py-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3">
                    {source.iconUrl ? (
                      <img src={source.iconUrl} alt={source.name} className="h-8 w-8 rounded object-cover" />
                    ) : null}
                    <span className="font-semibold text-slate-100">{source.name || source.key}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{source.key}</td>
                <td className="px-4 py-3 text-sm text-slate-200">{source.cost ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{source.active === false ? 'Disabled' : 'Enabled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t border-slate-800/60 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading sources…
          </div>
        ) : null}
        {!isLoading && sources.length === 0 ? (
          <div className="border-t border-dashed border-slate-700 bg-slate-950/30 p-6 text-center text-sm text-slate-500">
            No stock sources returned from the API.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminStockSources;
