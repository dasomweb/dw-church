import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin } from '../../../middleware/auth.js';
import { getSchema } from '../../../utils/get-schema.js';
import { importContentToPage } from './service.js';

const importSchema = z.object({
  pageId: z.string().uuid(),
  content: z.string().min(1).max(40000),
});

// Verbatim handoff: paste existing content → AI structures (no rewrite) →
// deterministic pattern-map → blocks appended to the page. Super-admin (same
// gate as the AI build family).
export async function aiImportContentRoutes(app: FastifyInstance) {
  app.post('/ai/import-content', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { pageId, content } = importSchema.parse(request.body);
    const data = await importContentToPage(getSchema(request), pageId, content);
    return reply.send({ data });
  });
}
