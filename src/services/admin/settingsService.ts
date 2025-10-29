import { apiFetch } from '../api';

type AdminSettingsResponse = {
  polling: {
    minimumIntervalMs: number;
  };
  rateLimits: {
    windowMs: number;
    generalMaxRequests: number;
    adminMaxRequests: number;
  };
  session: {
    ttlMs: number;
    refreshThresholdMs: number;
  };
  auditLogPath: string;
};

export const fetchAdminSettings = async (): Promise<AdminSettingsResponse> => {
  const data = await apiFetch('/admin/settings', { auth: true });

  if (!data || typeof data !== 'object' || !('polling' in data)) {
    throw new Error('Unexpected response while loading settings.');
  }

  return data as AdminSettingsResponse;
};
