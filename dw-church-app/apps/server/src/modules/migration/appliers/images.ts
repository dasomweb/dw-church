/**
 * Image Applier — downloads external images and uploads to R2.
 * Returns a URL map: originalUrl → r2Url for other appliers to use.
 */

import { uploadFile as r2Upload } from '../../../config/r2.js';
import { prisma } from '../../../config/database.js';
import { validateSchemaName } from '../../../utils/validate-schema.js';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

/**
 * Register a migrated image in the tenant's `files` table so it shows up in the
 * media library (미디어) and the operator can reuse it. Best-effort: a failure
 * here must not break the migration — the image already works via its URL.
 */
async function registerMigratedFile(
  tenantSlug: string,
  storageKey: string,
  url: string,
  mimeType: string,
  sizeBytes: number,
  sourceUrl: string,
): Promise<void> {
  try {
    const schema = validateSchemaName(`tenant_${tenantSlug}`);
    const name = (sourceUrl.split('/').pop()?.split('?')[0]) || 'migrated-image';
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".files
         (original_name, storage_key, url, mime_type, size_bytes, entity_type, kind, tags, description)
       VALUES ($1, $2, $3, $4, $5, 'migration', 'upload', NULL, $6)`,
      name,
      storageKey,
      url,
      mimeType,
      sizeBytes,
      '마이그레이션으로 가져온 이미지',
    );
  } catch {
    // Non-fatal — the image still works via its R2 URL.
  }
}

const USER_AGENT = 'TrueLight-Migration/2.0';

// Max width by image KIND (사장님 directive 2026-06-10, mirrors the client-side
// resize-image.ts policy): content photos → 1000px, background/hero → 1920px
// (full-bleed banner width). Self-hosting phone-camera originals is forbidden —
// storage waste is a hard constraint. Smaller images are left as is
// (withoutEnlargement). SVG/GIF pass through untouched (vector / animation
// would be degraded by a raster+webp re-encode).
export type ImageKind = 'content' | 'background';
const MAX_WIDTH: Record<ImageKind, number> = { content: 1000, background: 1920 };

async function resizeForR2(
  buffer: Buffer,
  contentType: string,
  kind: ImageKind = 'content',
): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  const ct = contentType.toLowerCase();
  if (ct.includes('svg')) {
    // Validate it's actually SVG markup — WAF/error pages also arrive as
    // text/* and would otherwise be stored as a broken .svg.
    if (!buffer.subarray(0, 2000).toString('utf8').toLowerCase().includes('<svg')) return null;
    return { buffer, contentType, ext: '.svg' };
  }
  if (ct.includes('gif')) {
    // GIF magic bytes "GIF8" — reject anything that isn't really a GIF.
    if (buffer.subarray(0, 4).toString('ascii') !== 'GIF8') return null;
    return { buffer, contentType, ext: '.gif' };
  }
  try {
    const out = await sharp(buffer)
      .rotate() // respect EXIF orientation before stripping metadata
      .resize({ width: MAX_WIDTH[kind], withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: out, contentType: 'image/webp', ext: '.webp' };
  } catch (err) {
    // Not a decodable image — almost always a WAF JS-challenge / error HTML
    // page served with a 200. DO NOT upload it: storing the garbage bytes as
    // .jpg is exactly what produced the broken "Failed to load image" banners.
    // Return null so the caller skips this URL entirely.
    console.log(`[migration] not a valid image, skipping (${contentType}): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export type ImageUrlMap = Map<string, string>;

/**
 * Migrate a single image to R2. Returns R2 URL or original on failure.
 */
export async function migrateImageToR2(
  imageUrl: string,
  tenantSlug: string,
  kind: ImageKind = 'content',
): Promise<string> {
  if (!imageUrl || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.includes('r2.dev/') || imageUrl.includes('r2.cloudflarestorage.com')) return imageUrl;

  // On ANY failure we return '' (skip), never the original URL — hotlinking the
  // source is forbidden, and storing a broken object is worse than no image.
  // An empty result clears the field (hero falls back to its gradient, content
  // images drop out) instead of rendering a broken-image icon.
  try {
    const res = await fetch(imageUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return '';

    const srcContentType = res.headers.get('content-type') || '';
    // WAF/challenge/error pages come back as text/html (or json) with 200 —
    // never an image. Reject by content-type before we even decode.
    if (srcContentType && !srcContentType.toLowerCase().startsWith('image/')) return '';

    const srcBuffer = Buffer.from(await res.arrayBuffer());
    if (srcBuffer.length === 0) return '';
    // Skip originals > 15MB (we downscale, so large source photos still end up
    // small in R2 after the 1920px/webp pass).
    if (srcBuffer.length > 15 * 1024 * 1024) return '';

    // Resize + webp before upload: content → ≤1000px, background → ≤1920px.
    // Returns null when the bytes aren't a real image → skip, don't upload.
    const resized = await resizeForR2(srcBuffer, srcContentType || 'image/jpeg', kind);
    if (!resized) return '';
    const key = `tenant_${tenantSlug}/migration/${randomUUID()}${resized.ext}`;
    const url = await r2Upload(key, resized.buffer, resized.contentType);
    // Make it browsable in the tenant's media library.
    await registerMigratedFile(tenantSlug, key, url, resized.contentType, resized.buffer.length, imageUrl);
    return url;
  } catch {
    return '';
  }
}

/**
 * Migrate a non-image FILE (e.g. a bulletin PDF) to R2 — downloaded and
 * re-hosted as-is (no image processing). Never hotlink the source: the
 * original site can disappear or block hotlinking. Returns the R2 URL, or the
 * original URL on failure.
 */
export async function migrateFileToR2(
  fileUrl: string,
  tenantSlug: string,
): Promise<string> {
  if (!fileUrl || fileUrl.startsWith('data:')) return fileUrl;
  if (fileUrl.includes('r2.dev/') || fileUrl.includes('r2.cloudflarestorage.com')) return fileUrl;
  try {
    const res = await fetch(fileUrl, { redirect: 'follow', headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return fileUrl;
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 50 * 1024 * 1024) return fileUrl; // 50MB cap
    // Preserve the file extension from the URL path; fall back to content-type.
    const urlExt = ((fileUrl.split('?')[0]?.match(/\.([a-z0-9]{2,5})$/i)?.[1]) || '').toLowerCase();
    const ext = urlExt ? `.${urlExt}` : contentType.includes('pdf') ? '.pdf' : '.bin';
    const key = `tenant_${tenantSlug}/migration/${randomUUID()}${ext}`;
    return await r2Upload(key, buffer, contentType);
  } catch {
    return fileUrl;
  }
}

/**
 * Migrate a batch of images to R2.
 * Returns a map of original URL → R2 URL.
 */
export async function migrateImages(
  imageUrls: string[],
  tenantSlug: string,
  onProgress?: (done: number, total: number) => void,
  /** URLs that are hero/full-bleed backgrounds → resized to 1920px instead of
   *  the 1000px content default. Everything else is treated as content. */
  backgroundUrls?: Set<string>,
): Promise<ImageUrlMap> {
  const urlMap: ImageUrlMap = new Map();
  const unique = [...new Set(imageUrls.filter((u) => u && !u.startsWith('data:')))];
  let done = 0;

  // Process in batches of 5 to avoid overwhelming the network
  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (url) => {
        const kind: ImageKind = backgroundUrls?.has(url) ? 'background' : 'content';
        const r2Url = await migrateImageToR2(url, tenantSlug, kind);
        return { original: url, r2: r2Url };
      }),
    );
    for (const { original, r2 } of results) {
      urlMap.set(original, r2);
    }
    done += batch.length;
    onProgress?.(done, unique.length);
  }

  return urlMap;
}

/**
 * Replace image URLs in a props object using the URL map.
 */
export function replaceImageUrls(
  props: Record<string, unknown>,
  urlMap: ImageUrlMap,
): Record<string, unknown> {
  const result = { ...props };

  // Single image fields. A mapped value of '' means migration skipped a broken
  // source image — clear the field so the block renders its fallback (e.g. the
  // hero gradient) instead of a broken-image icon, and never hotlink the source.
  for (const key of ['imageUrl', 'photoUrl', 'thumbnailUrl', 'topImageUrl', 'backgroundImageUrl']) {
    const cur = result[key];
    if (typeof cur === 'string' && urlMap.has(cur)) {
      result[key] = urlMap.get(cur);
    }
  }

  // Image array fields — replace migrated URLs, drop any that failed ('').
  if (Array.isArray(result.images)) {
    result.images = (result.images as string[])
      .map((url) => (urlMap.has(url) ? urlMap.get(url)! : url))
      .filter((url) => typeof url === 'string' && url.length > 0);
  }

  return result;
}
