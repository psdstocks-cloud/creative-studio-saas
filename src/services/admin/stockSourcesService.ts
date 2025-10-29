import { apiFetch } from '../api';

export interface StockSource {
  key: string;
  name: string;
  cost: number | string | null;
  icon?: string;
  iconUrl?: string;
  active?: boolean;
}

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
