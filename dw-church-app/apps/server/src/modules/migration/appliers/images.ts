/**
 * Image Applier — downloads external images and uploads to R2.
 * Returns a URL map: originalUrl → r2Url for other appliers to use.
 */

import { uploadFile as r2Upload } from '../../../config/r2.js';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const USER_AGENT = 'TrueLight-Migration/2.0';

// Max width for migrated raster images. Hero/background photos must come down
// to 1920px (full-bleed banner width) instead of self-hosting phone-camera
// originals — storage waste is a hard constraint. Smaller images are left as
// is (withoutEnlargement). SVG/GIF are passed through untouched (vector /
// animation would be degraded by a raster+webp re-encode).
const MAX_WIDTH = 1920;

async function resizeForR2(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  const ct = contentType.toLowerCase();
  if (ct.includes('svg') || ct.includes('gif')) {
    const ext = ct.includes('svg') ? '.svg' : '.gif';
    return { buffer, contentType, ext };
  }
  try {
    const out = await sharp(buffer)
      .rotate() // respect EXIF orientation before stripping metadata
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: out, contentType: 'image/webp', ext: '.webp' };
  } catch (err) {
    // Unreadable/corrupt image — fall back to the original bytes.
    console.log(`[migration] sharp resize failed (${contentType}): ${err instanceof Error ? err.message : String(err)}`);
    const ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : '.jpg';
    return { buffer, contentType, ext };
  }
}

export type ImageUrlMap = Map<string, string>;

/**
 * Migrate a single image to R2. Returns R2 URL or original on failure.
 */
export async function migrateImageToR2(
  imageUrl: string,
  tenantSlug: string,
): Promise<string> {
  if (!imageUrl || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.includes('r2.dev/') || imageUrl.includes('r2.cloudflarestorage.com')) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return imageUrl;

    const srcContentType = res.headers.get('content-type') || 'image/jpeg';
    const srcBuffer = Buffer.from(await res.arrayBuffer());

    // Skip originals > 15MB (raised from 5MB — we downscale, so large source
    // photos still end up small in R2 after the 1920px/webp pass).
    if (srcBuffer.length > 15 * 1024 * 1024) return imageUrl;

    // Resize to ≤1920px + webp before upload (backgrounds, content, all).
    const { buffer, contentType, ext } = await resizeForR2(srcBuffer, srcContentType);
    const key = `tenant_${tenantSlug}/migration/${randomUUID()}${ext}`;
    return await r2Upload(key, buffer, contentType);
  } catch {
    return imageUrl;
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
): Promise<ImageUrlMap> {
  const urlMap: ImageUrlMap = new Map();
  const unique = [...new Set(imageUrls.filter((u) => u && !u.startsWith('data:')))];
  let done = 0;

  // Process in batches of 5 to avoid overwhelming the network
  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (url) => {
        const r2Url = await migrateImageToR2(url, tenantSlug);
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

  // Single image fields
  for (const key of ['imageUrl', 'photoUrl', 'thumbnailUrl', 'topImageUrl', 'backgroundImageUrl']) {
    if (typeof result[key] === 'string' && urlMap.has(result[key] as string)) {
      result[key] = urlMap.get(result[key] as string);
    }
  }

  // Image array fields
  if (Array.isArray(result.images)) {
    result.images = (result.images as string[]).map(
      (url) => urlMap.get(url) || url,
    );
  }

  return result;
}
