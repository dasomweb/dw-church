import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createContentEntrySchema, updateContentEntrySchema } from './schema.js';
import * as service from './service.js';

// Content layer CRUD. Reusable content entries that page Sections reference
// (props.contentEntryId), separating CONTENT from DESIGN. Read is public
// (the storefront resolves referenced entries when rendering); writes require
// auth. super_admin acting on a tenant is honored via X-Tenant-Slug.
export async function contentEntryRoutes(app: FastifyInstance) {
  app.get('/content-entries', async (request, reply) => {
    const type = (request.query as Record<string, string>).type;
    const data = await service.listContentEntries(getSchema(request), type);
    return reply.send({ data });
  });

  app.get('/content-entries/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = await service.getContentEntry(getSchema(request), id);
    return reply.send({ data: entry });
  });

  app.post('/content-entries', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createContentEntrySchema.parse(request.body);
    const entry = await service.createContentEntry(getSchema(request), body);
    return reply.status(201).send({ data: entry });
  });

  app.put('/content-entries/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateContentEntrySchema.parse(request.body);
    const entry = await service.updateContentEntry(getSchema(request), id, body);
    return reply.send({ data: entry });
  });

  app.delete('/content-entries/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await service.removeContentEntry(getSchema(request), id);
    if (!ok) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Content entry not found' } });
    return reply.status(204).send();
  });
}
