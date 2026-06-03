/**
 * resize-image — client-side image resize + recompress for R2 upload.
 *
 * Why: R2 storage cost scales with bytes. A phone photo is 3–8 MB; the
 * same photo at 1600px wide WebP @ 0.85 is ~150–400 KB. Across thousands
 * of tenants × hundreds of images each, that's 10–50× the storage bill.
 * See [[feedback_image_resize]].
 *
 * Policy: ONE uniform rule across all content types (user directive
 * 2026-06-03: "이미지 사이즈 조정은 모든 컨텐츠에 동일해"). No per-consumer
 * presets — hero, staff avatar, gallery thumb all use the same target.
 * Operational simplicity beats marginal byte savings on small assets.
 *
 * Behavior:
 *   - Skip resize for SVG, PDF, animated GIF (pass through as-is).
 *   - Reject files > 20 MB (almost certainly raw/TIFF/video by mistake).
 *   - Already-small images (< MAX_DIM on both axes AND < 500 KB) upload as-is.
 *   - Output WebP @ 0.85. Browsers without WebP encode support → JPEG @ 0.85.
 *   - EXIF rotation honored via createImageBitmap({ imageOrientation: 'from-image' }).
 *   - Other EXIF stripped (canvas re-encode does this automatically — privacy + bytes).
 */

/**
 * Kept as a type for back-compat (ImageUpload still accepts a `resize`
 * prop). All values map to the same behavior — the parameter is now
 * documentation, not configuration.
 */
export type ResizePreset = 'hero' | 'block' | 'avatar' | 'thumb';

/** Single uniform max longest-edge dimension. 1600px is large enough
 *  for full-width hero on a typical desktop while keeping bytes
 *  reasonable; serving uses Next/image or similar to downscale per
 *  viewport. */
const MAX_DIM = 1600;
const QUALITY = 0.85;
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB
const PASSTHROUGH_TYPES = new Set([
  'image/svg+xml',
  'application/pdf',
]);

export interface ResizeResult {
  blob: Blob;
  /** New File with the resized blob — easy to feed back into FormData. */
  file: File;
  /** Original bytes vs. resized bytes — used by logging / UI for "saved 92%". */
  originalBytes: number;
  resizedBytes: number;
  /** Final mime. Either image/webp or image/jpeg (or original if passthrough). */
  mimeType: string;
  /** True if we just returned the file as-is (animated gif / svg / already small). */
  skipped: boolean;
  skippedReason?: 'svg' | 'pdf' | 'animated' | 'already-small' | 'unsupported';
}

/**
 * Main entrypoint. Always succeeds for valid images, throws only for
 * the explicit reject path (file > 20 MB).
 *
 * The `_preset` argument is accepted for source-level back-compat but
 * intentionally ignored — see policy note at the top of this file
 * (uniform rule per user directive 2026-06-03).
 */
export async function resizeImage(
  file: File,
  _preset: ResizePreset = 'block',
): Promise<ResizeResult> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      `이미지가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
      `20 MB 이하의 이미지를 선택해주세요.`,
    );
  }

  // Passthrough types: SVG, PDF.
  if (PASSTHROUGH_TYPES.has(file.type)) {
    return passthrough(file, file.type === 'image/svg+xml' ? 'svg' : 'pdf');
  }

  // Animated GIF — detect by inspecting bytes (multiple image frames).
  if (file.type === 'image/gif' && await isAnimatedGif(file)) {
    return passthrough(file, 'animated');
  }

  // Decode the image. createImageBitmap is fast (browser-native, may use
  // GPU) and honors EXIF orientation when asked.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return passthrough(file, 'unsupported');
  }

  const { width: srcW, height: srcH } = bitmap;

  // Already small enough — skip the round-trip through canvas. This
  // also avoids accidentally re-encoding an already-optimized image
  // (e.g. a hand-curated logo) and bloating it.
  if (srcW <= MAX_DIM && srcH <= MAX_DIM && file.size < 500 * 1024) {
    bitmap.close();
    return passthrough(file, 'already-small');
  }

  // Compute target dims preserving aspect ratio.
  const scale = Math.min(MAX_DIM / srcW, MAX_DIM / srcH, 1); // never enlarge
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  // Draw onto offscreen canvas (offscreen if supported; falls back to DOM canvas).
  const canvas = createCanvas(dstW, dstH);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return passthrough(file, 'unsupported');
  }
  ctx.drawImage(bitmap, 0, 0, dstW, dstH);
  bitmap.close();

  // Try WebP first. If the browser doesn't support WebP encoding the
  // result will likely be PNG (Safari < 14) → in that case fall back to JPEG.
  let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
  let mimeType = 'image/webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
    mimeType = 'image/jpeg';
  }
  if (!blob) {
    // Last resort — if even JPEG encoding failed, pass original through.
    return passthrough(file, 'unsupported');
  }

  // Rename the file so the server / R2 key reflects the new format.
  const newName = renameWithExtension(file.name, mimeType === 'image/webp' ? '.webp' : '.jpg');
  const resizedFile = new File([blob], newName, { type: mimeType });

  return {
    blob,
    file: resizedFile,
    originalBytes: file.size,
    resizedBytes: blob.size,
    mimeType,
    skipped: false,
  };
}

// ─── helpers ────────────────────────────────────────────────

function passthrough(file: File, reason: NonNullable<ResizeResult['skippedReason']>): ResizeResult {
  return {
    blob: file,
    file,
    originalBytes: file.size,
    resizedBytes: file.size,
    mimeType: file.type,
    skipped: true,
    skippedReason: reason,
  };
}

function createCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  // OffscreenCanvas is faster (renders off-thread when used in a worker;
  // even in main thread it skips DOM layout). Not supported in older
  // Safari — fallback to DOM canvas.
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    try {
      return await canvas.convertToBlob({ type, quality });
    } catch {
      return null;
    }
  }
  return new Promise<Blob | null>((resolve) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => resolve(blob),
      type,
      quality,
    );
  });
}

/**
 * Animated-GIF detection: count Graphic Control Extension blocks
 * (0x21 0xF9) in the file. An animated GIF has >1; a static GIF has 0 or 1.
 * Reading just the first 200 KB is enough — frame headers are early.
 */
async function isAnimatedGif(file: File): Promise<boolean> {
  const slice = file.slice(0, Math.min(file.size, 200 * 1024));
  const buf = new Uint8Array(await slice.arrayBuffer());
  let frames = 0;
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xF9 && buf[i + 2] === 0x04) {
      frames++;
      if (frames > 1) return true;
    }
  }
  return false;
}

function renameWithExtension(originalName: string, newExt: string): string {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return base + newExt;
}
