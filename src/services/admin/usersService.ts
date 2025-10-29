import { apiFetch } from '../api';
import type { AdminUserSummary } from '../../types';

export interface AdminUsersFilters {
  search?: string;
  page?: number;
  perPage?: number;
}

interface AdminUsersResponse {
  users: AdminUserSummary[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}

export const fetchAdminUsers = async (filters: AdminUsersFilters = {}): Promise<AdminUsersResponse> => {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.page) {
    params.set('page', String(filters.page));
  }
  if (filters.perPage) {
    params.set('perPage', String(filters.perPage));
  }

  const query = params.toString();
  const endpoint = `/admin/users${query ? `?${query}` : ''}`;
  const data = await apiFetch(endpoint, { auth: true });

  if (!data || typeof data !== 'object' || !('users' in data)) {
    throw new Error('Unexpected response while loading users.');
  }

  const { users, pagination } = data as AdminUsersResponse;
  return { users, pagination };
};

export const adjustUserBalance = async (userId: string, amount: number, reason: string) => {
  if (!reason.trim()) {
    throw new Error('An audit reason is required to adjust balance.');
  }

  return apiFetch(`/admin/users/${encodeURIComponent(userId)}/balance`, {
    method: 'POST',
    auth: true,
    body: { amount },
    headers: {
      'X-Audit-Reason': reason,
    },
  });
};
