import type { FastifyInstance } from 'fastify';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { saveIntakeSchema } from './schema.js';
import * as svc from './service.js';

/**
 * Site intake routes.
 *   Tenant admin (their own church):
 *     GET  /intake          — load draft (resume)
 *     PUT  /intake          — save draft (mid-progress save)
 *     POST /intake/submit   — submit when done
 *   Super admin (to build with it):
 *     GET  /admin/intake          — list all intakes
 *     GET  /admin/intake/:slug    — full content for a church
 *     POST /admin/intake/:slug/built — mark built after running the AI builder
 */
export async function intakeRoutes(app: FastifyInstance) {
  app.get('/intake', { preHandler: [requireAdmin] }, async (request, reply) => {
    const slug = request.user?.tenantSlug;
    if (!slug) throw new AppError('TENANT_REQUIRED', 400, '교회를 찾을 수 없습니다');
    const row = await svc.getIntake(slug);
    return reply.send({ data: row ?? { tenant_slug: slug, plan: request.tenant?.plan ?? '', data: {}, status: 'draft' } });
  });

  app.put('/intake', { preHandler: [requireAdmin] }, async (request, reply) => {
    const slug = request.user?.tenantSlug;
    if (!slug) throw new AppError('TENANT_REQUIRED', 400, '교회를 찾을 수 없습니다');
    const { data } = saveIntakeSchema.parse(request.body);
    const row = await svc.saveIntake(slug, request.tenant?.plan ?? '', data);
    return reply.send({ data: row });
  });

  app.post('/intake/submit', { preHandler: [requireAdmin] }, async (request, reply) => {
    const slug = request.user?.tenantSlug;
    if (!slug) throw new AppError('TENANT_REQUIRED', 400, '교회를 찾을 수 없습니다');
    const row = await svc.submitIntake(slug);
    if (!row) throw new AppError('NOT_FOUND', 404, '먼저 내용을 저장해 주세요');
    return reply.send({ data: row });
  });

  app.get('/admin/intake', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const data = await svc.listSubmitted();
    return reply.send({ data });
  });

  app.get('/admin/intake/:slug', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const row = await svc.getIntake(slug);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '입력 내용을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.post('/admin/intake/:slug/built', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const row = await svc.setBuilt(slug);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '입력 내용을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  // Apply the intake content verbatim into the tenant (settings/staff/history/
  // cells + home blocks) and mark built. One-click "intake로 콘텐츠 채우기".
  app.post('/admin/intake/:slug/apply', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const summary = await svc.applyIntake(slug);
    return reply.send({ data: summary });
  });
}
