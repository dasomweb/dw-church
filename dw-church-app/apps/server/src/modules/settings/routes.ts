import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import * as settingsService from './service.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', async (request, reply) => {
    const data = await settingsService.getAllSettings(getSchema(request));
    return reply.send({ data });
  });

  app.put('/settings', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as Record<string, string | null>;
    const data = await settingsService.upsertSettings(getSchema(request), body);
    return reply.send({ data });
  });
}
