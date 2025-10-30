import { apiFetch } from '../api';

export interface StockSource {
  key: string;
  name: string;
  cost: number | string | null;
  icon?: string;
  iconUrl?: string;
  active?: boolean;
}

/**
 * Fetch all stock sources (with dynamic pricing from database)
 */
export const fetchAdminStockSources = async (): Promise<StockSource[]> => {
  const data = await apiFetch('/admin/stock-sources', { auth: true });
  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response while loading stock sources.');
  }

  const sites =
    (Array.isArray((data as { sites?: StockSource[] }).sites)
      ? (data as { sites: StockSource[] }).sites
      : Array.isArray(data as StockSource[])
        ? (data as StockSource[])
        : []) || [];

  return sites;
};

/**
 * Update the cost/price for a specific stock source
 */
export const updateStockSourceCost = async (key: string, cost: number): Promise<void> => {
  await apiFetch(`/admin/stock-sources/${key}/cost`, {
    method: 'PATCH',
    body: { cost },
    auth: true,
  });
};

/**
 * Toggle the active status of a stock source
 */
export const toggleStockSourceActive = async (key: string, active: boolean): Promise<void> => {
  await apiFetch(`/admin/stock-sources/${key}/active`, {
    method: 'PATCH',
    body: { active },
    auth: true,
  });
};

/**
 * Get audit log for stock source changes
 */
export interface StockSourceAuditLog {
  id: string;
  stock_source_key: string;
  action: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

export const getStockSourceAuditLog = async (
  key?: string,
  limit = 50
): Promise<StockSourceAuditLog[]> => {
  const params = new URLSearchParams();
  if (key) params.append('key', key);
  params.append('limit', limit.toString());

  const data = await apiFetch(`/admin/stock-sources/audit?${params.toString()}`, {
    auth: true,
  });

  return data.logs || [];
};