import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { updatePricingSchema } from './schema.js';
import * as svc from './service.js';

/**
 * Plan pricing routes.
 *   GET /pricing                    — PUBLIC (landing / apply read prices here).
 *   GET/PATCH /admin/pricing[/:key] — super-admin "상품/가격 관리".
 */
export async function pricingRoutes(app: FastifyInstance) {
  app.get('/pricing', async (_request, reply) => {
    const data = await svc.listPricing();
    return reply.send({ data });
  });

  app.get('/admin/pricing', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const data = await svc.listPricing();
    return reply.send({ data });
  });

  app.patch('/admin/pricing/:key', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const input = updatePricingSchema.parse(request.body);
    const row = await svc.updatePricing(key, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '플랜을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });
}
