import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import * as settingsService from './service.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', { preHandler: [optionalAuth] }, async (request, reply) => {
    const data = await settingsService.getAllSettings(getSchema(request));
    // Fall back to the tenant's registered name (public.tenants.name) when
    // the admin hasn't set `church_name` yet — keeps the website header from
    // showing the raw slug where a proper name would belong.
    if (!data.church_name && request.tenant?.name) {
      data.church_name = request.tenant.name;
    }
    return reply.send({ data });
  });

  app.put('/settings', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as Record<string, string | null>;
    const data = await settingsService.upsertSettings(getSchema(request), body);
    return reply.send({ data });
  });
}
