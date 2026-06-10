/**
 * One-off correction: album photos are CONTENT images → 1000px width, not the
 * 1920px the first re-host pass used (1920 is for background/hero only).
 * Downsizes each tenant_lagrangechurch/albums/* R2 object in place (GET →
 * resize ≤1000px webp → PUT same key), so album rows need no change.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const PREFIX = 'tenant_lagrangechurch/albums/';
const MAX_WIDTH = 1000;

const fileEnv: Record<string, string> = {};
const ep = resolve(process.cwd(), '.env');
if (existsSync(ep)) for (const l of readFileSync(ep, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) fileEnv[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const E = (k: string) => process.env[k] || fileEnv[k] || '';
const s3 = new S3Client({ region: 'auto', endpoint: E('R2_ENDPOINT'), credentials: { accessKeyId: E('R2_ACCESS_KEY_ID'), secretAccessKey: E('R2_SECRET_ACCESS_KEY') } });
const bucket = E('R2_BUCKET_NAME');

async function listAll(): Promise<string[]> {
  const keys: string[] = []; let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function main() {
  const keys = await listAll();
  console.log(`album objects: ${keys.length}`);
  let done = 0, shrunk = 0, skipped = 0, before = 0, after = 0;
  for (const key of keys) {
    done++;
    if (!/\.webp$/i.test(key)) { skipped++; continue; } // svg/gif left as-is
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buf = Buffer.from(await obj.Body!.transformToByteArray());
    before += buf.length;
    const meta = await sharp(buf).metadata();
    if ((meta.width ?? 0) <= MAX_WIDTH) { after += buf.length; skipped++; continue; } // already small enough
    const out = await sharp(buf).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: out, ContentType: 'image/webp' }));
    after += out.length; shrunk++;
    if (done % 20 === 0) console.log(`  …${done}/${keys.length}`);
  }
  console.log(`\n=== DONE: shrunk=${shrunk} skipped=${skipped} of ${keys.length} ===`);
  console.log(`bytes: ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
