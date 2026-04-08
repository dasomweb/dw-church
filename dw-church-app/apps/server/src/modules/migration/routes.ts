import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { scrapeSite } from './scraper.js';
import { applyMigration } from './apply.js';

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

export default async function migrationRoutes(app: FastifyInstance): Promise<void> {
  // Health check for this plugin (no auth)
  app.get('/health', async () => ({ status: 'migration-ok' }));

  app.addHook('preHandler', requireSuperAdmin);

  app.post('/scrape', async (request, reply) => {
    const { url, maxPages } = request.body as { url: string; maxPages?: number };
    if (!url) throw new AppError('VALIDATION_ERROR', 400, 'url is required');

    const site = await scrapeSite(url, maxPages ?? 30);
    return reply.send({
      success: true,
      site: {
        url: site.url,
        title: site.title,
        pageCount: site.pages.length,
        menu: site.menu,
        pages: site.pages.map((p) => ({
          url: p.url,
          title: p.title,
          imageCount: p.images.length,
          images: p.images.slice(0, 20),
          textPreview: p.textContent.slice(0, 500),
          textContent: p.textContent,
        })),
      },
    });
  });

  /**
   * GET /admin/migration/tenant-pages/:slug
   * Get existing pages for a tenant (for matching).
   */
  app.get<{ Params: { slug: string } }>('/tenant-pages/:slug', async (request, reply) => {
    const schema = validateSchemaName(`tenant_${request.params.slug}`);
    try {
      const pages = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, title, slug, sort_order FROM "${schema}".pages ORDER BY sort_order`,
      );
      return reply.send({ data: pages });
    } catch {
      return reply.send({ data: [] });
    }
  });

  /**
   * POST /admin/migration/apply
   * Step 3: Apply approved migration plan to tenant.
   * Body: { tenantSlug, data: ExtractedData }
   */
  app.post('/apply', async (request, reply) => {
    const { tenantSlug, data } = request.body as { tenantSlug: string; data: Record<string, unknown> };
    if (!tenantSlug || !data) throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug and data required');

    const result = await applyMigration(tenantSlug, data);
    return reply.send({ success: true, result });
  });
}
