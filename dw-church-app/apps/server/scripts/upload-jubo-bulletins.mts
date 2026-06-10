/**
 * One-off: upload migrated 주보 PDFs into the lagrangechurch tenant.
 *
 * Phase A (bash, already run) crawled https://lagrangechurch.org/jubo/ — a
 * KBoard document board — downloaded every bulletin PDF to /tmp/jubo_pdfs/ and
 * wrote /tmp/manifest.tsv:  uid \t date(YYYY-MM-DD) \t pdfName \t sourceUrl \t localPath
 *
 * This phase: each PDF → R2 (tenant_lagrangechurch/bulletins/<uuid>.pdf),
 * then upsert a bulletins row (idempotent on source_url = the doc permalink).
 *
 * Self-contained on purpose: parses apps/server/.env directly and builds its
 * own S3 + Prisma clients so it doesn't pull in env.ts's JWT_SECRET et al.
 *
 * Run:  pnpm --filter @dw-church/server exec tsx scripts/upload-jubo-bulletins.mts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const TENANT = 'lagrangechurch';
const SCHEMA = `tenant_${TENANT}`;
// Phase A wrote the manifest + PDFs here (under the repo so the Windows Node
// process can read them by absolute path — bash /tmp ≠ Windows /tmp).
const DATA_DIR = resolve(process.cwd(), '.jubo-data');
const MANIFEST = resolve(DATA_DIR, 'manifest.tsv');

// ── parse .env (KEY=VALUE, ignore comments/quotes) ──
function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

// Live creds are injected via process.env (from `railway variables`); the
// committed .env is stale (points at an abandoned Supabase pooler). Prefer
// process.env, fall back to the .env file for anything not injected.
const envPath = resolve(process.cwd(), '.env');
const fileEnv = existsSync(envPath) ? loadEnv(envPath) : {};
const env: Record<string, string> = {};
for (const k of ['DATABASE_URL', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
  env[k] = process.env[k] || fileEnv[k] || '';
}
for (const k of ['DATABASE_URL', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']) {
  if (!env[k]) throw new Error(`Missing ${k} (set it in the environment or ${envPath})`);
}
process.env.DATABASE_URL = env.DATABASE_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const bucket = env.R2_BUCKET_NAME;
const prisma = new PrismaClient();

/** Derive the R2 public base from an existing file URL (R2_PUBLIC_URL is empty locally). */
async function resolvePublicBase(): Promise<string> {
  if (env.R2_PUBLIC_URL) return env.R2_PUBLIC_URL.replace(/\/$/, '');
  const rows = await prisma.$queryRawUnsafe<{ url: string; storage_key: string }[]>(
    `SELECT url, storage_key FROM "${SCHEMA}".files
     WHERE url LIKE 'http%' AND storage_key IS NOT NULL AND url LIKE '%' || storage_key
     ORDER BY created_at DESC LIMIT 1`,
  );
  if (rows[0]) {
    const { url, storage_key } = rows[0];
    return url.slice(0, url.length - storage_key.length).replace(/\/$/, '');
  }
  // Fallback: any tenant's file
  const any = await prisma.$queryRawUnsafe<{ url: string }[]>(
    `SELECT url FROM "${SCHEMA}".files WHERE url LIKE 'http%' LIMIT 1`,
  );
  if (any[0]) {
    const u = new URL(any[0].url);
    return `${u.protocol}//${u.host}`;
  }
  throw new Error('Could not derive R2 public base — no existing file URL found. Set R2_PUBLIC_URL in .env.');
}

interface Row { uid: string; date: string; pdfName: string; sourceUrl: string; localPath: string; }

function readManifest(): Row[] {
  if (!existsSync(MANIFEST)) throw new Error(`Manifest not found: ${MANIFEST}`);
  return readFileSync(MANIFEST, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const [uid, date, pdfName, sourceUrl, localPath] = l.split('\t');
      return { uid, date, pdfName, sourceUrl, localPath };
    });
}

async function main() {
  // tenant exists?
  const exists = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM information_schema.schemata WHERE schema_name = $1`, SCHEMA,
  );
  if (!exists[0]?.n) throw new Error(`Schema ${SCHEMA} does not exist`);

  // idempotency column + partial unique index (harmless if already present)
  await prisma.$executeRawUnsafe(`ALTER TABLE "${SCHEMA}".bulletins ADD COLUMN IF NOT EXISTS "source_url" TEXT`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "bulletins_source_url_key" ON "${SCHEMA}".bulletins ("source_url") WHERE "source_url" IS NOT NULL`,
  );

  const base = await resolvePublicBase();
  console.log(`R2 public base: ${base}`);

  const rows = readManifest();
  console.log(`Manifest rows: ${rows.length}`);

  let uploaded = 0, skipped = 0, failed = 0;
  for (const r of rows) {
    try {
      if (!r.date) { console.warn(`uid ${r.uid}: no date — skipping`); skipped++; continue; }
      const buf = readFileSync(resolve(DATA_DIR, r.localPath));
      if (buf.subarray(0, 4).toString() !== '%PDF') { console.warn(`uid ${r.uid}: not a PDF — skipping`); skipped++; continue; }

      const key = `${SCHEMA}/bulletins/${randomUUID()}.pdf`;
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf, ContentType: 'application/pdf' }));
      const pdfUrl = `${base}/${key}`;
      const title = `${r.date} 주보`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "${SCHEMA}".bulletins (title, bulletin_date, pdf_url, images, status, source_url)
         VALUES ($1, $2::date, $3, '[]'::jsonb, 'published', $4)
         ON CONFLICT (source_url) WHERE source_url IS NOT NULL
         DO UPDATE SET title = EXCLUDED.title, bulletin_date = EXCLUDED.bulletin_date,
                       pdf_url = EXCLUDED.pdf_url, updated_at = NOW()`,
        title, r.date, pdfUrl, r.sourceUrl,
      );
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  …${uploaded} uploaded`);
    } catch (err) {
      console.error(`uid ${r.uid}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  const total = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM "${SCHEMA}".bulletins`,
  );
  console.log(`\n=== DONE: uploaded/upserted=${uploaded} skipped=${skipped} failed=${failed} ===`);
  console.log(`Total bulletins now in ${SCHEMA}: ${total[0]?.n}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
