import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  effectiveFeatures,
  planAllowsFeature,
  normalizePlan,
  FEATURE_KEYS,
} from '../../config/plan-limits.js';

/**
 * Plan entitlements — what a tenant can see/use, from plan defaults plus
 * super-admin per-tenant overrides (tenants.feature_overrides). The admin app
 * gates the sidebar nav + the page-editor block picker on this.
 *
 *   GET /admin/entitlements                       — effective features for the
 *        CURRENT tenant (X-Tenant-Slug → request.tenant); works for both a
 *        tenant admin (own slug) and the super-admin console (target slug).
 *   GET /admin/tenants/:id/feature-overrides      — plan + overrides + defaults
 *   PUT /admin/tenants/:id/feature-overrides       — save overrides (super-admin)
 */
const overridesBody = z.object({
  overrides: z.record(z.boolean()),
});

async function overridesForTenant(id: string): Promise<Record<string, unknown>> {
  const rows = await prisma.$queryRawUnsafe<{ feature_overrides: Record<string, unknown> | null }[]>(
    `SELECT feature_overrides FROM public.tenants WHERE id = $1::uuid`,
    id,
  );
  return rows[0]?.feature_overrides ?? {};
}

export async function entitlementRoutes(app: FastifyInstance) {
  app.get('/admin/entitlements', { preHandler: [requireAuth] }, async (req, reply) => {
    // request.tenant is resolved from X-Tenant-Slug (tenant admin sends its own
    // slug; the super-admin console sends the target tenant's slug).
    const tenant = req.tenant;
    if (!tenant?.id) throw new AppError('NO_TENANT', 400, '테넌트를 확인할 수 없습니다.');
    const overrides = await overridesForTenant(tenant.id);
    return reply.send({
      data: { plan: normalizePlan(tenant.plan), features: effectiveFeatures(tenant.plan, overrides) },
    });
  });

  app.get('/admin/tenants/:id/feature-overrides', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await prisma.$queryRawUnsafe<{ plan: string; feature_overrides: Record<string, unknown> | null }[]>(
      `SELECT plan, feature_overrides FROM public.tenants WHERE id = $1::uuid`,
      id,
    );
    if (!rows[0]) throw new AppError('NOT_FOUND', 404, '테넌트를 찾을 수 없습니다.');
    const plan = normalizePlan(rows[0].plan);
    const overrides = rows[0].feature_overrides ?? {};
    // defaults = what the plan grants for each feature (before overrides).
    const defaults: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) defaults[key] = planAllowsFeature(rows[0].plan, key);
    return reply.send({ data: { plan, defaults, overrides, effective: effectiveFeatures(rows[0].plan, overrides) } });
  });

  app.put('/admin/tenants/:id/feature-overrides', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { overrides } = overridesBody.parse(req.body ?? {});
    // Keep only known feature keys so the column can't accumulate junk.
    const clean: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) if (typeof overrides[key] === 'boolean') clean[key] = overrides[key];
    const rows = await prisma.$queryRawUnsafe<{ plan: string; feature_overrides: Record<string, unknown> }[]>(
      `UPDATE public.tenants SET feature_overrides = $1::jsonb WHERE id = $2::uuid RETURNING plan, feature_overrides`,
      JSON.stringify(clean),
      id,
    );
    if (!rows[0]) throw new AppError('NOT_FOUND', 404, '테넌트를 찾을 수 없습니다.');
    return reply.send({ data: { plan: normalizePlan(rows[0].plan), overrides: clean, effective: effectiveFeatures(rows[0].plan, clean) } });
  });
}
