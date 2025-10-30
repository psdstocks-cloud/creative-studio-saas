import React, { useMemo, useState } from 'react';
import type { AdminUserSummary } from '../../types';
import { useAdminUsers } from '../../hooks/admin/useAdminUsers';
import { adjustUserBalance } from '../../services/admin/usersService';
import { useQueryClient } from '../../lib/queryClient';
import { useReactTable, flexRender } from '../../lib/reactTable';
import type { ColumnDef } from '../../lib/reactTable';
import { AdjustBalanceDialog } from '../../components/admin/AdjustBalanceDialog';
import { useToast } from '../../hooks/use-toast';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { UsersIcon } from 'lucide-react';
import { ArrowPathIcon, ChevronUpIcon, ChevronDownIcon } from '../../components/icons/Icons';

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adjustBalanceDialogOpen, setAdjustBalanceDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
  const perPage = 25;

  const filters = useMemo(() => ({ search, page, perPage }), [search, page]);
  const query = useAdminUsers(filters);
  const result = query.data;
  const users = result?.users ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Define handler before using it in columns
  const handleOpenAdjustBalance = (user: AdminUserSummary) => {
    setSelectedUser(user);
    setAdjustBalanceDialogOpen(true);
  };

  const columns = useMemo<ColumnDef<AdminUserSummary>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        accessorKey: 'email',
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-sm text-slate-200">
            <p className="font-semibold text-slate-100">{row.original.email || 'Unknown email'}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: 'roles',
        header: 'Roles',
        accessorKey: 'roles',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-slate-400">
            {row.original.roles.length ? row.original.roles.join(', ') : 'user'}
          </span>
        ),
      },
      {
        id: 'balance',
        header: 'Balance',
        accessorKey: 'balance',
        enableSorting: true,
        sortingFn: (rowA, rowB) => rowA.original.balance - rowB.original.balance,
        cell: ({ row }) => (
          <span className="text-sm text-slate-200">{row.original.balance.toFixed(2)}</span>
        ),
      },
      {
        id: 'orders',
        header: 'Orders',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs text-slate-400">
            <p>Total: {row.original.orderStats.total}</p>
            <p>Ready: {row.original.orderStats.ready}</p>
            <p>Failed: {row.original.orderStats.failed}</p>
          </div>
        ),
      },
      {
        id: 'lastSignIn',
        header: 'Last Sign-In',
        accessorKey: 'lastSignInAt',
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const dateA = rowA.original.lastSignInAt
            ? new Date(rowA.original.lastSignInAt).getTime()
            : 0;
          const dateB = rowB.original.lastSignInAt
            ? new Date(rowB.original.lastSignInAt).getTime()
            : 0;
          return dateA - dateB;
        },
        cell: ({ row }) => (
          <div className="text-xs text-slate-400">
            <p>
              {row.original.lastSignInAt
                ? new Date(row.original.lastSignInAt).toLocaleString()
                : 'Never'}
            </p>
            <p className="mt-1 text-slate-500">
              Updated:{' '}
              {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}
            </p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleOpenAdjustBalance(row.original)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-800"
          >
            Adjust Balance
          </button>
        ),
      },
    ],
    [handleOpenAdjustBalance]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const handleAdjustBalanceSubmit = async (amount: number, reason: string) => {
    if (!selectedUser) return;

    setIsAdjusting(true);
    try {
      await adjustUserBalance(selectedUser.id, amount, reason);
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'users', search || '', String(page), String(perPage)],
      });

      setAdjustBalanceDialogOpen(false);
      setSelectedUser(null);

      toast({
        title: 'Balance Adjusted',
        description: `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Unable to adjust balance.',
        variant: 'destructive',
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">User Directory</h2>
        <p className="text-sm text-slate-400">
          Search, filter, and inspect user balances, RBAC assignments, and aggregate order
          statistics.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
            Search users
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="email, id"
              className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => query.refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {query.isFetching ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )}
              Refresh
            </button>
            <span>
              Page {result?.page ?? 1} of {Math.max(1, Math.ceil((result?.total ?? 0) / perPage))}
            </span>
          </div>
        </div>
      </section>

      {query.error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {(query.error as Error).message || 'Failed to load users.'}
        </div>
      ) : null}

      {query.isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users found"
          description="No users match the current search criteria."
          action={{
            label: 'Clear Search',
            onClick: () => {
              setSearch('');
              setPage(1);
            },
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.columnDef.enableSorting !== false;
                    const sortState = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${header.id === 'actions' ? 'text-right' : ''} ${canSort ? 'cursor-pointer select-none hover:text-slate-300' : ''}`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div
                          className={`flex items-center gap-2 ${header.id === 'actions' ? 'justify-end' : ''}`}
                        >
                          {flexRender(header.column.columnDef.header, { column: header.column })}
                          {canSort && (
                            <span className="flex flex-col">
                              {sortState === 'asc' ? (
                                <ChevronUpIcon className="h-3 w-3 text-blue-400" />
                              ) : sortState === 'desc' ? (
                                <ChevronDownIcon className="h-3 w-3 text-blue-400" />
                              ) : (
                                <div className="flex flex-col opacity-30">
                                  <ChevronUpIcon className="h-3 w-3 -mb-1" />
                                  <ChevronDownIcon className="h-3 w-3" />
                                </div>
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="bg-slate-950/30">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 text-slate-200 ${cell.column.id === 'actions' ? 'text-right' : ''}`}
                    >
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
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil((result?.total ?? 0) / perPage))}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={page >= Math.ceil((result?.total ?? 0) / perPage)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <AdjustBalanceDialog
        open={adjustBalanceDialogOpen}
        onOpenChange={setAdjustBalanceDialogOpen}
        onSubmit={handleAdjustBalanceSubmit}
        userId={selectedUser?.id || ''}
        userEmail={selectedUser?.email}
        currentBalance={selectedUser?.balance}
        isLoading={isAdjusting}
      />
    </div>
  );
};

export default AdminUsers;