import { prisma } from '../../config/database.js';

const TABLE = 'public.site_intake';

export async function getIntake(tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE tenant_slug = $1`,
    tenantSlug,
  );
  return rows[0] ?? null;
}

/** Upsert the draft data for a tenant (does not change a 'submitted'/'built' status). */
export async function saveIntake(tenantSlug: string, plan: string, data: unknown) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (tenant_slug, plan, data, status)
     VALUES ($1, $2, $3::jsonb, 'draft')
     ON CONFLICT (tenant_slug) DO UPDATE
       SET data = EXCLUDED.data, plan = EXCLUDED.plan, updated_at = NOW()
     RETURNING *`,
    tenantSlug,
    plan,
    JSON.stringify(data ?? {}),
  );
  return rows[0];
}

export async function submitIntake(tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET status = 'submitted', updated_at = NOW() WHERE tenant_slug = $1 RETURNING *`,
    tenantSlug,
  );
  return rows[0] ?? null;
}

/** Super-admin marks the intake as built (after running the AI builder with it). */
export async function setBuilt(tenantSlug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET status = 'built', updated_at = NOW() WHERE tenant_slug = $1 RETURNING *`,
    tenantSlug,
  );
  return rows[0] ?? null;
}

export async function listSubmitted() {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT tenant_slug, plan, status, updated_at FROM ${TABLE} ORDER BY updated_at DESC`,
  );
}
