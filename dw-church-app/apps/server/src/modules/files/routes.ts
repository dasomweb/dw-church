import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import * as fileService from './service.js';

export async function fileRoutes(app: FastifyInstance) {
  app.post('/files/upload', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await (request as unknown as { file(): Promise<{ filename: string; mimetype: string; toBuffer(): Promise<Buffer> } | undefined> }).file();
    if (!data) {
      return reply.status(400).send({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    const buffer = await data.toBuffer();
    const q = request.query as Record<string, string>;
    const entityType = q.entityType || 'general';
    // kind=reference marks an AI-builder reference photo; tags (comma list)
    // drive image matching.
    const kind = q.kind === 'reference' ? 'reference' : 'upload';
    const tags = q.tags ? q.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

    const file = await fileService.upload({
      tenantSlug: request.tenant!.slug,
      schema: getSchema(request),
      entityType,
      filename: data.filename,
      contentType: data.mimetype,
      buffer,
      kind,
      tags,
      description: q.description || undefined,
    });

    return reply.status(201).send({ data: file });
  });

  // Sideload an external image URL (YouTube thumbnail, pasted image link) into
  // R2 and return a `files` row — so the storefront self-hosts instead of
  // hotlinking. Used by the builder's "Paste URL" image field.
  app.post('/files/import-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const { url, entityType } = (request.body ?? {}) as { url?: string; entityType?: string };
    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: { code: 'NO_URL', message: 'url is required' } });
    }
    const file = await fileService.importFromUrl({
      tenantSlug: request.tenant!.slug,
      schema: getSchema(request),
      entityType: entityType || 'general',
      url,
    });
    return reply.status(201).send({ data: file });
  });

  // Register migration images already in R2 (tenant_<slug>/migration/) that
  // have no `files` row yet, so they show up in the media library.
  app.post('/files/backfill-migration', { preHandler: [requireAuth] }, async (request, reply) => {
    const result = await fileService.backfillMigration(getSchema(request), request.tenant!.slug);
    return reply.send({ data: result });
  });

  app.delete('/files/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await fileService.remove(getSchema(request), id);
    if (!deleted) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    return reply.status(204).send();
  });

  app.get('/files', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const entityType = query.entityType as string | undefined;
    const kind = query.kind as string | undefined;

    const { data, total } = await fileService.listFiles(getSchema(request), {
      page, perPage, entityType, kind,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });
}
