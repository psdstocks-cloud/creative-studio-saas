import React from 'react';
import type { Order } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { ArrowPathIcon, ArrowDownTrayIcon, XCircleIcon } from '../icons/Icons';
import { cn } from '../../lib/utils';
import { flexRender, useReactTable, type ColumnDef } from '../../lib/reactTable';

interface OrdersTableProps {
  orders: Order[];
  onDownload: (taskId: string) => void;
  downloadingIds: Set<string>;
  isFetching?: boolean;
}

const statusBadgeStyles: Record<Order['status'], string> = {
  processing: 'bg-amber-500/10 text-amber-300 border-amber-400/40',
  ready: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/40',
  failed: 'bg-rose-500/10 text-rose-300 border-rose-400/40',
  payment_failed: 'bg-rose-500/10 text-rose-300 border-rose-400/40',
};

export const OrdersTable = ({ orders, onDownload, downloadingIds, isFetching }: OrdersTableProps) => {
  const { t } = useLanguage();

  const columns = React.useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: 'asset',
        header: t('recentOrders'),
        cell: ({ row }) => {
          const info = row.original.file_info;
          return (
            <div className="flex items-center gap-3">
              <img
                src={info.preview}
                alt={info.title || info.name || 'Asset preview'}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100" title={info.title || info.name}>
                  {info.title || info.name || info.site}
                </p>
                <p className="text-xs text-slate-400">{info.site.toUpperCase()}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: t('status'),
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                statusBadgeStyles[status],
              )}
            >
              {t(status)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: t('actions'),
        cell: ({ row }) => {
          const order = row.original;
          const isDownloading = downloadingIds.has(order.task_id);

          if (order.status === 'processing') {
            return (
              <div className="flex items-center gap-2 text-amber-300">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-wide">{t('processingStatus')}</span>
              </div>
            );
          }

          if (order.status === 'failed' || order.status === 'payment_failed') {
            return (
              <div className="flex items-center gap-2 text-rose-300">
                <XCircleIcon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">{t('failedStatus')}</span>
              </div>
            );
          }

          return (
            <Button
              variant="secondary"
              size="sm"
              disabled={isDownloading}
              onClick={() => onDownload(order.task_id)}
              className="gap-2"
            >
              {isDownloading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />}
              {t('downloadNow')}
            </Button>
          );
        },
      },
    ],
    [downloadingIds, onDownload, t],
  );

  const table = useReactTable({ data: orders, columns });
  const headerGroups = table.getHeaderGroups();
  const rowModel = table.getRowModel();

  if (!orders.length && !isFetching) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
        {t('noRecentOrders')}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-lg">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/80">
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {flexRender(header.columnDef.header, { column: header.column })}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rowModel.rows.map((row) => (
            <tr key={row.id} className="bg-slate-950/40 transition-colors hover:bg-slate-900/80">
              {row.cells.map((cell) => (
                <td key={cell.id} className="px-4 py-4 align-middle text-slate-200">
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
      {isFetching ? (
        <div className="flex items-center justify-center gap-2 border-t border-slate-800/60 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          {t('fetching')}
        </div>
      ) : null}
    </div>
  );
};
