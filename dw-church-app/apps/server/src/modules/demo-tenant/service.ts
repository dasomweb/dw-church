import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';

/**
 * Demo tenant lifecycle — the church customers test on. A "golden snapshot" of
 * its current content is captured into a sibling schema; a nightly job restores
 * from it so testers' garbage data is wiped.
 *
 * The slug is HARDCODED (env-overridable) so the destructive restore can NEVER
 * hit another tenant by accident — only the demo tenant is ever touched.
 */
export const DEMO_SLUG = (process.env.DEMO_TENANT_SLUG || 'dasom').toLowerCase();

function schemaFor(slug: string): string {
  return validateSchemaName(`tenant_${slug}`);
}
function snapSchemaFor(slug: string): string {
  return validateSchemaName(`tenant_${slug}_snapshot`);
}

async function baseTables(schema: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    schema,
  );
  return rows.map((r) => r.table_name);
}

async function columnsOf(schema: string, table: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2`,
    schema,
    table,
  );
  return rows.map((r) => r.column_name);
}

export async function hasSnapshot(slug: string): Promise<boolean> {
  // `exists` is a reserved word — alias must be quoted/renamed or Postgres throws
  // "syntax error at or near EXISTS".
  const rows = await prisma.$queryRawUnsafe<{ present: boolean }[]>(
    `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS present`,
    snapSchemaFor(slug),
  );
  return !!rows[0]?.present;
}

/** Capture the tenant's current content into tenant_{slug}_snapshot (replaces any prior snapshot). */
export async function captureSnapshot(slug: string): Promise<{ tables: number }> {
  const schema = schemaFor(slug);
  const snap = snapSchemaFor(slug);
  const tables = await baseTables(schema);
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${snap}" CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${snap}"`);
  for (const t of tables) {
    // CREATE TABLE AS copies data + column types exactly (no JSON round-trip,
    // no constraints needed — this is a data snapshot, not a structural clone).
    await prisma.$executeRawUnsafe(`CREATE TABLE "${snap}"."${t}" AS TABLE "${schema}"."${t}"`);
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.demo_snapshots (slug, table_count, taken_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (slug) DO UPDATE SET table_count = EXCLUDED.table_count, taken_at = NOW()`,
    slug,
    tables.length,
  );
  return { tables: tables.length };
}

/**
 * Restore the tenant from its snapshot — TRUNCATE every live table, then re-copy
 * from the snapshot. FK enforcement is disabled (SET LOCAL, auto-reset on commit)
 * so table order is irrelevant; column-intersection INSERT survives schema drift
 * (columns added by boot ALTERs after the snapshot was taken).
 */
export async function restoreSnapshot(slug: string): Promise<{ tables: number }> {
  if (!(await hasSnapshot(slug))) {
    throw new Error(`No snapshot exists for tenant '${slug}' — capture one first.`);
  }
  const schema = schemaFor(slug);
  const snap = snapSchemaFor(slug);
  const liveTables = await baseTables(schema);
  const snapTables = new Set(await baseTables(snap));

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica'`);
      // Truncate every live table in ONE statement with CASCADE — TRUNCATE enforces
      // its own FK check even under replica role, and listing all tenant tables
      // together (CASCADE) clears them without the order problem.
      const truncList = liveTables.map((t) => `"${schema}"."${t}"`).join(', ');
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${truncList} CASCADE`);
      for (const t of liveTables) {
        if (!snapTables.has(t)) continue; // table added after the snapshot — leave empty
        const liveCols = await columnsOf(schema, t);
        const snapCols = new Set(await columnsOf(snap, t));
        const cols = liveCols.filter((c) => snapCols.has(c));
        if (cols.length === 0) continue;
        const colList = cols.map((c) => `"${c}"`).join(', ');
        // session_replication_role='replica' suppresses FK trigger firing on
        // INSERT, so parent/child insert order is irrelevant.
        await tx.$executeRawUnsafe(
          `INSERT INTO "${schema}"."${t}" (${colList}) SELECT ${colList} FROM "${snap}"."${t}"`,
        );
      }
    },
    { timeout: 120_000, maxWait: 15_000 },
  );
  return { tables: liveTables.length };
}

export async function snapshotStatus(slug: string): Promise<{ exists: boolean; takenAt: string | null; tableCount: number | null }> {
  const exists = await hasSnapshot(slug);
  const rows = await prisma.$queryRawUnsafe<{ taken_at: Date; table_count: number }[]>(
    `SELECT taken_at, table_count FROM public.demo_snapshots WHERE slug = $1`,
    slug,
  );
  const row = rows[0];
  return { exists, takenAt: row?.taken_at ? new Date(row.taken_at).toISOString() : null, tableCount: row?.table_count ?? null };
}
