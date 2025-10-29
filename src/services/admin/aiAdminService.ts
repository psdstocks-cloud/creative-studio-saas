import { apiFetch } from '../api';
import type { AuditEntry, AiJob } from '../../types';

export const fetchAdminAiJob = async (jobId: string): Promise<AiJob> => {
  const data = await apiFetch(`/admin/ai/jobs/${encodeURIComponent(jobId)}`, { auth: true });
  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response while loading AI job.');
  }
  if ('success' in data && data.success === false) {
    throw new Error((data as { message?: string }).message || 'AI job request failed.');
  }
  return data as AiJob;
};

export const fetchAdminAiActivity = async (): Promise<AuditEntry[]> => {
  const data = await apiFetch('/admin/ai/activity', { auth: true });
  if (!data || typeof data !== 'object' || !('events' in data)) {
    throw new Error('Unexpected response while loading AI activity.');
  }
  return (data as { events: AuditEntry[] }).events;
};
