import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { scrapeSite } from './scraper.js';
import { applyMigration } from './apply.js';
import { detectWordPress, fetchWPSiteData } from './wp-api.js';
import { mapWPDataToExtracted, generateSummary } from './wp-mapper.js';

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
   * Auto-detects WordPress REST API. If available, uses WP API for structured data.
   * Falls back to HTML scraping if WP API is not available.
   * Body: { url: string, maxPages?: number }
   */
  app.post('/migration/analyze', async (request, reply) => {
    const { url, maxPages } = request.body as { url: string; maxPages?: number };
    if (!url) {
      throw new AppError('VALIDATION_ERROR', 400, 'url is required');
    }

    try {
      // Auto-detect WordPress and use REST API if available
      const wpDetection = await detectWordPress(url);

      if (wpDetection.isWordPress) {
        const wpData = await fetchWPSiteData(url);
        if (wpData) {
          const extracted = mapWPDataToExtracted(wpData);
          const summary = generateSummary(extracted);
          return reply.send({
            success: true,
            isWordPress: true,
            site: {
              url: wpData.siteUrl,
              title: wpData.siteName,
              pageCount: wpData.pages.length,
              menu: wpData.menus.flatMap((m) =>
                m.items.map((item) => ({
                  label: item.title,
                  href: item.url,
                  children: (item.children ?? []).map((c) => ({ label: c.title, href: c.url })),
                })),
              ),
              pages: wpData.pages.map((p) => ({
                url: `${wpData.siteUrl}/${p.slug}`,
                title: p.title.rendered.replace(/<[^>]+>/g, ''),
                imageCount: (p.content.rendered.match(/<img/gi) ?? []).length,
                textPreview: p.content.rendered.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
              })),
            },
            extracted,
            summary,
          });
        }
      }

      // Fallback: HTML scraping
      const site = await scrapeSite(url, maxPages ?? 30);
      return reply.send({
        success: true,
        isWordPress: false,
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
        extracted: null,
        summary: null,
      });
    } catch (err) {
      throw new AppError('SCRAPE_FAILED', 500, err instanceof Error ? err.message : 'Failed to analyze site');
    }
  });

  /**
   * POST /admin/migration/analyze-wp
   * Explicitly use WordPress REST API to analyze a site.
   * Body: { siteUrl: string }
   */
  app.post('/migration/analyze-wp', async (request, reply) => {
    const { siteUrl } = request.body as { siteUrl: string };
    if (!siteUrl) {
      throw new AppError('VALIDATION_ERROR', 400, 'siteUrl is required');
    }

    try {
      const wpDetection = await detectWordPress(siteUrl);
      if (!wpDetection.isWordPress) {
        return reply.send({
          success: true,
          isWordPress: false,
          data: null,
          summary: null,
        });
      }

      const wpData = await fetchWPSiteData(siteUrl);
      if (!wpData) {
        return reply.send({
          success: true,
          isWordPress: true,
          data: null,
          summary: null,
        });
      }

      const extracted = mapWPDataToExtracted(wpData);
      const summary = generateSummary(extracted);

      return reply.send({
        success: true,
        isWordPress: true,
        data: extracted,
        summary,
      });
    } catch (err) {
      throw new AppError('WP_API_FAILED', 500, err instanceof Error ? err.message : 'Failed to analyze WordPress site');
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
