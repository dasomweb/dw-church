// Direct image generation — dw-church has no separate agents microservice
// (the ported b2bsmart code proxied to apps/agents). The api-server already
// has GEMINI_API_KEY, so we call Google's Imagen directly and store the result
// in R2, returning the public URL. Used by the AI builder image endpoints
// when AGENTS_BASE_URL / INTERNAL_SERVICE_TOKEN aren't configured.
import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env.js';
import { uploadFile } from '../../../config/r2.js';

// variant → Imagen aspectRatio.
const VARIANT_ASPECT: Record<string, string> = {
  hero: '16:9',
  section: '4:3',
  square: '1:1',
};

// Try newest → stable. Imagen `:predict` guarantees exact aspect ratio.
const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001',
  'imagen-3.0-generate-002',
];

export function directImageGenAvailable(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/**
 * Generate an image from a text prompt via Imagen, store it in R2, return the
 * public URL. Throws on failure (no key / all models failed / no image).
 */
export async function generateAndStoreImage(opts: {
  prompt: string;
  variant?: string;
  tenantSlug: string;
}): Promise<{ url: string; model: string }> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const aspectRatio = VARIANT_ASPECT[opts.variant ?? 'section'] ?? '4:3';

  let lastErr = '';
  for (const model of IMAGEN_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${env.GEMINI_API_KEY}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: opts.prompt }],
          parameters: { aspectRatio, sampleCount: 1 },
        }),
      });
    } catch (e) {
      lastErr = `fetch failed: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
    if (!res.ok) {
      lastErr = `${model} → ${res.status}: ${(await res.text()).slice(0, 200)}`;
      continue; // try next model
    }
    const data = (await res.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string; bytes_base64_encoded?: string }>;
    };
    const b64 = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.bytes_base64_encoded;
    if (!b64) { lastErr = `${model} returned no image`; continue; }

    const buffer = Buffer.from(b64, 'base64');
    const key = `tenant_${opts.tenantSlug}/ai-generated/${randomUUID()}.png`;
    const storedUrl = await uploadFile(key, buffer, 'image/png');
    return { url: storedUrl, model };
  }
  throw new Error(`Imagen generation failed — ${lastErr || 'unknown error'}`);
}
