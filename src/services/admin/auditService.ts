import { apiFetch } from '../api';
import type { AuditEntry } from '../../types';

export const fetchAuditLog = async (limit = 50): Promise<AuditEntry[]> => {
  const params = new URLSearchParams();
  if (limit) {
    params.set('limit', String(limit));
  }

  const endpoint = `/admin/audit/logs?${params.toString()}`;
  const data = await apiFetch(endpoint, { auth: true });

  if (!data || typeof data !== 'object' || !('entries' in data)) {
    throw new Error('Unexpected response while loading audit log.');
  }

  return (data as { entries: AuditEntry[] }).entries;
};
