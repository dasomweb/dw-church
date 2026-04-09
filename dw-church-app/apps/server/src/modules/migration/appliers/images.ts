/**
 * Image Applier — downloads external images and uploads to R2.
 * Returns a URL map: originalUrl → r2Url for other appliers to use.
 */

import { uploadFile as r2Upload } from '../../../config/r2.js';
import { randomUUID } from 'crypto';

const USER_AGENT = 'TrueLight-Migration/2.0';

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

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());

    // Skip files > 5MB
    if (buffer.length > 5 * 1024 * 1024) return imageUrl;

    const ext = contentType.includes('png') ? '.png'
      : contentType.includes('webp') ? '.webp'
      : contentType.includes('gif') ? '.gif'
      : '.jpg';
    const key = `tenant_${tenantSlug}/migration/${randomUUID()}${ext}`;
    return await r2Upload(key, buffer, contentType);
  } catch {
    return imageUrl;
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
