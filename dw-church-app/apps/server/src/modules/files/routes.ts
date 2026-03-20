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
    const entityType = (request.query as Record<string, string>).entityType || 'general';

    const file = await fileService.upload({
      tenantSlug: request.tenant!.slug,
      schema: getSchema(request),
      entityType,
      filename: data.filename,
      contentType: data.mimetype,
      buffer,
    });

    return reply.status(201).send({ data: file });
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

    const { data, total } = await fileService.listFiles(getSchema(request), {
      page, perPage, entityType,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });
}
