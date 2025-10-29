import { apiFetch } from './api';

export interface BffSessionUser {
  id: string;
  email: string;
  roles: string[];
  metadata?: Record<string, unknown> | null;
}

export interface BffSessionResponse {
  user: BffSessionUser | null;
}

export const fetchBffSession = async (): Promise<BffSessionResponse> => {
  return apiFetch('/auth/session', {
    method: 'GET',
    auth: true,
  });
};

export const destroyBffSession = async (): Promise<void> => {
  await apiFetch('/auth/session', {
    method: 'DELETE',
    auth: true,
  });
};
