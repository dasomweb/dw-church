/**
 * One-off: re-host lagrangechurch album images on R2.
 *
 * The 07:00 migration ran on Railway (datacenter egress), where the source
 * WAF blocked image downloads, so every album fell back to HOTLINKING
 * lagrangechurch.org. Next's image optimizer can't fetch those (WAF/remote-
 * pattern), so featured images render blank. Fetched from here (local egress)
 * the static uploads return 200, so we download → resize (≤1920px webp, the
 * same policy as appliers/images.ts) → R2 → rewrite each album's
 * thumbnail_url + images[] to the R2 URLs.
 *
 * Live creds injected via process.env (from `railway variables`).
 * Run:  pnpm --filter @dw-church/server exec tsx scripts/rehost-album-images.mts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const SCHEMA = 'tenant_lagrangechurch';
const MAX_WIDTH = 1920;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const fileEnv: Record<string, string> = {};
const ep = resolve(process.cwd(), '.env');
if (existsSync(ep)) for (const l of readFileSync(ep, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) fileEnv[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const E = (k: string) => process.env[k] || fileEnv[k] || '';
process.env.DATABASE_URL = E('DATABASE_URL');

const s3 = new S3Client({ region: 'auto', endpoint: E('R2_ENDPOINT'), credentials: { accessKeyId: E('R2_ACCESS_KEY_ID'), secretAccessKey: E('R2_SECRET_ACCESS_KEY') } });
const bucket = E('R2_BUCKET_NAME');
const base = E('R2_PUBLIC_URL').replace(/\/$/, '');
const prisma = new PrismaClient();

const isR2 = (u: string) => u.includes('r2.dev/') || u.includes('r2.cloudflarestorage.com');

/** Download + resize→webp + upload. Returns R2 url, or '' on any failure. */
async function rehost(srcUrl: string): Promise<string> {
  try {
    const res = await fetch(srcUrl, { redirect: 'follow', headers: { 'User-Agent': UA, 'Referer': 'https://lagrangechurch.org/' } });
    if (!res.ok) { console.warn(`  ${res.status} ${srcUrl}`); return ''; }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.startsWith('image/')) { console.warn(`  not image (${ct}) ${srcUrl}`); return ''; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 15 * 1024 * 1024) { console.warn(`  bad size ${buf.length} ${srcUrl}`); return ''; }
    let out: Buffer, ext: string, outCt: string;
    if (ct.includes('svg')) { out = buf; ext = '.svg'; outCt = 'image/svg+xml'; }
    else if (ct.includes('gif')) { out = buf; ext = '.gif'; outCt = 'image/gif'; }
    else {
      out = await sharp(buf).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      ext = '.webp'; outCt = 'image/webp';
    }
    const key = `${SCHEMA}/albums/${randomUUID()}${ext}`;
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: out, ContentType: outCt }));
    return `${base}/${key}`;
  } catch (err) {
    console.warn(`  FAIL ${srcUrl}: ${err instanceof Error ? err.message : String(err)}`);
    return '';
  }
}

async function main() {
  const albums = await prisma.$queryRawUnsafe<{ id: string; thumbnail_url: string | null; images: string[] | null }[]>(
    `SELECT id, thumbnail_url, COALESCE(images, '[]'::jsonb) AS images FROM "${SCHEMA}".albums ORDER BY created_at`,
  );
  console.log(`albums: ${albums.length}`);

  // Collect distinct source URLs to migrate (skip empties + already-R2).
  const urls = new Set<string>();
  for (const a of albums) {
    if (a.thumbnail_url && !isR2(a.thumbnail_url)) urls.add(a.thumbnail_url);
    for (const u of a.images ?? []) if (u && !isR2(u)) urls.add(u);
  }
  console.log(`distinct source images: ${urls.size}`);

  const map = new Map<string, string>();
  let done = 0;
  const list = [...urls];
  for (let i = 0; i < list.length; i += 5) {
    const batch = list.slice(i, i + 5);
    const res = await Promise.all(batch.map(async (u) => ({ u, r2: await rehost(u) })));
    for (const { u, r2 } of res) map.set(u, r2);
    done += batch.length;
    console.log(`  …${done}/${list.size ?? list.length} processed`);
  }
  const okCount = [...map.values()].filter(Boolean).length;
  console.log(`re-hosted ${okCount}/${urls.size} images`);

  // Rewrite each album's URLs.
  let updated = 0;
  for (const a of albums) {
    const newImages = (a.images ?? [])
      .map((u) => (isR2(u) ? u : (map.get(u) ?? '')))
      .filter((u) => u.length > 0);
    let newThumb = a.thumbnail_url && !isR2(a.thumbnail_url) ? (map.get(a.thumbnail_url) ?? '') : (a.thumbnail_url ?? '');
    if (!newThumb) newThumb = newImages[0] ?? '';
    await prisma.$executeRawUnsafe(
      `UPDATE "${SCHEMA}".albums SET images = $1::jsonb, thumbnail_url = $2, updated_at = NOW() WHERE id = $3::uuid`,
      JSON.stringify(newImages), newThumb || null, a.id,
    );
    updated++;
  }
  console.log(`\n=== DONE: albums updated=${updated} ===`);

  const left = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int n FROM "${SCHEMA}".albums WHERE thumbnail_url LIKE '%lagrangechurch.org%' OR images::text LIKE '%lagrangechurch.org%'`,
  );
  const onR2 = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int n FROM "${SCHEMA}".albums WHERE thumbnail_url LIKE '%r2.dev%'`,
  );
  console.log(`albums still hotlinking source: ${left[0].n} | thumbnail on R2: ${onR2[0].n}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
