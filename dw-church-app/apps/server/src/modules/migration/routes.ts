import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { scrapeSite } from './scraper.js';
import { applyMigration, applyPageContent } from './apply.js';
// classifyWPPages used by legacy non-WP flow (analyze-ai) — keep import available
import { classifyWPPages as _classifyWPPages } from './wp-block-classifier.js';
void _classifyWPPages;
import { detectWordPress, fetchWPSiteData, fetchWPPages, fetchWPPosts, fetchWPMedia, fetchWPCategories } from './wp-api.js';
import type { WPPage, WPPost, WPCategory } from './wp-api.js';
import { mapWPDataToExtracted, generateSummary } from './wp-mapper.js';
import { analyzePages } from './ai-analyzer.js';
import { mapAnalyzedToExtracted, suggestPageMatching } from './ai-mapper.js';
import { migrateWPPageToTenant, migrateWPPostsToTenant } from './wp-content-mapper.js';

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
   * Apply manually-confirmed page matches to a tenant using WP REST API data.
   * Fetches fresh WP page data by slug, maps content to blocks, uploads images to R2.
   * Body: {
   *   tenantSlug: string,
   *   wpSiteUrl: string,
   *   matches: { sourceUrl, sourceSlug, targetPageId, targetSlug, blockType }[],
   *   dynamicContent?: ExtractedData (legacy fallback for non-WP sites)
   * }
   */
  app.post('/migration/apply-matched', async (request, reply) => {
    const { tenantSlug, wpSiteUrl, matches, dynamicContent } = request.body as {
      tenantSlug: string;
      wpSiteUrl?: string;
      matches: {
        sourceUrl: string;
        sourceSlug?: string;
        sourceTitle?: string;
        targetPageId: string | null;
        targetSlug: string;
        blockType: string;
        // Legacy field — still accepted for backward compat
        blocks?: { blockType: string; props: Record<string, unknown> }[];
      }[];
      dynamicContent?: Record<string, unknown>;
    };

    if (!tenantSlug) {
      throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug is required');
    }

    let pagesApplied = 0;
    const pageErrors: { slug: string; error: string }[] = [];
    let dynamicResult = {
      sermons: 0, bulletins: 0, albums: 0, staff: 0, events: 0,
      history: 0, columns: 0, boards: 0, pages: 0, settings: 0,
      worshipTimes: 0, images: 0,
    };

    try {
      // ─── WP-API-driven migration (primary path) ────────────
      if (wpSiteUrl && matches?.length) {
        // Step 1: Detect WP API URL
        const detection = await detectWordPress(wpSiteUrl);
        if (!detection.isWordPress) {
          throw new AppError('VALIDATION_ERROR', 400, 'wpSiteUrl is not a WordPress site');
        }
        const apiUrl = detection.apiUrl;

        // Step 2: Fetch WP data (pages, posts, media, categories)
        const [wpPages, wpPosts, wpMedia, wpCategories] = await Promise.all([
          fetchWPPages(apiUrl).catch(() => [] as WPPage[]),
          fetchWPPosts(apiUrl).catch(() => [] as WPPost[]),
          fetchWPMedia(apiUrl).catch(() => []),
          fetchWPCategories(apiUrl).catch(() => [] as WPCategory[]),
        ]);

        // Step 3: Build media lookup (media ID → source_url)
        const mediaMap = new Map<number, string>();
        for (const m of wpMedia) {
          mediaMap.set(m.id, m.source_url);
        }

        // Build WP page lookup by slug
        const wpPageBySlug = new Map<string, WPPage>();
        for (const p of wpPages) {
          wpPageBySlug.set(p.slug, p);
        }

        // Step 4: For each match, find the WP page and migrate
        for (const match of matches) {
          const sourceSlug = match.sourceSlug || slugFromSourceUrl(match.sourceUrl);
          const blockType = match.blockType || 'text_only';

          try {
            const wpPage = wpPageBySlug.get(sourceSlug);
            if (!wpPage) {
              // WP page not found by slug — skip with error
              pageErrors.push({ slug: sourceSlug, error: `WP page not found: ${sourceSlug}` });
              continue;
            }

            await migrateWPPageToTenant(
              tenantSlug,
              match.targetPageId,
              wpPage,
              blockType,
              mediaMap,
            );
            pagesApplied++;
          } catch (err) {
            pageErrors.push({
              slug: sourceSlug,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }

        // Step 5: Migrate dynamic content from WP posts
        // Categorize posts by WP categories into our content types
        const categoryMap = new Map<number, WPCategory>();
        for (const cat of wpCategories) {
          categoryMap.set(cat.id, cat);
        }

        const SERMON_SLUGS = ['sermon', 'sermons', 'message', 'messages'];
        const BULLETIN_SLUGS = ['bulletin', 'bulletins', 'weekly-bulletin'];
        const COLUMN_SLUGS = ['column', 'columns', 'pastoral-column'];
        const EVENT_SLUGS = ['event', 'events'];
        const STAFF_SLUGS = ['staff', 'pastor', 'pastors', 'leadership'];

        const sermonPosts: WPPost[] = [];
        const bulletinPosts: WPPost[] = [];
        const columnPosts: WPPost[] = [];
        const eventPosts: WPPost[] = [];
        const staffPosts: WPPost[] = [];
        const generalPosts: WPPost[] = [];

        for (const post of wpPosts) {
          const postCatSlugs = post.categories
            .map((catId) => categoryMap.get(catId)?.slug ?? '')
            .filter(Boolean);
          const postCatNames = post.categories
            .map((catId) => categoryMap.get(catId)?.name ?? '')
            .filter(Boolean);
          const allTerms = [...postCatSlugs, ...postCatNames.map((n) => n.toLowerCase())];

          // Check custom post type embedded in _embedded or slug patterns
          const customType = (post as unknown as Record<string, unknown>)._customPostType as string | undefined;

          if (customType && SERMON_SLUGS.includes(customType) || allTerms.some((t) => SERMON_SLUGS.some((s) => t.includes(s)))) {
            sermonPosts.push(post);
          } else if (customType && BULLETIN_SLUGS.includes(customType) || allTerms.some((t) => BULLETIN_SLUGS.some((s) => t.includes(s)))) {
            bulletinPosts.push(post);
          } else if (customType && COLUMN_SLUGS.includes(customType) || allTerms.some((t) => COLUMN_SLUGS.some((s) => t.includes(s)))) {
            columnPosts.push(post);
          } else if (customType && EVENT_SLUGS.includes(customType) || allTerms.some((t) => EVENT_SLUGS.some((s) => t.includes(s)))) {
            eventPosts.push(post);
          } else if (customType && STAFF_SLUGS.includes(customType) || allTerms.some((t) => STAFF_SLUGS.some((s) => t.includes(s)))) {
            staffPosts.push(post);
          } else {
            generalPosts.push(post);
          }
        }

        // Migrate each group to tenant DB
        if (sermonPosts.length > 0) {
          dynamicResult.sermons = await migrateWPPostsToTenant(tenantSlug, sermonPosts, 'sermon', mediaMap);
        }
        if (bulletinPosts.length > 0) {
          dynamicResult.bulletins = await migrateWPPostsToTenant(tenantSlug, bulletinPosts, 'bulletin', mediaMap);
        }
        if (columnPosts.length > 0) {
          dynamicResult.columns = await migrateWPPostsToTenant(tenantSlug, columnPosts, 'column', mediaMap);
        }
        if (eventPosts.length > 0) {
          dynamicResult.events = await migrateWPPostsToTenant(tenantSlug, eventPosts, 'event', mediaMap);
        }
        if (staffPosts.length > 0) {
          dynamicResult.staff = await migrateWPPostsToTenant(tenantSlug, staffPosts, 'staff', mediaMap);
        }
        if (generalPosts.length > 0) {
          dynamicResult.boards = await migrateWPPostsToTenant(tenantSlug, generalPosts, 'general', mediaMap);
        }
      }

      // ─── Legacy fallback: non-WP sites using old apply flow ─
      if (!wpSiteUrl && matches?.length) {
        // Old flow: matches have blocks array already built by frontend/AI
        for (const match of matches) {
          if (!match.blocks?.length) continue;
          const slug = match.targetSlug || slugFromSourceUrl(match.sourceUrl);
          try {
            const title = match.sourceTitle || (match.blocks[0]?.props?.title as string) || slug;
            await applyPageContent(
              tenantSlug,
              match.targetPageId,
              { title, slug, htmlContent: '', images: [] },
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

      // Apply dynamic content from legacy extracted data (non-WP sites)
      if (dynamicContent && !wpSiteUrl) {
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
      if (err instanceof AppError) throw err;
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
