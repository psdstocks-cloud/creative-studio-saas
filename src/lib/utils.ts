import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isAuthError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: number }).status;
    if (typeof status === 'number' && [400, 401, 403].includes(status)) {
      return true;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('missing bearer token') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('sign in')
    ) {
      return true;
    }
  }

  return false;
};
