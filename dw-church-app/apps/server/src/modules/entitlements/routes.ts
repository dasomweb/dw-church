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
  isAddon,
  isFeatureEffective,
  FEATURE_KEYS,
  FEATURE_LABELS,
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

  // PUBLIC — storefront hard-gating. Returns the effective feature map for the
  // current tenant (X-Tenant-Slug) so the public site can skip rendering blocks
  // whose add-on is OFF (예: 스몰그룹 미사용 시 목장 블록 숨김). No auth: this only
  // exposes which features are enabled, which the rendered page already reveals.
  app.get('/storefront/features', async (req, reply) => {
    const tenant = req.tenant;
    if (!tenant?.id) return reply.send({ data: { features: {} } });
    const overrides = await overridesForTenant(tenant.id);
    return reply.send({ data: { features: effectiveFeatures(tenant.plan, overrides) } });
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

  // Push the tenant's add-ons to Stripe (explicit — never auto). Phase 2 billing.
  app.post('/admin/tenants/:id/billing/sync-addons', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { syncTenantAddons } = await import('../billing/service.js');
    return reply.send({ data: await syncTenantAddons(id) });
  });

  // ── Add-on requests: 테넌트 자가 신청 → 슈퍼어드민 승인 = 활성 (대표님 2026-09-07) ─
  interface AddonRequestRow {
    id: string; tenant_id: string; feature_key: string; status: string; note: string;
    requested_by: string; resolved_by: string; created_at: string; resolved_at: string | null;
  }

  // 테넌트가 볼 수 있는 애드온 목록 + 상태(사용중/신청됨/신청가능) + 단가.
  app.get('/admin/addon-marketplace', { preHandler: [requireAuth] }, async (req, reply) => {
    const tenant = req.tenant;
    if (!tenant?.id) throw new AppError('NO_TENANT', 400, '테넌트를 확인할 수 없습니다.');
    const overrides = await overridesForTenant(tenant.id);
    const priceRows = await prisma.$queryRawUnsafe<FeaturePriceRow[]>(
      `SELECT feature_key, label, monthly, yearly, sort_order, is_active FROM public.feature_pricing ORDER BY sort_order ASC`,
    );
    const pending = await prisma.$queryRawUnsafe<AddonRequestRow[]>(
      `SELECT feature_key, status FROM public.addon_requests WHERE tenant_id = $1::uuid AND status = 'requested'`,
      tenant.id,
    );
    const pendingSet = new Set(pending.map((p) => p.feature_key));
    // 마켓플레이스에서 숨길 키 — 'cells'(목장)는 스몰그룹 애드온으로 통합되어 별도
    // 신청 대상이 아니다(대표님 2026-09-07).
    const HIDDEN = new Set(['cells']);
    // 애드온(어느 티어에도 미포함)만 노출. 활성 여부는 의존성까지 반영.
    const items = priceRows
      .filter((r) => r.is_active && isAddon(r.feature_key) && !HIDDEN.has(r.feature_key))
      .map((r) => ({
        key: r.feature_key,
        label: FEATURE_LABELS[r.feature_key] ?? r.label,
        monthly: Number(r.monthly),
        yearly: Number(r.yearly),
        active: isFeatureEffective(tenant.plan, overrides, r.feature_key),
        requested: pendingSet.has(r.feature_key),
      }));
    return reply.send({ data: items });
  });

  // 테넌트가 애드온을 신청.
  const requestBody = z.object({ featureKey: z.string().max(40), note: z.string().max(1000).optional() });
  app.post('/admin/addon-requests', { preHandler: [requireAuth] }, async (req, reply) => {
    const tenant = req.tenant;
    if (!tenant?.id) throw new AppError('NO_TENANT', 400, '테넌트를 확인할 수 없습니다.');
    const { featureKey, note } = requestBody.parse(req.body ?? {});
    // 'cells'(목장)는 스몰그룹에 통합 — 별도 신청 불가.
    if (!isAddon(featureKey) || featureKey === 'cells') throw new AppError('BAD_FEATURE', 400, '신청할 수 없는 기능입니다.');
    const overrides = await overridesForTenant(tenant.id);
    if (isFeatureEffective(tenant.plan, overrides, featureKey)) {
      throw new AppError('ALREADY_ACTIVE', 400, '이미 사용 중인 기능입니다.');
    }
    const who = (req.user?.email ?? req.user?.id ?? '') as string;
    try {
      const rows = await prisma.$queryRawUnsafe<AddonRequestRow[]>(
        `INSERT INTO public.addon_requests (tenant_id, feature_key, note, requested_by)
         VALUES ($1::uuid, $2, $3, $4) RETURNING *`,
        tenant.id, featureKey, note ?? '', who,
      );
      return reply.status(201).send({ data: rows[0] });
    } catch {
      // 부분 유니크(pending) 위반 = 이미 신청됨.
      throw new AppError('ALREADY_REQUESTED', 409, '이미 신청한 기능입니다. 검토 중입니다.');
    }
  });

  // 슈퍼어드민 신청함 — 대기/전체 목록(테넌트명 조인).
  app.get('/admin/addon-requests', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { status, tenantId } = req.query as { status?: string; tenantId?: string };
    const clauses: string[] = [];
    const args: unknown[] = [];
    if (status) { clauses.push(`r.status = $${args.length + 1}`); args.push(status); }
    if (tenantId) { clauses.push(`r.tenant_id = $${args.length + 1}::uuid`); args.push(tenantId); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await prisma.$queryRawUnsafe<(AddonRequestRow & { tenant_name: string; tenant_slug: string })[]>(
      `SELECT r.*, t.name AS tenant_name, t.slug AS tenant_slug
       FROM public.addon_requests r JOIN public.tenants t ON t.id = r.tenant_id
       ${where} ORDER BY r.created_at DESC LIMIT 500`,
      ...args,
    );
    const withLabel = rows.map((r) => ({ ...r, feature_label: FEATURE_LABELS[r.feature_key] ?? r.feature_key }));
    return reply.send({ data: withLabel });
  });

  // 슈퍼어드민 승인/거절. 승인 시 feature_overrides 에 반영(=활성). 청구는 기능권한의
  // Stripe 반영으로 별도 확정.
  const resolveBody = z.object({ status: z.enum(['approved', 'rejected']) });
  app.put('/admin/addon-requests/:id', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = resolveBody.parse(req.body ?? {});
    const reqRows = await prisma.$queryRawUnsafe<AddonRequestRow[]>(
      `SELECT * FROM public.addon_requests WHERE id = $1::uuid`, id,
    );
    const ar = reqRows[0];
    if (!ar) throw new AppError('NOT_FOUND', 404, '신청을 찾을 수 없습니다.');
    const who = (req.user?.email ?? req.user?.id ?? '') as string;

    if (status === 'approved') {
      // 대상 기능을 feature_overrides 에 true 로 설정(기존 override 보존).
      const trows = await prisma.$queryRawUnsafe<{ plan: string; feature_overrides: Record<string, unknown> | null }[]>(
        `SELECT plan, feature_overrides FROM public.tenants WHERE id = $1::uuid`, ar.tenant_id,
      );
      if (!trows[0]) throw new AppError('NOT_FOUND', 404, '테넌트를 찾을 수 없습니다.');
      const ov = { ...(trows[0].feature_overrides ?? {}) } as Record<string, boolean>;
      ov[ar.feature_key] = true;
      // 의존 애드온이면 선행(교적 등)도 함께 켜 준다(fail-safe 정합).
      const deps = (await import('../../config/plan-limits.js')).featureDeps(ar.feature_key);
      for (const d of deps) ov[d] = true;
      const clean: Record<string, boolean> = {};
      for (const key of FEATURE_KEYS) if (typeof ov[key] === 'boolean') clean[key] = ov[key];
      await prisma.$executeRawUnsafe(
        `UPDATE public.tenants SET feature_overrides = $1::jsonb WHERE id = $2::uuid`,
        JSON.stringify(clean), ar.tenant_id,
      );
    }
    await prisma.$executeRawUnsafe(
      `UPDATE public.addon_requests SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3::uuid`,
      status, who, id,
    );
    return reply.send({ data: { id, status } });
  });
}
