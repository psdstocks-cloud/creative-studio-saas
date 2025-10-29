import { apiFetch } from './api';
import type { AccountOverview, SendPointsResult } from '../types';

/**
 * Account Service
 * 
 * IMPORTANT: The /me endpoint should be used for optional sync/refresh only.
 * The primary source of user data should be AuthContext (user object from Supabase auth).
 * 
 * The /me API endpoint may return incorrect or stale data. Always prioritize
 * AuthContext user data for displaying user information and balance.
 */

export interface SendPointsPayload {
  receiver: string;
  amount: number;
  note?: string;
}

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

/**
 * Fetches account overview from the backend API.
 * 
 * NOTE: This should only be used for optional refresh/sync.
 * Primary user data should come from AuthContext.
 */
export const fetchAccountOverview = async (): Promise<AccountOverview> => {
  const data = await apiFetch('/me', { method: 'GET', auth: true });

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response while fetching account information.');
  }

  const raw = data as Record<string, unknown>;
  const balance =
    firstNumber(
      raw.balance,
      raw.points,
      raw.wallet,
      (raw.data as Record<string, unknown> | undefined)?.balance,
      (raw.profile as Record<string, unknown> | undefined)?.balance
    ) ?? 0;

  const metadataCandidate = raw.profile ?? raw.data;
  const metadata =
    typeof metadataCandidate === 'object' && metadataCandidate !== null
      ? (metadataCandidate as Record<string, unknown>)
      : null;

  const plan = firstString(
    (raw.plan as Record<string, unknown> | undefined)?.name,
    raw.plan,
    (raw.subscription as Record<string, unknown> | undefined)?.plan_name,
    (raw.subscription as Record<string, unknown> | undefined)?.name,
    (raw.subscription as Record<string, unknown> | undefined)?.plan &&
      typeof (raw.subscription as Record<string, unknown> | undefined)?.plan === 'object'
      ? firstString(
          (
            (raw.subscription as Record<string, unknown> | undefined)?.plan as Record<
              string,
              unknown
            >
          ).name,
          (
            (raw.subscription as Record<string, unknown> | undefined)?.plan as Record<
              string,
              unknown
            >
          ).id
        )
      : null
  );

  return {
    id:
      firstString(raw.id, (raw.user as Record<string, unknown> | undefined)?.id, metadata?.id) ??
      null,
    email:
      firstString(
        raw.email,
        (raw.user as Record<string, unknown> | undefined)?.email,
        metadata?.email
      ) ?? null,
    username:
      firstString(
        raw.username,
        (raw.user as Record<string, unknown> | undefined)?.username,
        metadata?.username
      ) ?? null,
    balance,
    plan: plan ?? null,
    lastLoginAt:
      firstString(
        raw.last_login,
        raw.lastLogin,
        raw.last_sign_in_at,
        (raw.user as Record<string, unknown> | undefined)?.last_login,
        (raw.user as Record<string, unknown> | undefined)?.last_sign_in_at
      ) ?? null,
    metadata,
  };
};

export const sendPoints = async ({
  receiver,
  amount,
  note,
}: SendPointsPayload): Promise<SendPointsResult> => {
  const trimmedReceiver = receiver.trim();
  if (!trimmedReceiver) {
    throw new Error('Recipient is required.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const payload: Record<string, string | number> = {
    receiver: trimmedReceiver,
    amount,
  };

  if (note && note.trim().length > 0) {
    payload.note = note.trim();
  }

  const data = await apiFetch('/sendpoint', {
    method: 'GET',
    auth: true,
    body: payload,
  });

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response while sending points.');
  }

  const raw = data as Record<string, unknown>;
  const statusText = firstString(raw.status, raw.state, raw.result);
  const successFlag = raw.success;
  const hasErrorMessage = firstString(raw.error, raw.detail, raw.error_message);

  const normalizedSuccess =
    typeof successFlag === 'boolean'
      ? successFlag
      : typeof successFlag === 'string'
        ? successFlag.toLowerCase() === 'true'
        : !statusText || !['error', 'failed'].includes(statusText.toLowerCase());

  const message = firstString(raw.message, statusText, hasErrorMessage) || 'Transfer completed.';
  const balance = firstNumber(
    raw.balance,
    raw.points,
    raw.wallet,
    (raw.data as Record<string, unknown> | undefined)?.balance
  );

  if (!normalizedSuccess || hasErrorMessage) {
    const error = new Error(hasErrorMessage || message || 'Unable to send points.');
    (error as Error & { metadata?: Record<string, unknown> }).metadata = raw;
    throw error;
  }

  return {
    success: true,
    balance: typeof balance === 'number' ? balance : null,
    message,
    metadata: raw,
  };
};
