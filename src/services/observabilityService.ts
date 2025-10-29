import type React from 'react';
import { config } from '../config';

interface ObservabilityPayload {
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const sendPayload = async (payload: ObservabilityPayload) => {
  if (!config.observability.enabled || !config.observability.endpoint) {
    return;
  }

  try {
    await fetch(config.observability.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to send observability payload', error);
    }
  }
};

export const reportClientError = async (
  error: unknown,
  info?: React.ErrorInfo,
  context: Record<string, unknown> = {}
) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;
  const componentStack = info?.componentStack;

  await sendPayload({
    level: 'error',
    message,
    stack,
    componentStack,
    context: {
      ...context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    },
    timestamp: new Date().toISOString(),
  });
};

export const reportClientWarning = async (
  message: string,
  context: Record<string, unknown> = {}
) => {
  await sendPayload({
    level: 'warn',
    message,
    context: {
      ...context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    },
    timestamp: new Date().toISOString(),
  });
};
