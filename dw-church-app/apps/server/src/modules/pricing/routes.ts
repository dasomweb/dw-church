import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { updatePricingSchema, updateSetupPricingSchema } from './schema.js';
import * as svc from './service.js';

/**
 * Plan pricing routes.
 *   GET /pricing                    — PUBLIC (landing / apply read prices here).
 *   GET/PATCH /admin/pricing[/:key] — super-admin "상품/가격 관리".
 */
export async function pricingRoutes(app: FastifyInstance) {
  app.get('/pricing', async (_request, reply) => {
    const data = await svc.listPricing(true); // public → active plans only (hide retired plus/pro)
    return reply.send({ data });
  });

  app.get('/admin/pricing', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const data = await svc.listPricing(false); // admin manages all rows incl. deactivated
    return reply.send({ data });
  });

  app.patch('/admin/pricing/:key', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const input = updatePricingSchema.parse(request.body);
    const row = await svc.updatePricing(key, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '플랜을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  // ── 초기 구축비 (setup_pricing) ──
  app.get('/setup-pricing', async (_request, reply) => {
    return reply.send({ data: await svc.listSetupPricing(true) }); // public → active only
  });
  app.get('/admin/setup-pricing', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    return reply.send({ data: await svc.listSetupPricing(false) });
  });
  app.patch('/admin/setup-pricing/:key', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const input = updateSetupPricingSchema.parse(request.body);
    const row = await svc.updateSetupPricing(key, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '구축 항목을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });
}
