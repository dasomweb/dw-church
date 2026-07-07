import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { hitSchema, summaryQuerySchema } from './schema.js';
import * as analytics from './service.js';

export async function analyticsRoutes(app: FastifyInstance) {
  /**
   * Public collection beacon. Tenant is resolved by tenantMiddleware from the
   * X-Tenant-Slug header the storefront sends. A beacon must never surface an
   * error, so unknown tenant / bot / bad body all return 204 quietly.
   */
  app.post('/analytics/hit', async (request, reply) => {
    const slug = request.tenant?.slug;
    if (!slug) return reply.code(204).send();

    const parsed = hitSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(204).send();

    try {
      await analytics.recordHit(slug, parsed.data, request.headers['user-agent']);
    } catch {
      // Never fail the beacon on a write error — analytics is best-effort.
    }
    return reply.code(204).send();
  });

  /**
   * Tenant-scoped usage report. requireAuth + request.tenant.slug means a
   * church admin only ever sees their own tenant (auth rebinds a mismatched
   * header), while a super_admin can view any tenant by sending its slug.
   */
  app.get('/analytics/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const slug = request.tenant?.slug;
    if (!slug) throw new AppError('TENANT_REQUIRED', 400, 'Tenant not found');

    const { range } = summaryQuerySchema.parse(request.query ?? {});
    const data = await analytics.getSummary(slug, range);
    return reply.send({ data });
  });
}
