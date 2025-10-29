import React, { useMemo, useState } from 'react';
import { useAdminUsers } from '../../hooks/admin/useAdminUsers';
import { adjustUserBalance } from '../../services/admin/usersService';
import { useQueryClient } from '../../lib/queryClient';
import { ArrowPathIcon } from '../../components/icons/Icons';

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const filters = useMemo(() => ({ search, page, perPage }), [search, page]);
  const query = useAdminUsers(filters);
  const result = query.data;
  const users = result?.users ?? [];
  const queryClient = useQueryClient();

  const handleAdjustBalance = async (userId: string) => {
    const amountRaw = window.prompt('Enter the adjustment amount (positive or negative)');
    if (!amountRaw) {
      return;
    }
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount === 0) {
      alert('Please enter a non-zero numeric amount.');
      return;
    }
    const reason = window.prompt('Provide an audit reason for this adjustment');
    if (!reason) {
      return;
    }

    try {
      await adjustUserBalance(userId, amount, reason);
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'users', search || '', String(page), String(perPage)],
      });
    } catch (error) {
      alert((error as Error).message || 'Unable to adjust balance.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">User Directory</h2>
        <p className="text-sm text-slate-400">
          Search, filter, and inspect user balances, RBAC assignments, and aggregate order statistics.
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
              {query.isFetching ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
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

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950/50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Last Sign-In</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {users.map((user) => (
              <tr key={user.id} className="bg-slate-950/30">
                <td className="px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-100">{user.email || 'Unknown email'}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{user.id}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {user.roles.length ? user.roles.join(', ') : 'user'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-200">{user.balance.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  <p>Total: {user.orderStats.total}</p>
                  <p>Ready: {user.orderStats.ready}</p>
                  <p>Failed: {user.orderStats.failed}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  <p>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Never'}</p>
                  <p className="mt-1 text-slate-500">
                    Updated: {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '—'}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleAdjustBalance(user.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-800"
                  >
                    Adjust Balance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t border-slate-800/60 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading users…
          </div>
        ) : null}
        {!query.isLoading && users.length === 0 ? (
          <div className="border-t border-dashed border-slate-700 bg-slate-950/30 p-6 text-center text-sm text-slate-500">
            No users match the current filters.
          </div>
        ) : null}
      </div>

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
    </div>
  );
};

export default AdminUsers;
