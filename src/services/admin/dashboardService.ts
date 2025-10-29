import { apiFetch } from '../api';
import type { AdminDashboardSummary } from '../../types';

export const fetchAdminDashboard = async (): Promise<AdminDashboardSummary> => {
  const data = await apiFetch('/admin/dashboard', { auth: true });

  if (!data || typeof data !== 'object' || !('summary' in data)) {
    throw new Error('Unexpected response while loading dashboard data.');
  }

  return data as AdminDashboardSummary;
};
