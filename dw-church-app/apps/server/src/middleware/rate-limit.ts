import type { FastifyRequest } from 'fastify';
import type { RateLimitPluginOptions } from '@fastify/rate-limit';

export const rateLimitConfig: RateLimitPluginOptions = {
  max: (request: FastifyRequest, _key: string) => {
    // Authenticated users get a higher limit
    return request.user ? 300 : 100;
  },
  timeWindow: '1 minute',
  errorResponseBuilder: (_request, context) => ({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests — retry after ${Math.ceil(context.ttl / 1000)}s`,
    },
  }),
};
