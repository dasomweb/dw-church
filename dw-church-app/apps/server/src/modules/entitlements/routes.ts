import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  effectiveFeatures,
  planAllowsFeature,
  normalizePlan,
  addonFeatures,
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

const featurePriceBody = z.object({
  label: z.string().max(60).optional(),
  monthly: z.number().int().min(0).max(100000).optional(),
  yearly: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
});

interface FeaturePriceRow {
  feature_key: string; label: string; monthly: number; yearly: number; sort_order: number; is_active: boolean;
}

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

  // ── Feature à-la-carte price catalog (super-admin) ──────────────────
  app.get('/admin/feature-pricing', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    const rows = await prisma.$queryRawUnsafe<FeaturePriceRow[]>(
      `SELECT feature_key, label, monthly, yearly, sort_order, is_active FROM public.feature_pricing ORDER BY sort_order ASC`,
    );
    return reply.send({ data: rows });
  });

  app.put('/admin/feature-pricing/:key', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { key } = req.params as { key: string };
    const body = featurePriceBody.parse(req.body ?? {});
    const map: Record<string, string> = { label: 'label', monthly: 'monthly', yearly: 'yearly', isActive: 'is_active' };
    const set: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [k, col] of Object.entries(map)) {
      const v = (body as Record<string, unknown>)[k];
      if (v !== undefined) { set.push(`"${col}" = $${i++}`); values.push(v); }
    }
    if (set.length === 0) {
      const cur = await prisma.$queryRawUnsafe<FeaturePriceRow[]>(`SELECT * FROM public.feature_pricing WHERE feature_key = $1`, key);
      return reply.send({ data: cur[0] ?? null });
    }
    set.push('updated_at = NOW()');
    const rows = await prisma.$queryRawUnsafe<FeaturePriceRow[]>(
      `UPDATE public.feature_pricing SET ${set.join(', ')} WHERE feature_key = $${i} RETURNING feature_key, label, monthly, yearly, sort_order, is_active`,
      ...values, key,
    );
    if (!rows[0]) throw new AppError('NOT_FOUND', 404, '기능 단가를 찾을 수 없습니다.');
    return reply.send({ data: rows[0] });
  });

  // ── Tenant billing summary: plan price + add-ons beyond the plan ────
  app.get('/admin/tenants/:id/billing-summary', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const trows = await prisma.$queryRawUnsafe<{ plan: string; feature_overrides: Record<string, unknown> | null }[]>(
      `SELECT plan, feature_overrides FROM public.tenants WHERE id = $1::uuid`, id,
    );
    if (!trows[0]) throw new AppError('NOT_FOUND', 404, '테넌트를 찾을 수 없습니다.');
    const plan = normalizePlan(trows[0].plan);
    const overrides = trows[0].feature_overrides ?? {};

    const planRows = await prisma.$queryRawUnsafe<{ monthly: number; yearly: number; label: string }[]>(
      `SELECT monthly, yearly, label FROM public.plan_pricing WHERE plan_key = $1`, plan,
    );
    const planPrice = { monthly: Number(planRows[0]?.monthly ?? 0), yearly: Number(planRows[0]?.yearly ?? 0), label: planRows[0]?.label ?? plan };

    const addonKeys = addonFeatures(trows[0].plan, overrides);
    const priceRows = await prisma.$queryRawUnsafe<FeaturePriceRow[]>(
      `SELECT feature_key, label, monthly, yearly, sort_order, is_active FROM public.feature_pricing ORDER BY sort_order ASC`,
    );
    const addons = priceRows
      .filter((r) => addonKeys.includes(r.feature_key) && r.is_active)
      .map((r) => ({ key: r.feature_key, label: r.label, monthly: Number(r.monthly), yearly: Number(r.yearly) }));
    const addonMonthly = addons.reduce((s, a) => s + a.monthly, 0);
    const addonYearly = addons.reduce((s, a) => s + a.yearly, 0);

    return reply.send({
      data: {
        plan, planPrice, addons, addonMonthly, addonYearly,
        totalMonthly: planPrice.monthly + addonMonthly,
        totalYearly: planPrice.yearly + addonYearly,
      },
    });
  });
}
