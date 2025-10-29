/**
 * Production-ready logging utility
 * - In development: logs to console
 * - In production: can be extended to send to monitoring service (Sentry, LogRocket, etc.)
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    if (isDevelopment) return true;
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context || '');
    }
    // In production, send to monitoring service
    if (isProduction) {
      // Uncomment when Sentry is configured (see PRODUCTION_READY_CHECKLIST.md)
      // import * as Sentry from '@sentry/react';
      // Sentry.captureMessage(message, { level: 'warning', extra: context });
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, context || '');
    }
    // In production, send errors to monitoring service
    if (isProduction) {
      // Uncomment when Sentry is configured (see PRODUCTION_READY_CHECKLIST.md)
      // import * as Sentry from '@sentry/react';
      // Sentry.captureException(error, { extra: { message, ...context } });
    }
  }

  // Special method for API responses (only in dev)
  apiResponse(endpoint: string, data: unknown) {
    if (isDevelopment) {
      console.log(`[API Response] ${endpoint}:`, data);
    }
  }
}

export const logger = new Logger();
