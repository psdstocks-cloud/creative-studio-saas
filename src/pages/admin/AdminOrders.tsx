import React, { useMemo, useState } from 'react';
import { useAdminOrders, serializeAdminOrdersFilters } from '../../hooks/admin/useAdminOrders';
import { useQueryClient } from '../../lib/queryClient';
import type { Order } from '../../types';
import { regenerateAdminOrderDownload, refreshAdminOrderStatus } from '../../services/admin/ordersService';
import { Button } from '../../components/ui/button';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, LinkIcon } from '../../components/icons/Icons';
import { useReactTable, flexRender, type ColumnDef } from '../../lib/reactTable';

const AdminOrders = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      site: siteFilter || undefined,
      search: searchTerm || undefined,
      limit: 75,
    }),
    [statusFilter, siteFilter, searchTerm]
  );

  const query = useAdminOrders(filters);
  const orders = query.data ?? [];
  const queryClient = useQueryClient();

  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());

  const setPending = (taskId: string, isPending: boolean) => {
    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      if (isPending) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const handleRefreshStatus = async (order: Order) => {
    setPending(order.task_id, true);
    try {
      await refreshAdminOrderStatus(order.task_id);
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'orders', serializeAdminOrdersFilters(filters)],
      });
    } catch (error) {
      alert((error as Error).message || 'Unable to refresh status.');
    } finally {
      setPending(order.task_id, false);
    }
  };

  const handleRegenerate = async (order: Order) => {
    const reason = window.prompt('Provide an audit reason for regenerating this link');
    if (!reason) return;

    setPending(order.task_id, true);
    try {
      const response = await regenerateAdminOrderDownload(order.task_id, reason);
      const downloadPayload = (response as { download?: Record<string, any> }).download ?? response;
      const downloadUrl =
        downloadPayload?.downloadLink ||
        downloadPayload?.url ||
        downloadPayload?.download_url ||
        downloadPayload?.link ||
        downloadPayload?.data?.downloadLink ||
        downloadPayload?.data?.download_url ||
        downloadPayload?.data?.url ||
        null;

      await queryClient.invalidateQueries({
        queryKey: ['admin', 'orders', serializeAdminOrdersFilters(filters)],
      });

      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      alert((error as Error).message || 'Unable to regenerate download link.');
    } finally {
      setPending(order.task_id, false);
    }
  };

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <img
              src={row.original.file_info?.preview}
              alt={row.original.file_info?.title || row.original.file_info?.name || row.original.task_id}
              className="h-12 w-12 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">
                {row.original.file_info?.title || row.original.file_info?.name || 'Untitled asset'}
              </p>
              <p className="text-xs text-slate-500">{row.original.file_info?.site?.toUpperCase() || '—'}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <div className="space-y-1 text-xs text-slate-400">
            <p className="font-mono text-slate-300">{row.original.user_id}</p>
            <p className="text-slate-500">Task: {row.original.task_id}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-xs text-slate-400">{new Date(row.original.created_at).toLocaleString()}</span>
        ),
      },
      {
        id: 'download',
        header: 'Download',
        cell: ({ row }) =>
          row.original.download_url ? (
            <a
              href={row.original.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 hover:text-sky-200"
            >
              <LinkIcon className="h-4 w-4" />
              Open link
            </a>
          ) : (
            <span className="text-xs text-slate-500">Not available</span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRefreshStatus(row.original)}
              disabled={pendingTaskIds.has(row.original.task_id) || row.original.status !== 'processing'}
              className="gap-2"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${pendingTaskIds.has(row.original.task_id) ? 'animate-spin text-amber-300' : 'text-slate-400'}`}
              />
              Poll
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRegenerate(row.original)}
              disabled={pendingTaskIds.has(row.original.task_id)}
              className="gap-2"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
        ),
      },
    ],
    [handleRegenerate, handleRefreshStatus, pendingTaskIds]
  );

  const table = useReactTable({ data: orders, columns });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Stock Orders</h2>
        <p className="text-sm text-slate-400">
          Review recent purchases, confirm fulfillment status, and regenerate download links with full audit coverage.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-400">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
            >
              <option value="">All</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="failed">Failed</option>
              <option value="payment_failed">Payment Failed</option>
            </select>
          </label>

          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-400">
            Site
            <input
              value={siteFilter}
              onChange={(event) => setSiteFilter(event.target.value)}
              placeholder="adobestock"
              className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-400 sm:col-span-1">
            Search
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="task id, user id, title"
              className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
            />
          </label>
        </div>
      </section>

      {query.error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {(query.error as Error).message || 'Failed to load orders.'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {flexRender(header.column.columnDef.header, { column: header.column })}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="bg-slate-950/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 align-top text-slate-200">
                    {flexRender(cell.column.columnDef.cell, {
                      row,
                      column: cell.column,
                      getValue: cell.getValue,
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t border-slate-800/60 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading orders…
          </div>
        ) : null}

        {!query.isLoading && orders.length === 0 ? (
          <div className="border-t border-dashed border-slate-700 bg-slate-950/30 p-6 text-center text-sm text-slate-500">
            No orders match the current filters.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminOrders;
