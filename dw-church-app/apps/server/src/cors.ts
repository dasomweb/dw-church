import type { FastifyCorsOptions } from '@fastify/cors';

/**
 * CORS is only needed for the public embed.js (runs on 3rd-party sites with
 * unknown origins). Admin-app and web now go through same-origin proxies so
 * they never hit CORS. embed.js only reads public tenant data (tenant ID is
 * not a secret) — allow-all is safe.
 */
export const corsOptions: FastifyCorsOptions = {
  origin: true,
  credentials: false,
};
