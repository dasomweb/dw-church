import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { scrapeSite } from './scraper.js';
import { applyMigration, applyPageContent } from './apply.js';
import { classifyWPPages } from './wp-block-classifier.js';
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

    // Try WordPress REST API — fetch pages and posts directly (fast, no full site data)
    try {
      const { detectWordPress, fetchWPPages, fetchWPPosts, fetchWPCategories } = await import('./wp-api.js');
      const detection = await detectWordPress(url);
      if (detection.isWordPress) {
        const apiUrl = detection.apiUrl;
        const siteUrl = url.replace(/\/wp-json.*$/i, '').replace(/\/+$/, '');

        // Fetch pages and posts in parallel (skip media/menus/custom types for speed)
        const [pages, posts, categories] = await Promise.all([
          fetchWPPages(apiUrl).catch(() => []),
          fetchWPPosts(apiUrl).catch(() => []),
          fetchWPCategories(apiUrl).catch(() => []),
        ]);

        if (pages.length > 0 || posts.length > 0) {
          const wpData = { siteName: detection.siteName, siteUrl, pages, posts, media: [], categories, menus: [], customPosts: [] };
          const extracted = mapWPDataToExtracted(wpData as any);
          const summary = generateSummary(extracted);
          return reply.send({
            success: true,
            isWordPress: true,
            site: {
              url: siteUrl,
              title: detection.siteName,
              pageCount: pages.length + posts.length,
              menu: [],
              pages: pages.map((p: any) => ({
                url: `${siteUrl}/${p.slug}`,
                title: String((p.title as any)?.rendered ?? p.title ?? '').replace(/<[^>]+>/g, ''),
                imageCount: 0,
                textPreview: String((p.content as any)?.rendered ?? p.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
              })),
            },
            extracted,
            summary,
          });
        }
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
   * Uses WP page content from dynamicContent.pages to enrich block props.
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
        sourceTitle?: string;
        targetPageId: string | null;
        targetSlug: string;
        blocks: { blockType: string; props: Record<string, unknown> }[];
      }[];
      dynamicContent: Record<string, unknown>;
    };

    if (!tenantSlug) {
      throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug is required');
    }

    let pagesApplied = 0;
    const pageErrors: { slug: string; error: string }[] = [];

    try {
      // Build a lookup of WP page content from dynamicContent.pages by slug
      const wpPages = (dynamicContent?.pages as { title: string; slug: string; sections: { blockType: string; props: Record<string, unknown> }[] }[] | undefined) ?? [];
      const wpPageBySlug = new Map<string, { title: string; slug: string; sections: { blockType: string; props: Record<string, unknown> }[] }>();
      for (const p of wpPages) {
        wpPageBySlug.set(p.slug, p);
      }

      // Apply page section matches
      if (matches?.length) {
        // Collect pages that need AI classification (no blocks provided)
        const needsClassification: { index: number; slug: string; title: string; content: string; images: string[] }[] = [];

        for (let idx = 0; idx < matches.length; idx++) {
          const match = matches[idx]!;
          if (!match.blocks?.length) {
            // Find WP content for this page by slug
            const slug = match.targetSlug || slugFromSourceUrl(match.sourceUrl);
            const wpPage = wpPageBySlug.get(slug);
            if (wpPage) {
              // Reconstruct content from sections props
              const content = wpPage.sections.map((s) => String(s.props.content || '')).join('\n');
              const images = wpPage.sections.flatMap((s) => {
                const imgs = s.props.images as string[] | undefined;
                const img = s.props.imageUrl as string | undefined;
                const bgImg = s.props.backgroundImageUrl as string | undefined;
                return [...(imgs ?? []), ...(img ? [img] : []), ...(bgImg ? [bgImg] : [])];
              }).filter(Boolean);
              needsClassification.push({ index: idx, slug, title: wpPage.title || match.sourceTitle || slug, content, images });
            }
          }
        }

        // Run AI classification for pages without blocks
        if (needsClassification.length > 0) {
          try {
            const classified = await classifyWPPages(needsClassification);
            for (let i = 0; i < classified.length; i++) {
              const cls = classified[i]!;
              const nc = needsClassification[i]!;
              const match = matches[nc.index]!;
              // Assign AI-classified blocks to the match
              match.blocks = cls.suggestedBlocks;
            }
          } catch {
            // AI classification failed — assign default blocks
            for (const nc of needsClassification) {
              const match = matches[nc.index]!;
              match.blocks = [
                { blockType: 'hero_banner', props: { title: nc.title } },
                { blockType: 'text_only', props: { title: nc.title } },
              ];
            }
          }
        }

        // Now apply each match using applyPageContent
        for (const match of matches) {
          if (!match.blocks?.length) continue;

          const slug = match.targetSlug || slugFromSourceUrl(match.sourceUrl);

          try {
            // Find WP content for this page
            const wpPage = wpPageBySlug.get(slug);
            let htmlContent = '';
            let images: string[] = [];
            let title = match.sourceTitle || slug;

            if (wpPage) {
              title = wpPage.title || title;
              // Reconstruct HTML content and images from sections
              htmlContent = wpPage.sections.map((s) => String(s.props.content || '')).join('\n');
              images = wpPage.sections.flatMap((s) => {
                const imgs = s.props.images as string[] | undefined;
                const img = s.props.imageUrl as string | undefined;
                const bgImg = s.props.backgroundImageUrl as string | undefined;
                return [...(imgs ?? []), ...(img ? [img] : []), ...(bgImg ? [bgImg] : [])];
              }).filter(Boolean);
            } else {
              // No WP page data — use title from blocks
              title = (match.blocks[0]?.props?.title as string) || title;
            }

            await applyPageContent(
              tenantSlug,
              match.targetPageId,
              { title, slug, htmlContent, images },
              match.blocks,
            );
            pagesApplied++;
          } catch (err) {
            pageErrors.push({
              slug,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
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
        ...(pageErrors.length > 0 ? { pageErrors } : {}),
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

// ─── Helpers ──────────────────────────────────────────────

function slugFromSourceUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-') || 'home';
  } catch {
    return 'page';
  }
}
