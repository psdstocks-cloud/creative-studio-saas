import { apiFetch } from './api';

export interface BffSessionUser {
  id: string;
  email: string;
  roles: string[];
  metadata?: Record<string, unknown> | null;
  balance: number;
}

export interface BffSessionResponse {
  user: BffSessionUser | null;
}

export const fetchBffSession = async (): Promise<BffSessionResponse> => {
  // Session endpoint reads from cookies directly - no auth header needed
  const response = await apiFetch('/api/auth/session', {
    method: 'GET',
    auth: false,
  });
  return response as BffSessionResponse;
};

export const destroyBffSession = async (): Promise<void> => {
  // Use the new signout endpoint that clears cookies
  await apiFetch('/api/auth/signout', {
    method: 'POST',
    auth: false, // Don't require auth to sign out
  });
};
