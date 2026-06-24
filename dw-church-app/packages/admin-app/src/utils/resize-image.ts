/**
 * resize-image — client-side image resize + recompress for R2 upload.
 *
 * Why: R2 storage cost scales with bytes and big images tank page-load
 * speed. A phone photo is 3–8 MB; the same photo capped to the target
 * width as JPEG is ~150–500 KB. Across thousands of tenants × hundreds of
 * images, that's 10–50× the storage bill + far slower sites. See
 * [[feedback_image_resize]].
 *
 * Policy (user directive 2026-06-09 — OVERRIDES the earlier "uniform
 * 1600 WebP" rule): resize by KIND, output JPEG.
 *   - background : max width 1920px  (hero / banner / full-bleed slots)
 *   - content    : max width 1000px  (everything else — DEFAULT)
 *   - Output: JPEG (사장님: "jpg 파일로"). White matte under transparency.
 *
 * Behavior:
 *   - Skip resize for SVG, PDF, animated GIF (pass through as-is).
 *   - Reject files > 20 MB (almost certainly raw/TIFF/video by mistake).
 *   - Width-capped (never enlarged); height scales to preserve aspect.
 *   - EXIF rotation honored via createImageBitmap({ imageOrientation }).
 *   - Other EXIF stripped by the canvas re-encode (privacy + bytes).
 *
 * EVERY image/background upload path must run a file through here before
 * it hits the network. New upload call sites included.
 */

/** Upload slot kind → target width. */
export type ImageKind = 'background' | 'content';

/**
 * Back-compat preset union — older call sites (ImageUpload `resize` prop)
 * pass these. 'hero'/'background' → background (1920); everything else →
 * content (1000). New code should pass ImageKind directly.
 */
export type ResizePreset = 'hero' | 'block' | 'avatar' | 'thumb' | ImageKind;

const TARGET_WIDTH: Record<ImageKind, number> = {
  background: 1920,
  content: 1000,
};
const QUALITY = 0.82;
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'application/pdf']);

export interface ResizeResult {
  blob: Blob;
  /** New File with the resized blob — easy to feed back into FormData. */
  file: File;
  originalBytes: number;
  resizedBytes: number;
  /** Final mime — image/jpeg, or the original mime for passthrough. */
  mimeType: string;
  skipped: boolean;
  skippedReason?: 'svg' | 'pdf' | 'animated' | 'unsupported';
}

/** Map any preset/kind to the canonical ImageKind. */
export function normalizeImageKind(k: ResizePreset | ImageKind | undefined): ImageKind {
  return k === 'hero' || k === 'background' ? 'background' : 'content';
}

/**
 * Main entrypoint. Always succeeds for valid images, throws only for the
 * explicit reject path (file > 20 MB). `kind` selects the target width:
 * 'background' (1920) for hero/banner/full-bleed, 'content' (1000) default.
 */
/**
 * Output format:
 *   'jpeg' (default) — re-encode to JPEG with a white matte (사장님 bytes directive
 *           for photos). Smallest files, but DESTROYS transparency.
 *   'auto'  — preserve the source format: a PNG stays a transparent PNG (no white
 *           matte), everything else becomes JPEG. Use for logos/favicons/icons
 *           where the PNG type + alpha channel MUST be kept (still resized/shrunk).
 *   'png'   — always output PNG (transparency preserved).
 */
export type OutputFormat = 'jpeg' | 'auto' | 'png';

export interface ResizeOptions {
  format?: OutputFormat;
}

export async function resizeImage(
  file: File,
  kind: ResizePreset | ImageKind = 'content',
  opts: ResizeOptions = {},
): Promise<ResizeResult> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      `이미지가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
      `20 MB 이하의 이미지를 선택해주세요.`,
    );
  }

  // Passthrough types: SVG (vector — resizing is meaningless), PDF.
  if (PASSTHROUGH_TYPES.has(file.type)) {
    return passthrough(file, file.type === 'image/svg+xml' ? 'svg' : 'pdf');
  }

  // Animated GIF — re-encoding to JPEG would drop the animation, so keep it.
  if (file.type === 'image/gif' && (await isAnimatedGif(file))) {
    return passthrough(file, 'animated');
  }

  const targetW = TARGET_WIDTH[normalizeImageKind(kind)];

  // Decode (browser-native, may use GPU; honors EXIF orientation).
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return passthrough(file, 'unsupported');
  }

  const { width: srcW, height: srcH } = bitmap;
  // Width-capped, never enlarged (사장님: "width 1920/1000px").
  const scale = Math.min(targetW / srcW, 1);
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  // Decide the output encoding. 'auto' preserves a PNG source (keeps the file
  // type + alpha channel — required for logos/favicons); otherwise JPEG.
  const format = opts.format ?? 'jpeg';
  const outputType =
    format === 'png'
      ? 'image/png'
      : format === 'auto' && file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg';
  const keepAlpha = outputType === 'image/png';

  const canvas = createCanvas(dstW, dstH);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) {
    bitmap.close();
    return passthrough(file, 'unsupported');
  }
  // White matte so transparent PNGs don't turn black under JPEG (which has no
  // alpha). Skipped when keeping PNG output so transparency survives.
  if (!keepAlpha) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, dstW, dstH);
  }
  ctx.drawImage(bitmap, 0, 0, dstW, dstH);
  bitmap.close();

  // PNG is lossless — the quality arg is ignored by the encoder.
  const blob = await canvasToBlob(canvas, outputType, keepAlpha ? 1 : QUALITY);
  if (!blob) {
    return passthrough(file, 'unsupported');
  }

  const newName = renameWithExtension(file.name, keepAlpha ? '.png' : '.jpg');
  const resizedFile = new File([blob], newName, { type: outputType });

  return {
    blob,
    file: resizedFile,
    originalBytes: file.size,
    resizedBytes: blob.size,
    mimeType: outputType,
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
    (canvas as HTMLCanvasElement).toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Animated-GIF detection: count Graphic Control Extension blocks
 * (0x21 0xF9 0x04) in the first 200 KB. >1 → animated.
 */
async function isAnimatedGif(file: File): Promise<boolean> {
  const slice = file.slice(0, Math.min(file.size, 200 * 1024));
  const buf = new Uint8Array(await slice.arrayBuffer());
  let frames = 0;
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) {
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
