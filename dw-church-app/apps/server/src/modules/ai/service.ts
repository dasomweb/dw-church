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
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

// ─── Image Generation (Nano Banana) ──────────────────────

export async function generateImage(
  prompt: string,
  tenantSlug: string,
): Promise<{ url: string }> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const fullPrompt = `High quality, professional photograph for a church website. ${prompt}. Clean, modern, warm lighting.`;

  const res = await fetch(
    `${GEMINI_BASE}/models/nano-banana-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);
  if (!imagePart?.inlineData?.data) throw new Error('No image generated');

  const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
  const ext = mimeType.includes('png') ? 'png' : 'jpg';

  // Upload to R2
  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const key = `tenant_${tenantSlug}/ai/${randomUUID()}.${ext}`;
  const url = await r2.uploadFile(key, buffer, mimeType);

  return { url };
}
