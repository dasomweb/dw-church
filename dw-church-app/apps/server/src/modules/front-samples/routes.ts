import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '../../config/database.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { uploadFile } from '../../config/r2.js';
import { applyDesignToTenant, applyExactHtmlToTenant, PRESET_IDS } from './presets.js';

/**
 * Front-sample editor (super-admin only). The 22 homepage design samples ship
 * as static bundled HTML (packages/admin-app/.../front-samples/canvas/*.html);
 * this lets the operator edit a sample's text + photos in place and persist the
 * result. Edits are stored as the full edited HTML per card in
 * public.front_sample_edits and merged OVER the bundled base in the gallery.
 *
 *   GET    /admin/front-samples            → { [cardId]: html } for all edits
 *   PUT    /admin/front-samples/:cardId    → save edited html
 *   DELETE /admin/front-samples/:cardId    → revert to the bundled base
 *   POST   /admin/front-samples/upload     → image → R2 _samples/custom/ → { url }
 */
const saveBody = z.object({ html: z.string().min(1).max(600_000) });

// Strip <script>/<iframe> so a stored sample can never run JS in the preview.
function sanitize(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

export async function frontSampleRoutes(app: FastifyInstance) {
  app.get('/admin/front-samples', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    const rows = await prisma.$queryRawUnsafe<{ card_id: string; html: string }[]>(
      `SELECT card_id, html FROM public.front_sample_edits`,
    );
    const map: Record<string, string> = {};
    for (const r of rows) map[r.card_id] = r.html;
    return reply.send({ data: map });
  });

  app.put('/admin/front-samples/:cardId', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { cardId } = req.params as { cardId: string };
    if (!/^[a-z0-9-]{1,40}$/i.test(cardId)) throw new AppError('BAD_ID', 400, '잘못된 카드 ID입니다.');
    const { html } = saveBody.parse(req.body ?? {});
    const clean = sanitize(html);
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.front_sample_edits (card_id, html, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (card_id) DO UPDATE SET html = EXCLUDED.html, updated_at = now()`,
      cardId, clean,
    );
    return reply.send({ data: { cardId } });
  });

  app.delete('/admin/front-samples/:cardId', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { cardId } = req.params as { cardId: string };
    await prisma.$executeRawUnsafe(`DELETE FROM public.front_sample_edits WHERE card_id = $1`, cardId);
    return reply.send({ data: { cardId, reverted: true } });
  });

  // Which sample designs have a home-page block preset (Feature ①).
  app.get('/admin/front-samples/presets', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    return reply.send({ data: PRESET_IDS });
  });

  // Tenants that actually have a provisioned schema (tenant_<slug>) — the design
  // picker must only offer these, or applying hits NO_SCHEMA (a tenant row can
  // exist without its schema when provisioning didn't complete).
  app.get('/admin/front-samples/tenants', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    const rows = await prisma.$queryRawUnsafe<{ slug: string; name: string }[]>(
      `SELECT t.slug, t.name
         FROM public.tenants t
         JOIN information_schema.schemata s ON s.schema_name = 'tenant_' || t.slug
        ORDER BY t.name ASC`,
    );
    return reply.send({ data: rows });
  });

  // Apply a design preset to a tenant's home page (rebuilds page_sections).
  app.post('/admin/front-samples/apply', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug, design } = z.object({ slug: z.string().min(1).max(63), design: z.string().min(1).max(40) }).parse(req.body ?? {});
    const result = await applyDesignToTenant(slug, design);
    return reply.send({ data: result });
  });

  // "시안 그대로 적용" — set the home to the sample's real HTML (header/footer
  // stripped client-side) as a single custom_html block (pixel-faithful).
  app.post('/admin/front-samples/apply-exact', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug, html } = z.object({ slug: z.string().min(1).max(63), html: z.string().min(1).max(600_000) }).parse(req.body ?? {});
    const result = await applyExactHtmlToTenant(slug, html);
    return reply.send({ data: result });
  });

  // Super-admin image upload (no tenant context) → R2 _samples/custom/. Server
  // re-encodes to a capped JPEG so a phone-camera original can never bloat R2.
  app.post('/admin/front-samples/upload', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const data = await (request as unknown as {
      file(): Promise<{ filename: string; mimetype: string; toBuffer(): Promise<Buffer> } | undefined>;
    }).file();
    if (!data) throw new AppError('NO_FILE', 400, '파일이 없습니다.');
    const raw = await data.toBuffer();
    let out: Buffer;
    try {
      out = await sharp(raw).rotate().resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } catch {
      throw new AppError('BAD_IMAGE', 400, '이미지를 처리할 수 없습니다.');
    }
    const key = `_samples/custom/${randomUUID()}.jpg`;
    const url = await uploadFile(key, out, 'image/jpeg');
    return reply.send({ data: { url } });
  });
}
