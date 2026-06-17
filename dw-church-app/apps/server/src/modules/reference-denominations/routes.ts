import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { createRefDenomSchema, updateRefDenomSchema } from './schema.js';
import * as svc from './service.js';

/**
 * 참조 교단 데이터 관리 (super-admin only). Backs the platform console's
 * "참조 데이터" panel + the application 이단 필터 badge.
 * Registered under /api/v1 → paths carry /admin.
 */
export async function referenceDenominationRoutes(app: FastifyInstance) {
  app.get('/admin/reference-denominations', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { status, country } = request.query as { status?: string; country?: string };
    const data = await svc.listRefDenoms({ status, country });
    return reply.send({ data });
  });

  app.post('/admin/reference-denominations', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = createRefDenomSchema.parse(request.body);
    const row = await svc.createRefDenom(input);
    return reply.status(201).send({ data: row });
  });

  app.patch('/admin/reference-denominations/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateRefDenomSchema.parse(request.body);
    const row = await svc.updateRefDenom(id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '참조 교단을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/admin/reference-denominations/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.deleteRefDenom(id);
    return reply.status(204).send();
  });
}
