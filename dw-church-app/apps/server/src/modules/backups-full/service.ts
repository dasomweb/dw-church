import { gzipSync, gunzipSync } from 'node:zlib';
import { prisma } from '../../config/database.js';
import { validateSchemaName, validateSlug } from '../../utils/validate-schema.js';
import { createTenantSchema } from '../../utils/schema-manager.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  MAIN_BUCKET,
  backupBucket,
  isBackupConfigured,
  putBackupObject,
  getBackupObject,
  backupObjectExists,
  listBackupPrefixes,
  listObjects,
  deletePrefix,
  copyObjectsConcurrent,
} from './r2-archive.js';

/**
 * Tenant FULL backup / restore — a durable, self-contained snapshot of a tenant
 * (DB + media) stored in a dedicated R2 backup bucket, modeled on the b2bsmart
 * design. Assumes the worst case: the operational DB and/or the content bucket
 * may be gone, so a backup must be restorable from the backup bucket ALONE.
 *
 * Layout in the backup bucket:
 *   tenants/{slug}/{snapshotId}/
 *     ├─ db.json.gz   full DB dump (every table via to_jsonb), gzipped
 *     ├─ meta.json    time/kind/counts + the public.tenants row (delete-recovery)
 *     └─ files/...     byte-for-byte copies of the tenant's R2 media
 *
 * There is NO backups DB table — the list is the set of R2 folders that contain
 * a meta.json. meta.json is written LAST, so a folder with meta is complete.
 */

export type FullBackupKind = 'manual' | 'pre-delete' | 'pre-build' | 'nightly';

export interface FullBackupMeta {
  snapshotId: string;
  slug: string;
  createdAt: string;
  kind: FullBackupKind;
  includesFiles: boolean;
  tableCount: number;
  rowCount: number;
  fileCount: number;
  fileBytes: number;
  note: string | null;
  createdBy: string | null;
  /** to_jsonb of the public.tenants row, so a deleted tenant can be recreated. */
  tenantRow: Record<string, unknown> | null;
}

interface DbDump {
  slug: string;
  tables: string[];
  data: Record<string, Record<string, unknown>[]>;
}

export { isBackupConfigured };

const ROOT = 'tenants';
function folderFor(slug: string, snapshotId: string): string {
  return `${ROOT}/${validateSlug(slug)}/${snapshotId}/`;
}
function schemaFor(slug: string): string {
  return validateSchemaName(`tenant_${validateSlug(slug)}`);
}

/** Sortable snapshot id: YYYYMMDD-HHmmss-rand (lexical order == chronological). */
function newSnapshotId(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

async function baseTables(schema: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
    schema,
  );
  return rows.map((r) => r.table_name);
}
async function columnsOf(schema: string, table: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
    schema, table,
  );
  return rows.map((r) => r.column_name);
}
async function schemaExists(schema: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ present: boolean }[]>(
    `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS present`, schema,
  );
  return !!rows[0]?.present;
}

/** Dump every table in the tenant schema to JSON via server-side to_jsonb
 *  (native, lossless — timestamps/uuid/jsonb/arrays all round-trip). */
async function dumpDatabase(slug: string): Promise<DbDump> {
  const schema = schemaFor(slug);
  const tables = await baseTables(schema);
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const t of tables) {
    const res = await prisma.$queryRawUnsafe<{ j: Record<string, unknown>[] }[]>(
      `SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) AS j FROM "${schema}"."${t}" x`,
    );
    data[t] = res[0]?.j ?? [];
  }
  return { slug, tables, data };
}

async function tenantRowJson(slug: string): Promise<Record<string, unknown> | null> {
  const rows = await prisma.$queryRawUnsafe<{ r: Record<string, unknown> }[]>(
    `SELECT to_jsonb(t) AS r FROM public.tenants t WHERE slug = $1 LIMIT 1`,
    validateSlug(slug),
  );
  return rows[0]?.r ?? null;
}

/**
 * Create a full backup: DB dump (gzipped) + optional media copy + meta. Meta is
 * written last so an interrupted backup is never listed as complete.
 */
export async function createFullBackup(
  slug: string,
  opts: { kind?: FullBackupKind; includeFiles?: boolean; note?: string | null; createdBy?: string | null } = {},
): Promise<FullBackupMeta> {
  backupBucket(); // throws 503 if unconfigured
  const s = validateSlug(slug);
  const includeFiles = opts.includeFiles !== false; // default: include files
  const snapshotId = newSnapshotId();
  const folder = folderFor(s, snapshotId);

  // 1. DB dump → gzip → db.json.gz
  const dump = await dumpDatabase(s);
  const rowCount = Object.values(dump.data).reduce((n, rows) => n + rows.length, 0);
  const gz = gzipSync(Buffer.from(JSON.stringify(dump)));
  await putBackupObject(`${folder}db.json.gz`, gz, 'application/gzip');

  // 2. Media copy (content bucket → backup bucket), 16 concurrent.
  let fileCount = 0;
  let fileBytes = 0;
  if (includeFiles) {
    const objs = await listObjects(MAIN_BUCKET, `tenant_${s}/`);
    const jobs = objs.map((o) => ({
      srcBucket: MAIN_BUCKET, srcKey: o.key,
      destBucket: backupBucket(), destKey: `${folder}files/${o.key}`,
    }));
    fileCount = await copyObjectsConcurrent(jobs);
    fileBytes = objs.reduce((n, o) => n + o.size, 0);
  }

  // 3. Meta (written last).
  const meta: FullBackupMeta = {
    snapshotId, slug: s, createdAt: new Date().toISOString(),
    kind: opts.kind ?? 'manual', includesFiles: includeFiles,
    tableCount: dump.tables.length, rowCount, fileCount, fileBytes,
    note: opts.note ?? null, createdBy: opts.createdBy ?? null,
    tenantRow: await tenantRowJson(s),
  };
  await putBackupObject(`${folder}meta.json`, Buffer.from(JSON.stringify(meta)), 'application/json');
  return meta;
}

/** List a tenant's full backups (newest first). Reads each folder's meta.json;
 *  folders without a meta (interrupted) are skipped. */
export async function listFullBackups(slug: string): Promise<FullBackupMeta[]> {
  if (!isBackupConfigured()) return [];
  const s = validateSlug(slug);
  const ids = await listBackupPrefixes(`${ROOT}/${s}/`);
  const metas: FullBackupMeta[] = [];
  for (const id of ids) {
    try {
      const buf = await getBackupObject(`${folderFor(s, id)}meta.json`);
      metas.push(JSON.parse(buf.toString('utf8')) as FullBackupMeta);
    } catch {
      // No/broken meta — incomplete snapshot, skip.
    }
  }
  metas.sort((a, b) => (a.snapshotId < b.snapshotId ? 1 : -1));
  return metas;
}

/**
 * Restore a tenant to a snapshot (full overwrite). Worst-case safe: validates
 * the dump before touching anything, recreates the schema + tenants row if the
 * tenant was deleted, then replaces DB rows (one transaction, FK-off) and
 * optionally the media files.
 */
export async function restoreFullBackup(
  slug: string,
  snapshotId: string,
  opts: { restoreFiles?: boolean } = {},
): Promise<{ tables: number; rows: number; filesRestored: number }> {
  backupBucket();
  const s = validateSlug(slug);
  const folder = folderFor(s, snapshotId);
  if (!(await backupObjectExists(`${folder}meta.json`))) {
    throw new AppError('BACKUP_NOT_FOUND', 404, '백업을 찾을 수 없습니다.');
  }

  // 1. Read + validate the DB dump FIRST — never touch live if it's broken.
  let dump: DbDump;
  try {
    dump = JSON.parse(gunzipSync(await getBackupObject(`${folder}db.json.gz`)).toString('utf8')) as DbDump;
  } catch {
    throw new AppError('BACKUP_CORRUPT', 409, '백업 DB 덤프가 손상되어 복원할 수 없습니다.');
  }
  if (!dump?.data || typeof dump.data !== 'object') {
    throw new AppError('BACKUP_CORRUPT', 409, '백업 DB 덤프 형식이 올바르지 않습니다.');
  }
  const meta = JSON.parse((await getBackupObject(`${folder}meta.json`)).toString('utf8')) as FullBackupMeta;

  const schema = schemaFor(s);

  // 2. Worst case — tenant was deleted: recreate the registry row + schema.
  const tenantRow = meta.tenantRow;
  if (tenantRow) {
    const exists = await prisma.$queryRawUnsafe<{ present: boolean }[]>(
      `SELECT EXISTS(SELECT 1 FROM public.tenants WHERE slug = $1) AS present`, s,
    );
    if (!exists[0]?.present) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.tenants SELECT * FROM jsonb_populate_record(NULL::public.tenants, $1::jsonb)`,
        JSON.stringify(tenantRow),
      );
    }
  }
  if (!(await schemaExists(schema))) {
    await createTenantSchema(s, (tenantRow?.name as string) || (tenantRow?.church_name as string) || undefined);
  }

  // 3. Replace DB rows in one transaction (FK off, drift-safe column intersection).
  const liveTables = await baseTables(schema);
  const liveSet = new Set(liveTables);
  let rows = 0;
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica'`);
      const truncList = liveTables.map((t) => `"${schema}"."${t}"`).join(', ');
      if (truncList) await tx.$executeRawUnsafe(`TRUNCATE TABLE ${truncList} CASCADE`);
      for (const [table, tableRows] of Object.entries(dump.data)) {
        if (!liveSet.has(table) || !tableRows.length) continue; // dropped table / empty
        const liveCols = await columnsOf(schema, table);
        const jsonKeys = new Set(Object.keys(tableRows[0]!));
        const cols = liveCols.filter((c) => jsonKeys.has(c));
        if (!cols.length) continue;
        const colList = cols.map((c) => `"${c}"`).join(', ');
        // jsonb_populate_recordset casts each JSON row to the CURRENT table type
        // natively (all pg types, incl. arrays); we select the columns present
        // in both so schema drift since the backup can't break the insert.
        await tx.$executeRawUnsafe(
          `INSERT INTO "${schema}"."${table}" (${colList})
           SELECT ${colList} FROM jsonb_populate_recordset(NULL::"${schema}"."${table}", $1::jsonb)`,
          JSON.stringify(tableRows),
        );
        rows += tableRows.length;
      }
    },
    { timeout: 180_000, maxWait: 20_000 },
  );

  // 4. Optional media restore — wipe current tenant files, copy the backup back.
  let filesRestored = 0;
  if (opts.restoreFiles) {
    await deletePrefix(MAIN_BUCKET, `tenant_${s}/`);
    const prefix = `${folder}files/`;
    const backupFiles = await listObjects(backupBucket(), prefix);
    const jobs = backupFiles.map((o) => ({
      srcBucket: backupBucket(), srcKey: o.key,
      destBucket: MAIN_BUCKET, destKey: o.key.slice(prefix.length),
    }));
    filesRestored = await copyObjectsConcurrent(jobs);
  }

  return { tables: liveTables.length, rows, filesRestored };
}

/** Delete a full backup (its whole R2 folder). */
export async function deleteFullBackup(slug: string, snapshotId: string): Promise<void> {
  backupBucket();
  const s = validateSlug(slug);
  await deletePrefix(backupBucket(), folderFor(s, snapshotId));
}

/** Pure: which snapshotIds to prune — nightly backups beyond the newest `keep`.
 *  Manual / pre-delete / pre-build backups are never selected. Input may be in
 *  any order; selection is by snapshotId (lexical == chronological). */
export function pickPrunableNightly(metas: FullBackupMeta[], keep: number): string[] {
  const nightly = metas
    .filter((m) => m.kind === 'nightly')
    .sort((a, b) => (a.snapshotId < b.snapshotId ? 1 : -1)); // newest first
  return nightly.slice(keep).map((m) => m.snapshotId);
}

/** Keep only the newest `keep` nightly backups for a tenant; delete older
 *  nightly ones. Manual / pre-delete / pre-build backups are never pruned. */
export async function pruneNightly(slug: string, keep = 7): Promise<number> {
  const all = await listFullBackups(slug);
  const toPrune = pickPrunableNightly(all, keep);
  for (const id of toPrune) await deleteFullBackup(slug, id);
  return toPrune.length;
}
