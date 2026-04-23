import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { uploadFile, deleteFile } from '../../config/r2.js';
import { generateImage, classifyImage } from '../ai/service.js';

/**
 * Shared image gallery — curated platform-wide by super admins, picked by
 * tenants in their page editor. Stored in R2 under shared/gallery/<uuid>.
 * Read endpoint is public (any authenticated user can browse), write
 * endpoints require super admin.
 */

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export default async function sharedImageRoutes(app: FastifyInstance): Promise<void> {
  // GET /shared-images?category=&active=  — public read (any authed user)
  app.get<{ Querystring: { category?: string; active?: string } }>(
    '/shared-images',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { category, active } = request.query;
      const where: Record<string, unknown> = {};
      if (category) where.category = category;
      if (active !== 'false') where.isActive = true;
      const images = await prisma.sharedImage.findMany({
        where,
        orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, url: true, title: true, category: true, tags: true, isActive: true },
      });
      return reply.send({ data: images });
    },
  );

  // POST /admin/shared-images/upload  — multipart, super admin only
  // `category=auto` (or omitted) triggers Gemini vision auto-classification.
  app.post(
    '/admin/shared-images/upload',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const multipart = request as unknown as {
        file(): Promise<{ filename: string; mimetype: string; toBuffer(): Promise<Buffer> } | undefined>;
        query: { title?: string; category?: string; tags?: string };
      };
      const data = await multipart.file();
      if (!data) throw new AppError('NO_FILE', 400, 'No file uploaded');

      const buffer = await data.toBuffer();
      const ext = (data.filename.split('.').pop() || 'bin').toLowerCase();
      const r2Key = `shared/gallery/${crypto.randomUUID()}.${ext}`;
      const url = await uploadFile(r2Key, buffer, data.mimetype);

      const meta = multipart.query;
      const tags = meta.tags ? meta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const requestedCategory = meta.category;
      const category = (!requestedCategory || requestedCategory === 'auto')
        ? await classifyImage(buffer, data.mimetype)
        : requestedCategory;

      const image = await prisma.sharedImage.create({
        data: {
          url,
          r2Key,
          title: meta.title || data.filename,
          category,
          tags,
        },
      });
      return reply.status(201).send({ data: image });
    },
  );

  // POST /admin/shared-images/generate — AI image generation
  // Body: { prompt, aspectRatios: string[], titlePrefix?: string }
  // For each ratio: generate → R2 → classify → insert row. Returns all rows.
  const generateBodySchema = z.object({
    prompt: z.string().min(1),
    aspectRatios: z.array(z.enum(['16:9', '4:3', '3:2', '1:1', '3:4', '9:16'])).min(1).max(6),
    titlePrefix: z.string().optional(),
    category: z.string().optional(),
  });

  app.post(
    '/admin/shared-images/generate',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const body = generateBodySchema.parse(request.body);
      const created: Array<{ id: string; url: string; category: string; title: string }> = [];
      const failures: string[] = [];

      for (const ratio of body.aspectRatios) {
        try {
          const { buffer, mimeType } = await generateImage(body.prompt, ratio);
          const ext = mimeType.includes('png') ? 'png' : 'jpg';
          const r2Key = `shared/gallery/ai-${crypto.randomUUID()}.${ext}`;
          const url = await uploadFile(r2Key, buffer, mimeType);
          const category = body.category && body.category !== 'auto'
            ? body.category
            : await classifyImage(buffer, mimeType);
          const title = `${body.titlePrefix ?? body.prompt.slice(0, 40)} (${ratio})`;
          const image = await prisma.sharedImage.create({
            data: { url, r2Key, title, category, tags: ['ai', ratio] },
          });
          created.push({ id: image.id, url: image.url, category: image.category, title: image.title });
        } catch (err) {
          request.log.warn({ ratio, err: err instanceof Error ? err.message : err }, 'image generation failed');
          failures.push(ratio);
        }
      }

      if (created.length === 0) {
        throw new AppError('GENERATION_FAILED', 502, `Image generation failed: ${failures.join(', ')}`);
      }

      return reply.status(201).send({ data: created, failures });
    },
  );

  // PUT /admin/shared-images/:id  — update metadata
  app.put<{ Params: { id: string } }>(
    '/admin/shared-images/:id',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const body = updateSchema.parse(request.body);
      const updated = await prisma.sharedImage.update({
        where: { id: request.params.id },
        data: body,
      });
      return reply.send({ data: updated });
    },
  );

  // DELETE /admin/shared-images/:id  — removes DB row + R2 object
  app.delete<{ Params: { id: string } }>(
    '/admin/shared-images/:id',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const image = await prisma.sharedImage.findUnique({ where: { id: request.params.id } });
      if (!image) throw new AppError('NOT_FOUND', 404, 'Image not found');
      if (image.r2Key) {
        try { await deleteFile(image.r2Key); } catch (err) { request.log.warn(`R2 delete failed: ${err}`); }
      }
      await prisma.sharedImage.delete({ where: { id: image.id } });
      return reply.status(204).send();
    },
  );
}
