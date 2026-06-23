import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin } from '../../middleware/auth.js';
import * as svc from './service.js';

const configSchema = z.object({ kakaoUrl: z.string().max(500).optional().nullable() });

/**
 * Platform marketing config.
 *   GET  /marketing-config         — PUBLIC (marketing site reads the kakao link)
 *   GET/PUT /admin/marketing-config — super-admin manages it
 */
export async function marketingRoutes(app: FastifyInstance) {
  app.get('/marketing-config', async (_request, reply) => {
    const cfg = await svc.getMarketingConfig();
    return reply.send({ data: { kakaoUrl: cfg?.kakao_url ?? null } });
  });

  app.get('/admin/marketing-config', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const cfg = await svc.getMarketingConfig();
    return reply.send({ data: { kakaoUrl: cfg?.kakao_url ?? null } });
  });

  app.put('/admin/marketing-config', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = configSchema.parse(request.body);
    const cfg = await svc.setMarketingConfig(input);
    return reply.send({ data: { kakaoUrl: cfg?.kakao_url ?? null } });
  });
}
