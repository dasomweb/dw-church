import * as Sentry from '@sentry/node';
import { env } from './env.js';

export function initSentry() {
  if (!env.SENTRY_DSN) {
    console.log('[sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  console.log('[sentry] Initialized');
}

export { Sentry };
