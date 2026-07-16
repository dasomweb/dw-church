import { prisma } from '../../config/database.js';
import { validateSchemaName, validateSlug } from '../../utils/validate-schema.js';
import { AppError } from '../../middleware/error-handler.js';

/**
 * Tenant backup / restore — a general-purpose, multi-version version of the
 * demo-tenant snapshot machinery (see modules/demo-tenant/service.ts).
 *
 * A backup is an in-database copy of every table in `tenant_{slug}` into a
 * sibling schema `tenant_{slug}_b_{code}` via `CREATE TABLE AS` (native pg
 * types, no JSON round-trip — the same proven approach the demo reset uses).
 * Metadata lives in public.tenant_backups so many versions can be listed,
 * restored, and pruned.
 *
 * SCOPE: this backs up the tenant's DATABASE content (pages, settings, and all
 * content-module rows). Uploaded media in R2 is NOT copied — restore only
 * rewrites DB rows, and TRUNCATE/INSERT never triggers the app-level R2 cascade
 * delete, so existing media files stay in place and the restored rows keep
 * pointing at them. (The only broken case is restoring rows whose media was
 * hard-deleted through the admin after the backup — an accepted edge.)
 *
 * SAFETY: restore first captures an automatic pre-restore backup of the current
 * state, so an unwanted restore is itself reversible.
 */

// Keep at most this many backups per tenant (manual + automatic combined). The
// newest are kept; older ones are dropped when a new backup pushes over.
const MAX_BACKUPS_PER_TENANT = 20;

export type BackupKind = 'manual' | 'auto';

export interface BackupRow {
  id: string;
  slug: string;
  schemaName: string;
  kind: BackupKind;
  note: string | null;
  tableCount: number;
  sizeBytes: number;
  createdBy: string | null;
  createdAt: string;
}

function liveSchemaFor(slug: string): string {
  return validateSchemaName(`tenant_${validateSlug(slug)}`);
}

/**
 * Build (and validate) a unique backup schema name. base36 timestamp + a short
 * random tail keeps it unique and well under Postgres's 63-char identifier
 * limit for any realistic slug.
 */
export function buildBackupSchemaName(slug: string): string {
  const code = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const name = `tenant_${validateSlug(slug)}_b_${code}`;
  if (name.length > 63) {
    throw new AppError('SLUG_TOO_LONG', 400, '슬러그가 너무 길어 백업 스키마 이름을 만들 수 없습니다.');
  }
  return validateSchemaName(name);
}

/** Which backups to drop so only the newest MAX_BACKUPS_PER_TENANT remain. */
export function selectPrunable<T>(orderedNewestFirst: T[], keep = MAX_BACKUPS_PER_TENANT): T[] {
  return orderedNewestFirst.slice(keep);
}

async function ensureBackupTable(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS public.tenant_backups (
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       slug         TEXT NOT NULL,
       schema_name  TEXT NOT NULL UNIQUE,
       kind         TEXT NOT NULL DEFAULT 'manual',
       note         TEXT,
       table_count  INT NOT NULL DEFAULT 0,
       size_bytes   BIGINT NOT NULL DEFAULT 0,
       created_by   TEXT,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS tenant_backups_slug_time ON public.tenant_backups (slug, created_at DESC)`,
  );
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

async function schemaExists(schema: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ present: boolean }[]>(
    `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS present`,
    schema,
  );
  return !!rows[0]?.present;
}

async function schemaSizeBytes(schema: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ bytes: bigint }[]>(
    `SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0)::bigint AS bytes
     FROM pg_tables WHERE schemaname = $1`,
    schema,
  );
  return Number(rows[0]?.bytes ?? 0);
}

function toRow(r: {
  id: string; slug: string; schema_name: string; kind: string; note: string | null;
  table_count: number; size_bytes: bigint | number; created_by: string | null; created_at: Date;
}): BackupRow {
  return {
    id: r.id,
    slug: r.slug,
    schemaName: r.schema_name,
    kind: (r.kind === 'auto' ? 'auto' : 'manual'),
    note: r.note,
    tableCount: Number(r.table_count),
    sizeBytes: Number(r.size_bytes),
    createdBy: r.created_by,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/** List a tenant's backups, newest first. */
export async function listBackups(slug: string): Promise<BackupRow[]> {
  await ensureBackupTable();
  const rows = await prisma.$queryRawUnsafe<Parameters<typeof toRow>[0][]>(
    `SELECT * FROM public.tenant_backups WHERE slug = $1 ORDER BY created_at DESC`,
    validateSlug(slug),
  );
  return rows.map(toRow);
}

/** Prune backups beyond the retention cap for this tenant (drops schema + row). */
async function pruneOld(slug: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ id: string; schema_name: string }[]>(
    `SELECT id, schema_name FROM public.tenant_backups WHERE slug = $1 ORDER BY created_at DESC`,
    slug,
  );
  for (const old of selectPrunable(rows)) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${validateSchemaName(old.schema_name)}" CASCADE`);
    await prisma.$executeRawUnsafe(`DELETE FROM public.tenant_backups WHERE id = $1::uuid`, old.id);
  }
}

/**
 * Capture the tenant's current DB state into a new backup schema and record it.
 * `kind='auto'` is used for the automatic pre-restore safety backup.
 */
export async function createBackup(
  slug: string,
  opts: { note?: string | null; createdBy?: string | null; kind?: BackupKind } = {},
): Promise<BackupRow> {
  await ensureBackupTable();
  const live = liveSchemaFor(slug);
  if (!(await schemaExists(live))) {
    throw new AppError('TENANT_NOT_FOUND', 404, `테넌트 스키마가 없습니다: ${live}`);
  }
  const snap = buildBackupSchemaName(slug);
  const tables = await baseTables(live);

  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${snap}"`);
  for (const t of tables) {
    // CREATE TABLE AS copies data + column types exactly — no JSON round-trip,
    // no constraints (a data backup, not a structural clone).
    await prisma.$executeRawUnsafe(`CREATE TABLE "${snap}"."${t}" AS TABLE "${live}"."${t}"`);
  }
  const sizeBytes = await schemaSizeBytes(snap);

  const inserted = await prisma.$queryRawUnsafe<Parameters<typeof toRow>[0][]>(
    `INSERT INTO public.tenant_backups (slug, schema_name, kind, note, table_count, size_bytes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    validateSlug(slug),
    snap,
    opts.kind ?? 'manual',
    opts.note ?? null,
    tables.length,
    sizeBytes,
    opts.createdBy ?? null,
  );
  await pruneOld(slug);
  return toRow(inserted[0]!);
}

/**
 * Restore the tenant from one of its backups. Captures an automatic pre-restore
 * backup first (so the restore is reversible), then TRUNCATEs every live table
 * and re-copies from the backup schema. FK enforcement is disabled (replica
 * role, auto-reset on commit); a column-intersection INSERT survives schema
 * drift (columns added by boot ALTERs after the backup was taken).
 */
export async function restoreBackup(
  slug: string,
  backupId: string,
  opts: { createdBy?: string | null } = {},
): Promise<{ tables: number; safetyBackupId: string }> {
  await ensureBackupTable();
  const found = await prisma.$queryRawUnsafe<{ schema_name: string }[]>(
    `SELECT schema_name FROM public.tenant_backups WHERE id = $1::uuid AND slug = $2`,
    backupId,
    validateSlug(slug),
  );
  const backupSchema = found[0]?.schema_name;
  if (!backupSchema) {
    throw new AppError('BACKUP_NOT_FOUND', 404, '백업을 찾을 수 없습니다.');
  }
  const snap = validateSchemaName(backupSchema);
  if (!(await schemaExists(snap))) {
    throw new AppError('BACKUP_MISSING_SCHEMA', 409, '백업 데이터가 손상되었습니다(스키마 없음).');
  }

  // Safety net — snapshot the current state before we overwrite it.
  const safety = await createBackup(slug, {
    kind: 'auto',
    note: '복원 직전 자동 백업',
    createdBy: opts.createdBy ?? null,
  });

  const live = liveSchemaFor(slug);
  const liveTables = await baseTables(live);
  const snapTables = new Set(await baseTables(snap));

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica'`);
      const truncList = liveTables.map((t) => `"${live}"."${t}"`).join(', ');
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${truncList} CASCADE`);
      for (const t of liveTables) {
        if (!snapTables.has(t)) continue; // table added after the backup — leave empty
        const liveCols = await columnsOf(live, t);
        const snapCols = new Set(await columnsOf(snap, t));
        const cols = liveCols.filter((c) => snapCols.has(c));
        if (cols.length === 0) continue;
        const colList = cols.map((c) => `"${c}"`).join(', ');
        await tx.$executeRawUnsafe(
          `INSERT INTO "${live}"."${t}" (${colList}) SELECT ${colList} FROM "${snap}"."${t}"`,
        );
      }
    },
    { timeout: 120_000, maxWait: 15_000 },
  );

  return { tables: liveTables.length, safetyBackupId: safety.id };
}

/** Delete a single backup (drops its schema + metadata row). */
export async function deleteBackup(slug: string, backupId: string): Promise<void> {
  await ensureBackupTable();
  const found = await prisma.$queryRawUnsafe<{ schema_name: string }[]>(
    `SELECT schema_name FROM public.tenant_backups WHERE id = $1::uuid AND slug = $2`,
    backupId,
    validateSlug(slug),
  );
  const schemaName = found[0]?.schema_name;
  if (!schemaName) {
    throw new AppError('BACKUP_NOT_FOUND', 404, '백업을 찾을 수 없습니다.');
  }
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${validateSchemaName(schemaName)}" CASCADE`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.tenant_backups WHERE id = $1::uuid`, backupId);
}
