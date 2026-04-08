import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { scrapeSite } from './scraper.js';
import { applyMigration } from './apply.js';
import { detectWordPress, fetchWPSiteData } from './wp-api.js';
import { mapWPDataToExtracted, generateSummary } from './wp-mapper.js';
import { analyzePages } from './ai-analyzer.js';
import { mapAnalyzedToExtracted, suggestPageMatching } from './ai-mapper.js';

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

    // Try WordPress REST API first
    try {
      const wpData = await fetchWPSiteData(url);
      if (wpData && wpData.pages.length > 0) {
        const extracted = mapWPDataToExtracted(wpData);
        const summary = generateSummary(extracted);
        return reply.send({
          success: true,
          isWordPress: true,
          site: {
            url: wpData.siteUrl,
            title: wpData.siteName,
            pageCount: wpData.pages.length + (wpData.posts?.length || 0),
            menu: (wpData.menus || []).flatMap((m: any) =>
              (m.items || []).map((item: any) => ({
                label: item.title || '',
                href: item.url || '',
                children: (item.children ?? []).map((c: any) => ({ label: c.title || '', href: c.url || '' })),
              })),
            ),
            pages: wpData.pages.map((p: any) => ({
              url: `${wpData.siteUrl}/${p.slug}`,
              title: String((p.title as any)?.rendered ?? p.title ?? '').replace(/<[^>]+>/g, ''),
              imageCount: (String((p.content as any)?.rendered ?? p.content ?? '').match(/<img/gi) ?? []).length,
              textPreview: String((p.content as any)?.rendered ?? p.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
            })),
          },
          extracted,
          summary,
        });
      }
    } catch {
      // WP API failed, will try scraping below
    }

    // Fallback: HTML scraping
    try {
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
            imageCount: p.images?.length ?? 0,
            textPreview: (p.textContent || '').slice(0, 300),
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

  /**
   * POST /admin/migration/analyze-ai
   * AI-powered analysis for non-WordPress sites.
   * Scrapes the site, then uses Gemini AI to classify pages and extract content.
   * Body: { siteUrl: string, tenantSlug: string }
   */
  app.post('/migration/analyze-ai', async (request, reply) => {
    const { siteUrl, tenantSlug } = request.body as { siteUrl: string; tenantSlug: string };
    if (!siteUrl) {
      throw new AppError('VALIDATION_ERROR', 400, 'siteUrl is required');
    }
    if (!tenantSlug) {
      throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug is required');
    }

    try {
      // Step 1: Scrape site
      const site = await scrapeSite(siteUrl, 30);

      // Step 2: AI analysis
      const analyzedPages = await analyzePages(site);

      // Step 3: Fetch tenant pages for matching
      const schema = validateSchemaName(`tenant_${tenantSlug}`);
      const tenantPages = await prisma.$queryRawUnsafe<{ id: string; title: string; slug: string }[]>(
        `SELECT id, title, slug FROM "${schema}".pages WHERE is_visible = true ORDER BY sort_order`,
      );

      // Step 4: Suggest page matches
      const suggestedMatches = suggestPageMatching(analyzedPages, tenantPages);

      // Step 5: Map to ExtractedData for dynamic content
      const extracted = mapAnalyzedToExtracted(analyzedPages);
      const summary = generateSummary(extracted);

      // Build category counts
      const categoryCounts: Record<string, number> = {};
      for (const page of analyzedPages) {
        categoryCounts[page.category] = (categoryCounts[page.category] || 0) + 1;
      }

      return reply.send({
        success: true,
        pages: analyzedPages,
        suggestedMatches,
        extracted,
        summary: {
          ...summary,
          static: analyzedPages.filter((p) => p.type === 'static').length,
          dynamic: analyzedPages.filter((p) => p.type === 'dynamic').length,
          categories: categoryCounts,
        },
        tenantPages,
      });
    } catch (err) {
      throw new AppError(
        'AI_ANALYSIS_FAILED',
        500,
        err instanceof Error ? err.message : 'AI analysis failed',
      );
    }
  });

  /**
   * POST /admin/migration/apply-matched
   * Apply manually-confirmed page matches and dynamic content to a tenant.
   * Body: {
   *   tenantSlug: string,
   *   matches: { sourceUrl: string, targetPageId: string | null, targetSlug: string, blocks: [...] }[],
   *   dynamicContent: ExtractedData
   * }
   */
  app.post('/migration/apply-matched', async (request, reply) => {
    const { tenantSlug, matches, dynamicContent } = request.body as {
      tenantSlug: string;
      matches: {
        sourceUrl: string;
        targetPageId: string | null;
        targetSlug: string;
        blocks: { blockType: string; props: Record<string, unknown> }[];
      }[];
      dynamicContent: Record<string, unknown>;
    };

    if (!tenantSlug) {
      throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug is required');
    }

    const schema = validateSchemaName(`tenant_${tenantSlug}`);
    let pagesApplied = 0;

    try {
      // Apply page section matches
      if (matches?.length) {
        for (const match of matches) {
          if (!match.targetPageId) {
            // Create new page — skip if no blocks to apply
            if (!match.blocks?.length) continue;

            // Determine next sort_order
            const maxOrder = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
              `SELECT MAX(sort_order) as max FROM "${schema}".pages`,
            );
            const nextOrder = ((maxOrder[0]?.max) ?? 0) + 1;

            // Create page
            const newPage = await prisma.$queryRawUnsafe<{ id: string }[]>(
              `INSERT INTO "${schema}".pages (title, slug, sort_order, is_visible)
               VALUES ($1, $2, $3, true)
               RETURNING id`,
              match.blocks[0]?.props?.title || match.targetSlug,
              match.targetSlug,
              nextOrder,
            );

            if (newPage.length > 0) {
              const pageId = newPage[0]!.id;
              for (let i = 0; i < match.blocks.length; i++) {
                const block = match.blocks[i]!;
                await prisma.$queryRawUnsafe(
                  `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
                   VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
                  pageId,
                  block.blockType,
                  JSON.stringify(block.props),
                  i,
                );
              }
              pagesApplied++;
            }
          } else {
            // Update existing page sections
            for (let i = 0; i < (match.blocks?.length ?? 0); i++) {
              const block = match.blocks[i]!;
              // Check if section exists at this sort_order
              const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
                `SELECT id FROM "${schema}".page_sections
                 WHERE page_id = $1::uuid AND sort_order = $2 LIMIT 1`,
                match.targetPageId,
                i,
              );
              if (existing.length > 0) {
                await prisma.$queryRawUnsafe(
                  `UPDATE "${schema}".page_sections
                   SET props = props || $1::jsonb, block_type = $2
                   WHERE id = $3::uuid`,
                  JSON.stringify(block.props),
                  block.blockType,
                  existing[0]!.id,
                );
              } else {
                await prisma.$queryRawUnsafe(
                  `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
                   VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
                  match.targetPageId,
                  block.blockType,
                  JSON.stringify(block.props),
                  i,
                );
              }
            }
            pagesApplied++;
          }
        }
      }

      // Apply dynamic content (sermons, staff, events, etc.) using existing applyMigration
      let dynamicResult = {
        sermons: 0, bulletins: 0, albums: 0, staff: 0, events: 0,
        history: 0, columns: 0, boards: 0, pages: 0, settings: 0,
        worshipTimes: 0, images: 0,
      };
      if (dynamicContent) {
        dynamicResult = await applyMigration(tenantSlug, dynamicContent);
      }

      return reply.send({
        success: true,
        result: {
          ...dynamicResult,
          pages: pagesApplied,
        },
      });
    } catch (err) {
      throw new AppError(
        'APPLY_FAILED',
        500,
        err instanceof Error ? err.message : 'Failed to apply matched migration',
      );
    }
  });
}
