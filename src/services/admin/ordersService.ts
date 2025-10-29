import { apiFetch } from '../api';
import type { Order } from '../../types';

export interface AdminOrdersFilters {
  status?: string;
  site?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export const fetchAdminOrders = async (filters: AdminOrdersFilters = {}): Promise<Order[]> => {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.site) {
    params.set('site', filters.site);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }
  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  const query = params.toString();
  const endpoint = `/admin/orders${query ? `?${query}` : ''}`;
  const data = await apiFetch(endpoint, { auth: true });

  if (!data || typeof data !== 'object' || !('orders' in data)) {
    throw new Error('Unexpected response while loading admin orders.');
  }

  return (data as { orders: Order[] }).orders;
};

export const fetchAdminOrder = async (taskId: string): Promise<Order> => {
  const data = await apiFetch(`/admin/orders/${encodeURIComponent(taskId)}`, { auth: true });
  if (!data || typeof data !== 'object' || !('order' in data)) {
    throw new Error('Unexpected response while loading order detail.');
  }
  return (data as { order: Order }).order;
};

export const refreshAdminOrderStatus = async (taskId: string) => {
  return apiFetch(`/admin/orders/${encodeURIComponent(taskId)}/status`, { auth: true });
};

export const regenerateAdminOrderDownload = async (taskId: string, reason: string) => {
  if (!reason.trim()) {
    throw new Error('An audit reason is required to regenerate a download link.');
  }
  return apiFetch(`/admin/orders/${encodeURIComponent(taskId)}/regenerate`, {
    method: 'POST',
    auth: true,
    headers: {
      'X-Audit-Reason': reason,
    },
  });
};

export const fetchAdminFiles = async (): Promise<Order[]> => {
  const data = await apiFetch('/admin/files', { auth: true });
  if (!data || typeof data !== 'object' || !('files' in data)) {
    throw new Error('Unexpected response while loading files.');
  }
  return (data as { files: Order[] }).files;
};
