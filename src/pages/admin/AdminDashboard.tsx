import React from 'react';
import { useAdminDashboard } from '../../hooks/admin/useAdminDashboard';
import { ArrowPathIcon } from '../../components/icons/Icons';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { InboxIcon } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const AdminDashboard = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminDashboard();

  const metrics = [
    {
      name: 'Orders (24h)',
      value: data?.summary.ordersLast24h ?? 0,
      helper: 'Successfully ingested stock downloads over the last 24 hours.',
    },
    {
      name: 'Processing Orders',
      value: data?.summary.processingOrders ?? 0,
      helper: 'Orders currently waiting on upstream fulfillment.',
    },
    {
      name: 'Spend (30d)',
      value: formatCurrency(data?.summary.totalSpend30d ?? 0),
      helper: 'Aggregate of stock order costs over the last 30 days.',
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Operational KPIs</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Monitor live order throughput, fulfillment queues, and spend while reviewing the most
            recent audit activity across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {isFetching ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowPathIcon className="h-4 w-4" />
          )}
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {(error as Error).message || 'Failed to load dashboard data.'}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm"
              >
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-9 w-32 mb-3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </>
        ) : (
          metrics.map((metric) => (
            <div
              key={metric.name}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-400">{metric.name}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-50">{metric.value}</p>
              <p className="mt-3 text-xs text-slate-500">{metric.helper}</p>
            </div>
          ))
        )}
      </div>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Top Sources (24h)</h3>
              <p className="mt-1 text-sm text-slate-400">
                Breakdown of where orders originated during the last 24 hours.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {isLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/40 px-4 py-3"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </li>
                ))}
              </>
            ) : (data?.topSites?.length ?? 0) > 0 ? (
              (data?.topSites || []).map((site) => (
                <li
                  key={site.site}
                  className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/40 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-200 uppercase">{site.site}</span>
                  <span className="text-sm text-slate-400">{site.count} orders</span>
                </li>
              ))
            ) : (
              <EmptyState
                icon={InboxIcon}
                title="No orders yet"
                description="No orders recorded in the last 24 hours."
              />
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-100">Latest Audit Events</h3>
          <p className="mt-1 text-sm text-slate-400">
            Recent write operations and high-sensitivity reads captured by the BFF.
          </p>
          <div className="mt-4 space-y-4">
            {isLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4"
                  >
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                ))}
              </>
            ) : (data?.recentAudit?.length ?? 0) > 0 ? (
              (data?.recentAudit || []).map((entry) => (
                <div
                  key={`${entry.requestId}-${entry.timestamp}`}
                  className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4"
                >
                  <p className="text-sm font-semibold text-slate-200">{entry.action}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {entry.actor?.email || entry.actor?.id || 'Unknown actor'} • {entry.timestamp}
                  </p>
                  {entry.metadata?.auditReason ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Reason: {String(entry.metadata.auditReason)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                icon={InboxIcon}
                title="No audit events"
                description="No audit events captured yet."
              />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Recent Orders</h3>
            <p className="mt-1 text-sm text-slate-400">
              Snapshot of the 10 most recent orders across all users.
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead>
              <tr className="bg-slate-950/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {(data?.recentOrders || []).map((order) => (
                <tr key={order.id} className="bg-slate-950/30">
                  <td className="px-4 py-3 text-slate-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.file_info?.preview}
                        alt={order.file_info?.title || order.file_info?.name || order.task_id}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {order.file_info?.title || order.file_info?.name || 'Untitled asset'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.file_info?.site?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{order.user_id}</td>
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {order.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && (data?.recentOrders?.length ?? 0) === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-6 text-center text-sm text-slate-500">
              No orders recorded yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
