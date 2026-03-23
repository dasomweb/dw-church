import type { FastifyCorsOptions } from '@fastify/cors';
import { env } from './config/env.js';

/**
 * Dynamic CORS origin function.
 * Allows all *.truelight.app subdomains, localhost, and env-configured origins.
 */
export const corsOptions: FastifyCorsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
    // No origin (server-to-server, curl, etc.) — allow
    if (!origin) return cb(null, true);
    if (
      origin.endsWith('.truelight.app') ||
      origin === 'https://truelight.app' ||
      origin.startsWith('http://localhost') ||
      env.CORS_ORIGINS.includes(origin)
    ) {
      return cb(null, true);
    }
    cb(null, false);
  },
  credentials: true,
};
