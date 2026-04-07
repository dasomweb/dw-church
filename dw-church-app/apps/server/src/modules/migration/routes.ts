import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { scrapeSite } from './scraper.js';
import { applyMigration } from './apply.js';

/** Only super_admin or SUPER_ADMIN_EMAILS can use migration tools. */
async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

export default async function migrationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireSuperAdmin);

  /**
   * POST /admin/migration/analyze
   * Scrape a church website and return structured data.
   * Body: { url: string, maxPages?: number }
   */
  app.post('/migration/analyze', async (request, reply) => {
    const { url, maxPages } = request.body as { url: string; maxPages?: number };
    if (!url) {
      throw new AppError('VALIDATION_ERROR', 400, 'url is required');
    }

    try {
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
            textPreview: p.textContent.slice(0, 300),
          })),
        },
      });
    } catch (err) {
      throw new AppError('SCRAPE_FAILED', 500, err instanceof Error ? err.message : 'Failed to analyze site');
    }
  });

  /**
   * POST /admin/migration/apply
   * Apply extracted data to a tenant.
   * Body: { tenantSlug: string, data: ExtractedData }
   */
  app.post('/migration/apply', async (request, reply) => {
    const { tenantSlug, data } = request.body as { tenantSlug: string; data: Record<string, unknown> };
    if (!tenantSlug || !data) {
      throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug and data are required');
    }

    const result = await applyMigration(tenantSlug, data);
    return reply.send({ success: true, result });
  });
}
