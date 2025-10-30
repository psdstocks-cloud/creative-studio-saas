import React, { useState, useMemo } from 'react';
import { useAdminStockSources } from '../../hooks/admin/useAdminStockSources';
import { updateStockSourceCost, toggleStockSourceActive } from '../../services/admin/stockSourcesService';
import { useQueryClient } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { ArrowPathIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '../../components/icons/Icons';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { ServerIcon } from 'lucide-react';
import type { StockSource } from '../../services/admin/stockSourcesService';

const AdminStockSources = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminStockSources();
  const sources = data ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter and search sources
  const filteredSources = useMemo(() => {
    let filtered = sources;

    // Apply active filter
    if (filter === 'active') {
      filtered = filtered.filter((s) => s.active !== false);
    } else if (filter === 'inactive') {
      filtered = filtered.filter((s) => s.active === false);
    }

    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.key.toLowerCase().includes(term)
      );
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [sources, filter, searchTerm]);

  const stats = useMemo(() => {
    const active = sources.filter((s) => s.active !== false).length;
    const avgCost = sources.reduce((sum, s) => {
      const cost = typeof s.cost === 'number' ? s.cost : 0;
      return sum + cost;
    }, 0) / sources.length;

    return {
      total: sources.length,
      active,
      inactive: sources.length - active,
      averageCost: avgCost.toFixed(2),
    };
  }, [sources]);

  const handleStartEdit = (source: StockSource) => {
    setEditingKey(source.key);
    setEditValue(source.cost?.toString() || '');
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSaveEdit = async (key: string) => {
    const parsedCost = parseFloat(editValue);

    // SECURITY: Client-side validation
    const MIN_COST = 0.01;
    const MAX_COST = 1000;

    if (isNaN(parsedCost) || !isFinite(parsedCost)) {
      toast({
        title: 'Invalid Cost',
        description: 'Please enter a valid number',
        variant: 'destructive',
      });
      return;
    }

    if (parsedCost < MIN_COST) {
      toast({
        title: 'Cost Too Low',
        description: `Minimum cost is ${MIN_COST} points. Setting cost to 0 is not allowed.`,
        variant: 'destructive',
      });
      return;
    }

    if (parsedCost > MAX_COST) {
      toast({
        title: 'Cost Too High',
        description: `Maximum cost is ${MAX_COST} points`,
        variant: 'destructive',
      });
      return;
    }

    // Check decimal places
    const decimalPlaces = (parsedCost.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      toast({
        title: 'Invalid Format',
        description: 'Cost can have at most 2 decimal places',
        variant: 'destructive',
      });
      return;
    }

    setSavingKey(key);
    try {
      await updateStockSourceCost(key, parsedCost);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stock-sources'] });

      toast({
        title: 'Cost Updated',
        description: `Successfully updated ${key} to ${parsedCost} points`,
        variant: 'success',
      });

      setEditingKey(null);
      setEditValue('');
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to update cost',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleActive = async (key: string, currentActive: boolean) => {
    setTogglingKey(key);
    try {
      await toggleStockSourceActive(key, !currentActive);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stock-sources'] });

      toast({
        title: currentActive ? 'Source Disabled' : 'Source Enabled',
        description: `${key} is now ${currentActive ? 'disabled' : 'enabled'}`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to toggle status',
        variant: 'destructive',
      });
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Stock Sources</h2>
        <p className="text-sm text-slate-400">
          Manage pricing and availability for all supported stock media providers. Changes apply
          immediately to all users.
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total Sources
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-50">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p>
          <p className="mt-2 text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inactive</p>
          <p className="mt-2 text-2xl font-bold text-slate-400">{stats.inactive}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Avg Cost
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-400">{stats.averageCost} pts</p>
        </div>
      </div>

      {/* Filters & Search */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
            <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
              Search
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="name or key"
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
              />
            </label>

            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
              Filter
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
              >
                <option value="all">All ({stats.total})</option>
                <option value="active">Active ({stats.active})</option>
                <option value="inactive">Inactive ({stats.inactive})</option>
              </select>
            </label>
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
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {(error as Error).message || 'Failed to load stock sources.'}
        </div>
      ) : null}

      {isLoading ? (
        <TableSkeleton rows={10} columns={5} />
      ) : filteredSources.length === 0 ? (
        <EmptyState
          icon={ServerIcon}
          title="No sources found"
          description={
            searchTerm
              ? 'No sources match your search criteria.'
              : 'No stock sources available.'
          }
          action={
            searchTerm
              ? {
                  label: 'Clear Search',
                  onClick: () => setSearchTerm(''),
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Cost (Points)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredSources.map((source) => {
                const isEditing = editingKey === source.key;
                const isSaving = savingKey === source.key;
                const isToggling = togglingKey === source.key;
                const isActive = source.active !== false;

                return (
                  <tr
                    key={source.key}
                    className={`${isActive ? 'bg-slate-950/30' : 'bg-slate-950/60 opacity-60'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {source.iconUrl ? (
                          <img
                            src={source.iconUrl}
                            alt={source.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : null}
                        <span className="font-semibold text-slate-100">
                          {source.name || source.key}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{source.key}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            disabled={isSaving}
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(source.key);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(source.key)}
                            disabled={isSaving}
                            className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-500 disabled:opacity-50"
                            title="Save"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="rounded-lg bg-slate-700 p-1.5 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                            title="Cancel"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-200">
                          {source.cost ?? 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isActive
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}
                      >
                        {isActive ? '● Enabled' : '○ Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(source)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            Edit Cost
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(source.key, isActive)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                            isActive
                              ? 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                              : 'border border-green-700 bg-green-900/30 text-green-300 hover:bg-green-900/50'
                          } disabled:opacity-50`}
                        >
                          {isToggling ? (
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filteredSources.length > 0 ? (
        <div className="text-center text-xs text-slate-500">
          Showing {filteredSources.length} of {sources.length} sources
        </div>
      ) : null}
    </div>
  );
};

export default AdminStockSources;