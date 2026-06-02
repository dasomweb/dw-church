/**
 * Theme set endpoints (Phase 10-α).
 *
 * Curated ThemeSet catalog ships in @dw-church/theme-sets (code, not DB).
 * v1 routes:
 *   GET  /admin/theme-sets                       list (meta only)
 *   GET  /admin/theme-sets/:id                   detail (full ThemeSet incl tokens + pageTemplates)
 *   POST /admin/tenants/:tenantId/apply-theme-set body: { themeSetId }
 *     → updates tenants.selected_theme_set_id
 *     → writes selected set's tokens into tenant_<slug>.themes (tokensV2)
 *       so storefront BrandTokensStyle picks it up immediately.
 *
 * Storefront read path (GET /theme/tokens) doesn't need to change —
 * `tokensV2` is the source of truth and apply-theme-set populates it.
 * Phase 10-η will re-route the read through theme set lookup so override
 * vs base separation is explicit; for now we materialize the snapshot.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ALL_THEME_SETS, findThemeSet } from '@dw-church/theme-sets';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';

const applyInputSchema = z.object({
  themeSetId: z.string().min(1),
});

export default async function themeSetsRoutes(app: FastifyInstance): Promise<void> {
  // GET /admin/theme-sets — list (meta only — preview/picker UI)
  app.get('/admin/theme-sets', { preHandler: [requireAuth] }, async (request, reply) => {
    if (request.user?.role !== 'super_admin') {
      throw new AppError('FORBIDDEN', 403, 'Super admin access required');
    }
    return reply.send({
      data: ALL_THEME_SETS.map((s) => s.meta),
    });
  });

  // GET /admin/theme-sets/:id — detail (preview에서 tokens + 페이지 템플릿 확인용)
  app.get<{ Params: { id: string } }>(
    '/admin/theme-sets/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (request.user?.role !== 'super_admin') {
        throw new AppError('FORBIDDEN', 403, 'Super admin access required');
      }
      const set = findThemeSet(request.params.id);
      if (!set) throw new AppError('NOT_FOUND', 404, `Theme set "${request.params.id}" not found`);
      return reply.send({ data: set });
    },
  );

  // POST /admin/tenants/:tenantId/apply-theme-set
  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/admin/tenants/:tenantId/apply-theme-set',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (request.user?.role !== 'super_admin') {
        throw new AppError('FORBIDDEN', 403, 'Super admin access required');
      }
      const body = applyInputSchema.parse(request.body);
      const themeSet = findThemeSet(body.themeSetId);
      if (!themeSet) {
        throw new AppError('NOT_FOUND', 404, `Theme set "${body.themeSetId}" not found`);
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: request.params.tenantId },
      });
      if (!tenant) throw new AppError('NOT_FOUND', 404, 'Tenant not found');

      // 1) Persist the selection on the tenant row (drives future
      //    lookups when override layer lands in Phase 10-η).
      await prisma.$executeRawUnsafe(
        `UPDATE "tenants" SET "selected_theme_set_id" = $1 WHERE id = $2::uuid`,
        themeSet.meta.id,
        tenant.id,
      );

      // 2) Materialize the snapshot into the tenant's theme row so the
      //    existing /theme/tokens read path picks it up without changes.
      //    tokensV2 wins over legacy colors/fonts (mapThemeRow projection).
      const schema = validateSchemaName(`tenant_${tenant.slug}`);
      const existing = await prisma.$queryRawUnsafe<{ id: string; settings: Record<string, unknown> }[]>(
        `SELECT id, settings FROM "${schema}".themes WHERE is_active = true LIMIT 1`,
      );
      const currentSettings = (existing[0]?.settings ?? {}) as Record<string, unknown>;
      const merged = {
        ...currentSettings,
        tokensV2: themeSet.tokens,
        // Layout 정보도 같이 저장해 Phase 10-η 가 storefront 에서 활용할 수
        // 있도록 함 (현재는 storefront 가 BORDER_RADIUS_MAP 등 옛 데이터 사용,
        // 다음 Phase 에서 themeSetLayout 으로 교체).
        themeSetLayout: themeSet.layout,
      };

      if (existing.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "${schema}".themes SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          JSON.stringify(merged),
          existing[0]!.id,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schema}".themes (name, is_active, settings) VALUES ('modern', true, $1::jsonb)`,
          JSON.stringify(merged),
        );
      }

      return reply.send({
        data: {
          tenantId: tenant.id,
          themeSetId: themeSet.meta.id,
          themeSetName: themeSet.meta.name,
        },
      });
    },
  );
}
