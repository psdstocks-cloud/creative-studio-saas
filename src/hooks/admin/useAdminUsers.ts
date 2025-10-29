import { useMemo } from 'react';
import { useQuery } from '../../lib/queryClient';
import { fetchAdminUsers, type AdminUsersFilters } from '../../services/admin/usersService';
import type { AdminUserSummary } from '../../types';

export interface UseAdminUsersResult {
  users: AdminUserSummary[];
  total: number;
  page: number;
  perPage: number;
}

export const useAdminUsers = (filters: AdminUsersFilters) => {
  const key = useMemo(
    () =>
      [
        'admin',
        'users',
        filters.search || '',
        String(filters.page || 1),
        String(filters.perPage || 25),
      ] as const,
    [filters]
  );

  const query = useQuery<UseAdminUsersResult>({
    queryKey: key,
    queryFn: async () => {
      const { users, pagination } = await fetchAdminUsers(filters);
      return {
        users,
        total: pagination.total,
        page: pagination.page,
        perPage: pagination.perPage,
      };
    },
    enabled: true,
    staleTime: 15_000,
  });

  return query;
};
