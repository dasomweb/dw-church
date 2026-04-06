import { env } from '../../config/env.js';
import * as r2 from '../../config/r2.js';
import { randomUUID } from 'crypto';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ─── Text Generation (Gemini 2.5 Flash) ──────────────────

export async function generateText(prompt: string, context?: string): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = context
    ? `You are a helpful assistant for a Korean church website content editor. Write in Korean. Context: ${context}`
    : 'You are a helpful assistant for a Korean church website content editor. Write in Korean. Write concise, warm, and appropriate content for a church website.';

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini text API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text generated');
  return text;
}

// ─── Image Generation (Gemini Imagen) ─────────────────────

export async function generateImage(
  prompt: string,
  tenantSlug: string,
): Promise<{ url: string }> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const fullPrompt = `High quality, professional photograph for a church website. ${prompt}. Clean, modern, warm lighting.`;

  const res = await fetch(
    `${GEMINI_BASE}/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image generated');

  // Upload to R2
  const buffer = Buffer.from(b64, 'base64');
  const key = `tenant_${tenantSlug}/ai/${randomUUID()}.png`;
  const url = await r2.uploadFile(key, buffer, 'image/png');

  return { url };
}
