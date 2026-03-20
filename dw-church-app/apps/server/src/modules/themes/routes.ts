import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { updateThemeSchema } from './schema.js';
import * as themeService from './service.js';

export default async function themeRoutes(app: FastifyInstance): Promise<void> {
  // GET /theme — public
  app.get('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const theme = await themeService.getTheme(schema);
    return reply.send(theme);
  });

  // PUT /theme — auth required
  app.put('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const body = updateThemeSchema.parse(request.body);
    const theme = await themeService.updateTheme(schema, body);
    return reply.send(theme);
  });
}
