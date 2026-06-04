import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../config/database.js';
import { requireSuperAdmin } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import { validateSlug } from '../../../utils/validate-schema.js';
import { createPage, createSection } from '../../pages/service.js';
import { createMenu } from '../../menus/service.js';
import { updateTheme } from '../../themes/service.js';
import { mapSectionToBlock, type SectionSpec } from './pattern-map.js';
import { fillImage, prefetchUnsplash } from './placeholder-images.js';
import {
  blockStyleSchema,
  legacyThemeToTokens,
  type BlockStyle,
  type LegacyThemeBlob,
} from '@dw-church/design-tokens';

/**
 * POST /api/v1/ai/build-pages — finalize a PlannerWizard run.
 *
 * The PlannerWizard collects business info → marketing strategy → sitemap
 * → per-page content map → design system on the client. When the user hits
 * "Build All Pages", the SPA hands the full PlannerResult to this route,
 * which writes pages + sections into the target tenant's schema. The
 * pattern-map module turns each generated section's gutenbergPattern /
 * sectionType into one of the b2bsmart block_types defined in
 * apps/server/src/modules/pages/block-schemas.ts.
 *
 * Authn: super_admin only — this is the only role that can mass-create
 * pages under any tenant. Tenant-scoped admins use the tenant's own page
 * editor, not the AI builder.
 */

// LLM responses (content-map etc.) routinely send `null` for empty string
// fields. zod's `.optional()` only allows `undefined`, so we use `.nullish()`
// (= nullable + optional) and treat null/undefined as "absent" downstream.
const optString = z.string().nullish();

const sectionSchema = z
  .object({
    sectionType: optString,
    gutenbergPattern: optString,
    title: optString,
    subtitle: optString,
    description: optString,
    content: optString,
    buttonText: optString,
    buttonUrl: optString,
    imageUrl: optString,
    items: z.array(z.record(z.unknown())).nullish(),
  })
  .passthrough();

const buildPagesSchema = z.object({
  tenantSlug: z.string().min(1),
  business: z.record(z.unknown()).default({}),
  designSystem: z.record(z.unknown()).default({}),
  // strategy is optional — the wizard always produces it, but legacy
  // callers (no marketing-insight step run) may not pass one.
  strategy: z.record(z.unknown()).default({}),
  sitemap: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      parent: optString,
    }),
  ),
  pageContents: z.record(z.array(sectionSchema)).default({}),
  /**
   * Phase-3 per-section design overrides keyed by `${pageSlug}#${sectionIndex}`.
   * When the Designer LLM (or operator-edited Design step) produces a
   * BlockStyle for a section, the wizard forwards it here and build-pages
   * applies it via createSection's styleOverrides field. Unkeyed sections
   * persist with no override (global theme cascade).
   */
  perSection: z.record(blockStyleSchema).default({}),
});

type BuildPagesInput = z.infer<typeof buildPagesSchema>;

interface BuildResult {
  tenantSchema: string;
  pagesCreated: number;
  sectionsCreated: number;
  menusCreated: number;
  errors: string[];
  /** Non-blocking advisory messages (e.g. "planner forgot CTA on
   *  /pricing — synthesized fallback"). Build still succeeded; operator
   *  can use these to tune prompts for the next run. */
  warnings: string[];
}

export async function aiBuildPagesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ai/build-pages', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = buildPagesSchema.parse(request.body ?? {});

    // Resolve target tenant.
    const slug = validateSlug(body.tenantSlug);
    const tenantRows = await prisma.$queryRawUnsafe<{ id: string; slug: string }[]>(
      `SELECT id, slug FROM public.tenants WHERE slug = $1 AND is_active = true LIMIT 1`,
      slug,
    );
    if (tenantRows.length === 0) {
      throw new AppError('NOT_FOUND', 404, `Tenant '${slug}' not found`);
    }
    const tenantSchema = `tenant_${slug}`;

    // Verify the schema actually exists. createPage will fail loudly if it
    // doesn't, but a 400 with a clearer message is friendlier.
    const schemaCheck = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
       ) AS exists`,
      tenantSchema,
    );
    if (!schemaCheck[0]?.exists) {
      throw new AppError(
        'TENANT_SCHEMA_MISSING',
        400,
        `Tenant schema '${tenantSchema}' does not exist — provision the tenant first`,
      );
    }

    const result = await buildPages(body, tenantSchema);
    return reply.code(200).send({ data: result });
  });
}

async function buildPages(input: BuildPagesInput, tenantSchema: string): Promise<BuildResult> {
  const errors: string[] = [];
  // warnings = non-blocking advisory messages surfaced to the operator
  // after build (so they can tighten prompts / re-run sections). Distinct
  // from errors which mean "the build is partially broken". Currently:
  // ensureCtaLast appends here when it had to synthesize a CTA the
  // planner forgot, so the operator can see which pages need prompt
  // tuning even though the build itself succeeded.
  const warnings: string[] = [];
  let pagesCreated = 0;
  let sectionsCreated = 0;
  let menusCreated = 0;

  // The placeholder-image situation (UNSPLASH_ACCESS_KEY unset →
  // empty image slots → brand-color gradient fallback in the
  // renderer) is intentional and known to the operator — no need to
  // surface it as a build-result error every single run.

  // Wipe-and-rebuild: AI 빌더는 super_admin이 한 사이트의 구조를 통째로
  // 새로 만드는 도구. 기존 페이지/섹션/메뉴를 그대로 두면 sort_order 충돌
  // + 슬러그 unique 위반이 나고, 결과적으로 두 번 빌드하면 절반은 실패한
  // 사이트가 남는다. 호출 진입 시 그 tenant의 pages/page_sections/menus를
  // 비우고 다시 만든다. menus → page_sections → pages 순서 (FK 의존성 역순).
  // shared_images, settings, theme 같은 다른 테이블은 건드리지 않는다.
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "${tenantSchema}".menus`);
    await prisma.$executeRawUnsafe(`DELETE FROM "${tenantSchema}".page_sections`);
    await prisma.$executeRawUnsafe(`DELETE FROM "${tenantSchema}".pages`);
  } catch (err) {
    errors.push(`Wipe failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Skip menu groups (slug starting with "#") and child pages first pass.
  // We persist them in display order so sort_order matches the wizard view.
  const realPages = input.sitemap.filter((p) => !p.slug.startsWith('#'));

  // pageId by wizard slug — needed to wire up child menus to their parent
  // page after both have been created.
  const pageIdByWizardSlug: Record<string, string> = {};

  for (let pageIdx = 0; pageIdx < realPages.length; pageIdx++) {
    // Cast — zod's schema (name: z.string().min(1), slug: z.string().min(1))
    // guarantees these are present at runtime, but tsc on Railway sometimes
    // infers them as optional (depends on tsconfig resolution). Cast keeps
    // the build deterministic; helpers below depend on required strings.
    const pageSpec = realPages[pageIdx]! as { name: string; slug: string; parent?: string };
    const normalizedSlug = normalizeSlug(pageSpec.slug);

    try {
      // Phase 11-A2 (2026-06-02): b2bsmart 의 createPage 는 'kind'/'isDefault'
      // 를 받지만 dw-church 의 pages/schema 에는 그 필드들이 없음. drop —
      // 모든 dw-church 페이지는 'static' kind 이고 default 개념이 따로 없음.
      const page = await createPage(tenantSchema, {
        title: pageSpec.name,
        slug: normalizedSlug,
        // First page in the sitemap (after menu groups) becomes the home page.
        // The wizard puts "Home" at index 0 by convention.
        isHome: pageIdx === 0,
        status: 'published' as const,
        sortOrder: pageIdx,
      });
      pagesCreated += 1;
      pageIdByWizardSlug[pageSpec.slug] = page.id;

      const rawSections = input.pageContents[pageSpec.slug] ?? [];
      // Refuse to build a page without sections. The previous flow let
      // build-pages proceed with an empty array, then synthesizeHero
      // would silently inject a placeholder hero (title=pageName,
      // empty subtitle/description) so the storefront didn't render
      // a literally blank page — but the operator never knew the page
      // had no real content.
      if (rawSections.length === 0) {
        errors.push(
          `Page '${pageSpec.name}' (${pageSpec.slug}) has no AI-generated sections — refusing to write placeholders`,
        );
        continue;
      }
      // Two symmetric guardrails: every page starts with hero, ends with cta.
      // Both are required by the operator's "every page is a conversion ramp"
      // rule (feedback-last-section-must-be-cta). ensureCtaLast was previously
      // missing — a page that LLM closed with features-grid / testimonials
      // would silently ship without a CTA. Now synthesized if absent.
      const sectionsWithHero = ensureHeroFirst(rawSections, pageSpec, input.designSystem);
      const sections = ensureCtaLast(sectionsWithHero, pageSpec, warnings);
      // dasomweb 6-pattern QA — append advisory warnings (build still
      // succeeds). See qaDasomwebPatterns for the checklist.
      qaDasomwebPatterns(sections, pageSpec, warnings);

      // Pre-warm the Unsplash cache for every keyword this page needs.
      // One Promise.all batch per page keeps the build snappy while
      // still giving each section a content-relevant photo. Skipped
      // (no-op) when UNSPLASH_ACCESS_KEY is unset.
      const mappedPreview = sections
        .map((spec) => {
          const m = mapSectionToBlock(spec);
          return m ? { spec, mappedBlockType: m.blockType } : null;
        })
        .filter((x): x is { spec: SectionSpec; mappedBlockType: string } => x !== null);
      await prefetchKeywordsForPage(mappedPreview, pageSpec.name, input.business);

      for (let secIdx = 0; secIdx < sections.length; secIdx++) {
        const secSpec = sections[secIdx]!;
        try {
          const mapped = mapSectionToBlock(secSpec);
          if (!mapped) continue;
          // Backfill placeholder images so blocks that the LLM left
          // image-blank (hero, text_image, image_gallery) still render
          // with something visual. Keyword feeds the Unsplash cache the
          // prefetch above warmed for this page.
          const keyword = deriveImageKeyword(
            mapped.blockType,
            mapped.props,
            pageSpec.name,
            input.business,
          );
          const enrichedProps = enrichBlockMediaSlots(
            mapped.blockType,
            mapped.props,
            { tenantSlug: input.tenantSlug, pageSlug: pageSpec.slug, sortOrder: secIdx, keyword },
          );
          // Phase-3: pick up an optional per-section design override
          // keyed by `${pageSlug}#${sortOrder}`. The Designer LLM (or
          // operator-edited Design step) may attach BlockStyle to specific
          // sections to nudge spacing / background / typography without
          // touching the global theme.
          const overrideKey = `${pageSpec.slug}#${secIdx}`;
          const styleOverrides = (input.perSection[overrideKey] as BlockStyle | undefined) ?? undefined;

          await createSection(tenantSchema, page.id, {
            blockType: mapped.blockType as 'hero_banner',
            props: enrichedProps,
            sortOrder: secIdx,
            isVisible: true,
            ...(styleOverrides ? { styleOverrides } : {}),
          });
          sectionsCreated += 1;
        } catch (err) {
          errors.push(
            `Section ${secIdx} on page '${pageSpec.name}' failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      errors.push(
        `Page '${pageSpec.name}' failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Navigation menus ────────────────────────────────────
  // Walk the wizard sitemap top-down, materializing menu rows in the same
  // order the user arranged them. Parent resolution, in priority order:
  //   1. entry.parent set explicitly by the user / AI in the wizard.
  //   2. Slug-shape inference: "/a/b" → parent "/a" if "/a" is in the
  //      sitemap. Falls back to a "#a" menu group if "/a" isn't a real
  //      page (covers the common AI shape where 5 product pages share a
  //      "/our-orchids/*" prefix but the AI didn't emit a parent /our-orchids).
  //   3. Top level otherwise.
  // Slug "#name" is treated as a label-only menu group (no linked page).
  // Skip the home page; b2bsmart routes "/" to the is_home page, so a
  // "Home" menu row would just be redundant clutter.
  const menuIdByWizardSlug: Record<string, string> = {};
  let menuOrder = 0;

  // Pre-pass: index sibling-prefix groups so we can synthesize a virtual
  // parent menu when the AI returned a flat list of category-style pages.
  const slugSet = new Set(input.sitemap.map((s) => s.slug));
  const inferredGroupLabels: Record<string, string> = {}; // virtual parent slug → label
  for (const entry of input.sitemap) {
    const inferred = inferParentSlug(entry, slugSet);
    if (!inferred) continue;
    if (slugSet.has(inferred)) continue; // real parent already exists
    if (inferredGroupLabels[inferred]) continue;
    inferredGroupLabels[inferred] = humanizeSlug(inferred);
  }

  // Materialize virtual group menus first so children can reference them.
  for (const [virtualSlug, label] of Object.entries(inferredGroupLabels)) {
    try {
      const menu = await createMenu(tenantSchema, {
        label,
        pageId: null,
        externalUrl: null,
        parentId: null,
        sortOrder: menuOrder++,
        isVisible: true,
      });
      menuIdByWizardSlug[virtualSlug] = menu.id;
      menusCreated += 1;
    } catch (err) {
      errors.push(
        `Menu group '${label}' failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  for (const entry of input.sitemap) {
    // Don't surface the home page in the menu — it's the brand link.
    if (entry.slug && pageIdByWizardSlug[entry.slug]) {
      const idx = realPages.findIndex((p) => p.slug === entry.slug);
      if (idx === 0) continue;
    }

    const explicitParent = entry.parent
      ? menuIdByWizardSlug[entry.parent] ?? null
      : null;
    const inferredParentSlug = inferParentSlug(entry, slugSet);
    const inferredParent =
      inferredParentSlug ? menuIdByWizardSlug[inferredParentSlug] ?? null : null;
    const parentMenuId = explicitParent ?? inferredParent ?? null;

    const isGroup = entry.slug.startsWith('#');
    const linkedPageId = isGroup ? null : pageIdByWizardSlug[entry.slug] ?? null;

    // Skip menu rows whose linked page never got created (e.g. createPage threw).
    if (!isGroup && !linkedPageId) continue;

    try {
      const menu = await createMenu(tenantSchema, {
        label: entry.name,
        pageId: linkedPageId,
        externalUrl: null,
        parentId: parentMenuId,
        sortOrder: menuOrder++,
        isVisible: true,
      });
      menuIdByWizardSlug[entry.slug] = menu.id;
      menusCreated += 1;
    } catch (err) {
      errors.push(
        `Menu '${entry.name}' failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Persist the wizard's business / strategy / designSystem inputs into the
  // tenant's settings table. The per-page "AI 추천" button later reads these
  // back so the LLM has the full business context — without this, every
  // page-level AI call ran against an empty profile and produced generic
  // boilerplate. See builder-routes/routes.ts page-content enrichment.
  try {
    await persistAiContext(tenantSchema, input.business, input.strategy, input.designSystem);
  } catch (err) {
    errors.push(`AI context persist failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Apply the wizard's selected palette + fonts to the tenant's live theme.
  // Without this, the storefront kept rendering with the default `modern`
  // template even though the user explicitly picked, say, "Light Minimal" in
  // the wizard — silent regression that made the wizard's design step feel
  // ineffective. ThemeEditor still allows post-build adjustment.
  try {
    await applyDesignToTheme(tenantSchema, input.designSystem);
  } catch (err) {
    errors.push(`Theme apply failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { tenantSchema, pagesCreated, sectionsCreated, menusCreated, errors, warnings };
}

async function persistAiContext(
  tenantSchema: string,
  business: Record<string, unknown>,
  strategy: Record<string, unknown>,
  designSystem: Record<string, unknown>,
): Promise<void> {
  const upsert = async (key: string, payload: Record<string, unknown>): Promise<void> => {
    if (!payload || Object.keys(payload).length === 0) return;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      key,
      JSON.stringify(payload),
    );
  };
  await upsert('ai_business_profile', business);
  await upsert('ai_strategy', strategy);
  await upsert('ai_design_system', designSystem);
}

/**
 * Map the wizard's chosen palette + fonts onto the tenant's active theme row.
 *
 * Wizard outputs (designSystem):
 *   selectedColors        — 8-color palette (primary..border)
 *   selectedHeadingFont   — heading font name (English)
 *   selectedBodyFont      — body font name (English)
 *   selectedKoreanFont    — Korean fallback font
 *
 * Theme row (tenant_*.themes.settings):
 *   colors  — same 6+2 keys
 *   fonts   — { heading, body, koreanFont }
 *
 * Skipping the apply if the wizard didn't reach the design step (no
 * selectedColors) — that path runs in legacy "instant build" mode where
 * users keep whatever theme they had.
 */
/**
 * Pure conversion: PlannerWizard `designSystem` shape → updateTheme input.
 * Exported so the integration test (apps/server/src/__tests__/modules/
 * ai-design-flow.test.ts) can pin the field mapping without DB mocking.
 *
 * Returns null when the wizard skipped the design step (no selected colors
 * AND no fonts) — caller should leave the existing theme alone.
 */
export function designSystemToThemeInput(
  designSystem: Record<string, unknown>,
): Parameters<typeof updateTheme>[1] | null {
  if (!designSystem || Object.keys(designSystem).length === 0) return null;

  // Operator picks (set when user clicks a palette/fontset card in the
  // wizard's Design step). When they skip the step entirely we still
  // want the AI's auto-suggested first option applied — otherwise the
  // tenant ships with template defaults (blue/amber/Pretendard) and
  // looks identical to every other tenant.
  const colors = designSystem.selectedColors as Record<string, string> | undefined;
  const heading = designSystem.selectedHeadingFont as string | undefined;
  const body = designSystem.selectedBodyFont as string | undefined;
  const koreanFont = designSystem.selectedKoreanFont as string | undefined;

  // No silent [0] fallback. If the operator didn't explicitly pick a
  // palette / fontset in the wizard, the theme stays untouched. The old
  // path auto-applied colorOptions[0] / fontOptions[0] across every
  // tenant whenever the operator clicked "다음" without selecting,
  // producing the "every tenant looks the same" symptom. Now the wizard
  // is the single source of truth — if it's missing selectedColors /
  // selectedHeadingFont, theme update is a no-op (theme.json from
  // the tenant's last manual edit, or the global default, persists).
  if (!colors && !heading && !body && !koreanFont) return null;

  const input: Parameters<typeof updateTheme>[1] = {};
  if (colors) {
    input.colors = {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      muted: colors.muted,
      border: colors.border,
    };
  }
  if (heading || body || koreanFont) {
    input.fonts = {
      ...(heading ? { heading } : {}),
      ...(body ? { body } : {}),
      ...(koreanFont ? { koreanFont } : {}),
    };
  }

  if (heading || body || colors?.text) {
    // Smart per-level color mapping — the WHOLE POINT of the AI Builder
    // generating 8 palette colors is to use them as a hierarchy. Slamming
    // `text` on every heading wastes 7 of those 8 colors and gives the
    // operator a flat, single-color page. The mapping below uses 4
    // colors meaningfully:
    //
    //   h1               ← primary (brand-forward — the page's most
    //                      prominent title)
    //   h2, h3           ← text    (default neutral, high readability)
    //   h4, h5, h6       ← muted   (faded subhead — visual hierarchy)
    //   paragraph, body  ← text
    //   accent (label)   ← accent  (small emphasis labels, buttons-as-text)
    //
    // Operator can override any level via TypographyEditor without
    // touching the rest. When they apply a new colorset the same mapping
    // re-applies (see updateTheme propagation in modules/themes/service).
    const colText = colors?.text;
    const colPrimary = colors?.primary;
    const colMuted = colors?.muted ?? colors?.secondary;
    const colAccent = colors?.accent ?? colors?.muted;

    // Agents' /design-system also returns
    //   fontSizes: { desktop: { h1, h2, h3, body }, mobile: {...} }
    // The h4-h6 sizes aren't generated; TypographyEditor's hardcoded
    // fallbacks fill them in. Mobile sizes go under .mobile.fontSize so
    // storefront can render responsive typography without re-fetching.
    const sizes = (designSystem.fontSizes ?? {}) as {
      desktop?: Record<string, string>;
      mobile?: Record<string, string>;
    };
    const desktop = sizes.desktop ?? {};
    const mobile = sizes.mobile ?? {};

    const buildLevel = (
      fam: string | undefined,
      col: string | undefined,
      fontSize?: string,
      mobileFontSize?: string,
    ): Record<string, unknown> | undefined => {
      const v: Record<string, unknown> = {};
      if (fam) v.fontFamily = fam;
      if (col) v.color = col;
      if (fontSize) v.fontSize = fontSize;
      if (mobileFontSize) v.mobile = { fontSize: mobileFontSize };
      return Object.keys(v).length > 0 ? v : undefined;
    };

    input.typography = {
      ...(buildLevel(heading, colPrimary ?? colText, desktop.h1, mobile.h1) ? { h1: buildLevel(heading, colPrimary ?? colText, desktop.h1, mobile.h1)! } : {}),
      ...(buildLevel(heading, colText, desktop.h2, mobile.h2) ? { h2: buildLevel(heading, colText, desktop.h2, mobile.h2)! } : {}),
      ...(buildLevel(heading, colText, desktop.h3, mobile.h3) ? { h3: buildLevel(heading, colText, desktop.h3, mobile.h3)! } : {}),
      ...(buildLevel(heading, colMuted ?? colText) ? { h4: buildLevel(heading, colMuted ?? colText)! } : {}),
      ...(buildLevel(heading, colMuted ?? colText) ? { h5: buildLevel(heading, colMuted ?? colText)! } : {}),
      ...(buildLevel(heading, colMuted ?? colText) ? { h6: buildLevel(heading, colMuted ?? colText)! } : {}),
      ...(buildLevel(body, colText, desktop.body, mobile.body) ? { paragraph: buildLevel(body, colText, desktop.body, mobile.body)! } : {}),
      ...(buildLevel(body, colText, desktop.body, mobile.body) ? { body: buildLevel(body, colText, desktop.body, mobile.body)! } : {}),
      ...(colAccent ? { accent: { color: colAccent } } : {}),
    };
  }

  const legacyForConvert: LegacyThemeBlob = {
    colors: input.colors,
    fonts: input.fonts,
  };
  input.tokensV2 = legacyThemeToTokens(legacyForConvert) as unknown as Parameters<typeof updateTheme>[1]['tokensV2'];

  return input;
}

async function applyDesignToTheme(
  tenantSchema: string,
  designSystem: Record<string, unknown>,
): Promise<void> {
  const input = designSystemToThemeInput(designSystem);
  if (!input) return;
  await updateTheme(tenantSchema, input);
}

/* ──────────────────────────────────────────────────────────
 * Media slot enrichment
 * ──────────────────────────────────────────────────────────
 * The agent pipeline leaves image fields blank (no image generation
 * in build-pages yet). Rather than persisting empty rows, we backfill
 * a deterministic placeholder so every page is visually complete on
 * first build.
 *
 * Slots that get a placeholder today:
 *   hero_banner.backgroundImageUrl   (image-overlay / page-hero)
 *   hero_banner.imageUrl             (split-image)
 *   text_image.imageUrl              (the side image)
 *   image_gallery.images[]           (when empty)
 *
 * Slots that stay blank for now (the renderer doesn't know what to do
 * with them yet — these are forward hooks for the upcoming
 * media-slot variants):
 *   hero_banner.mediaType / mediaUrl   (video / form / map)
 *   text_image.mediaType  / mediaUrl
 *
 * When the AI image-generation flow lands, swap fillImage() for the
 * Gemini/Stable-Diffusion call and the rest of build-pages stays put.
 */

interface MediaCtx {
  tenantSlug: string;
  pageSlug: string;
  sortOrder: number;
  /**
   * Search query to feed Unsplash. Caller composes from business
   * industry + page name + section title so the placeholder photos
   * actually relate to the content. Empty/missing → Picsum fallback.
   */
  keyword?: string;
}

function enrichBlockMediaSlots(
  blockType: string,
  props: Record<string, unknown>,
  ctx: MediaCtx,
): Record<string, unknown> {
  const out = { ...props };

  if (blockType === 'hero_banner') {
    const variant = (out.variant as string) || 'image-overlay';
    if (variant === 'split-image') {
      out.imageUrl = fillImage(out.imageUrl as string | undefined, {
        tenantSlug: ctx.tenantSlug,
        pageSlug: ctx.pageSlug,
        sortOrder: ctx.sortOrder,
        role: 'hero-side',
        keyword: ctx.keyword,
      });
    } else if (variant !== 'text-only') {
      // image-overlay or page-hero — wants a full-bleed bg image.
      out.backgroundImageUrl = fillImage(out.backgroundImageUrl as string | undefined, {
        tenantSlug: ctx.tenantSlug,
        pageSlug: ctx.pageSlug,
        sortOrder: ctx.sortOrder,
        role: 'hero-bg',
        keyword: ctx.keyword,
      });
    }
    return out;
  }

  if (blockType === 'text_image') {
    out.imageUrl = fillImage(out.imageUrl as string | undefined, {
      tenantSlug: ctx.tenantSlug,
      pageSlug: ctx.pageSlug,
      sortOrder: ctx.sortOrder,
      role: 'section',
      keyword: ctx.keyword,
    });
    return out;
  }

  if (blockType === 'image_gallery') {
    const existing = Array.isArray(out.images) ? (out.images as unknown[]) : [];
    if (existing.length === 0) {
      // Generate 6 placeholder card images so the gallery isn't empty.
      // imageIndex spreads across the cached Unsplash search result set
      // so adjacent gallery cards don't repeat the same photo.
      out.images = Array.from({ length: 6 }, (_, i) =>
        fillImage(undefined, {
          tenantSlug: ctx.tenantSlug,
          pageSlug: ctx.pageSlug,
          sortOrder: ctx.sortOrder * 10 + i,
          role: 'card',
          keyword: ctx.keyword,
          imageIndex: i,
        }),
      );
    }
    return out;
  }

  // cta_section / quote_block — both render SectionBackground when
  // backgroundImageUrl is set. The variant set most likely to want a
  // background image is cta_section's 'image-overlay' (hero-style CTA)
  // and any quote with a content-relevant photo. Only autofill when the
  // pattern-map output didn't pre-populate (the AI emitted imagePrompt
  // but no URL) — operator-supplied URLs stay untouched.
  if (blockType === 'cta_section') {
    const variant = (out.variant as string) || '';
    // image-overlay is the only CTA variant that visually uses a
    // background image. Other variants (boxed-card / inline-banner /
    // split-image / stats-strip) layout the image elsewhere or not at
    // all. Skip the autofill on those to avoid drowning the CTA in
    // unrelated photos.
    if (variant === 'image-overlay') {
      out.backgroundImageUrl = fillImage(out.backgroundImageUrl as string | undefined, {
        tenantSlug: ctx.tenantSlug,
        pageSlug: ctx.pageSlug,
        sortOrder: ctx.sortOrder,
        role: 'hero-bg',
        keyword: ctx.keyword,
      });
    }
    return out;
  }

  if (blockType === 'quote_block') {
    // Quote blocks look great with a soft thematic photo behind, but
    // the existing renderer treats backgroundImageUrl as optional —
    // only autofill when the AI emitted an imagePrompt (signal that
    // it wanted an image here), not on every quote.
    if (out.imagePrompt || out.backgroundImagePrompt) {
      out.backgroundImageUrl = fillImage(out.backgroundImageUrl as string | undefined, {
        tenantSlug: ctx.tenantSlug,
        pageSlug: ctx.pageSlug,
        sortOrder: ctx.sortOrder,
        role: 'hero-bg',
        keyword: ctx.keyword,
      });
    }
    return out;
  }

  return out;
}

/**
 * Build a content-relevant Unsplash query from the section + page +
 * business context. Keeps it short — Unsplash search responds best
 * to a few weighted keywords (industry + topic). Falls back to the
 * page name alone when industry/business info is missing.
 */
function deriveImageKeyword(
  blockType: string,
  sectionProps: Record<string, unknown>,
  pageName: string,
  business: Record<string, unknown>,
): string {
  const industry = String(business.industry ?? business.businessName ?? '').trim();

  // Pick the most descriptive content field per block type.
  const sectionPick =
    blockType === 'image_gallery' ? 'portfolio' :
    blockType === 'hero_banner'   ? (
      (sectionProps.title as string) ||
      (sectionProps.subtitle as string) ||
      pageName
    ) :
    /* text_image / others */     (
      (sectionProps.title as string) ||
      (sectionProps.subtitle as string) ||
      pageName
    );

  const parts = [industry, (sectionPick ?? '').trim()].filter(Boolean);
  return parts.join(' ').slice(0, 80) || pageName || 'business';
}

/**
 * Walk every section that will be built for this page, derive an
 * Unsplash keyword per image-bearing block, and prefetch them all in
 * one Promise.all so the per-section enrichment loop hits warm cache
 * with no per-call network latency. No-op when UNSPLASH_ACCESS_KEY is
 * unset — placeholder-images falls back to Picsum.
 */
async function prefetchKeywordsForPage(
  sections: Array<{ spec: SectionSpec; mappedBlockType: string }>,
  pageName: string,
  business: Record<string, unknown>,
): Promise<void> {
  const queries = sections
    .filter((s) => s.mappedBlockType === 'hero_banner' ||
                   s.mappedBlockType === 'text_image' ||
                   s.mappedBlockType === 'image_gallery')
    .map((s) => deriveImageKeyword(
      s.mappedBlockType,
      (s.spec as unknown as Record<string, unknown>),
      pageName,
      business,
    ));
  await prefetchUnsplash(queries);
}

/* ──────────────────────────────────────────────────────────
 * Hero safety net
 * ──────────────────────────────────────────────────────────
 * Even with the C4 prompt rules in place, the LLM occasionally emits
 * pages that open with text/cta/features instead of a hero. The wizard's
 * hero design choices (designSystem.heroStyles) become meaningless if
 * the very first section ignores them, so this layer guarantees that
 * every persisted page starts with a hero variant — synthesising one
 * from designSystem.heroStyles + the inferred page type when the LLM
 * skipped it.
 */

const HERO_SECTION_KEYS = new Set([
  'hero',
  'hero-section',
  'hero-split',
  'hero-text',
  'page-hero',
  'cover',
  'banner',
  'hero-form',
  'hero-map',
]);

function ensureHeroFirst(
  sections: SectionSpec[],
  pageSpec: { name: string; slug: string },
  designSystem: Record<string, unknown>,
): SectionSpec[] {
  const first = sections[0];
  const firstKey = ((first?.gutenbergPattern || first?.sectionType) ?? '')
    .toString()
    .toLowerCase();
  if (first && HERO_SECTION_KEYS.has(firstKey)) {
    return sections;
  }
  return [synthesizeHero(pageSpec, designSystem), ...sections];
}

const CTA_SECTION_KEYS = new Set(['cta', 'cta-section', 'cta-banner']);

/**
 * dasomweb 6-pattern QA — feedback-design-quality-benchmark. Inspects a
 * page's final section list (after ensureHero/ensureCta) and pushes
 * advisory warnings when the page misses common quality patterns. None
 * of these block the build; the operator gets the page either way, but
 * the wizard's "참고" toast surfaces missed improvements.
 *
 * Checks (lightweight — defer the deeper checks (heading hierarchy /
 * alt text / eyebrow per-section) to a future QA agent that reads the
 * persisted DB rows):
 *   1. Page diversity — same sectionType twice in a row triggers warn
 *   2. Section count — < 4 sections feels thin (dasomweb pages have 5-7)
 *   3. CTA presence — already ensured by ensureCtaLast; this is the
 *      double-check telemetry
 */
function qaDasomwebPatterns(
  sections: SectionSpec[],
  pageSpec: { name: string; slug: string },
  warnings: string[],
): void {
  const types = sections
    .map((s) => ((s.gutenbergPattern || s.sectionType) ?? '').toString().toLowerCase())
    .filter(Boolean);

  // 1. Adjacent duplicate sectionType
  for (let i = 1; i < types.length; i++) {
    if (types[i] && types[i] === types[i - 1]) {
      warnings.push(
        `Page '${pageSpec.name}' (${pageSpec.slug}): adjacent duplicate section type '${types[i]}' at positions ${i - 1}, ${i}. dasomweb benchmark: vary sectionType per row.`,
      );
      break;
    }
  }

  // 2. Section count
  if (types.length < 4) {
    warnings.push(
      `Page '${pageSpec.name}' (${pageSpec.slug}): only ${types.length} section(s). dasomweb benchmark: 4-7 sections per page for proper vertical rhythm.`,
    );
  }

  // 3. Pattern variety — at least 3 distinct types per page
  const unique = new Set(types).size;
  if (unique < 3 && types.length >= 3) {
    warnings.push(
      `Page '${pageSpec.name}' (${pageSpec.slug}): only ${unique} distinct section types across ${types.length} sections. Mix more patterns (testimonials / stats / faq / team / etc).`,
    );
  }
}

/**
 * Operator rule (feedback-last-section-must-be-cta): EVERY page must end
 * with a cta-section. Symmetric to ensureHeroFirst — if the planner /
 * copywriter didn't put a CTA at the bottom (or used a non-CTA pattern
 * like features-grid / testimonials / faq as the closer), synthesize a
 * minimal cta-section so the page still ramps the visitor to the next
 * action.
 *
 * The synthesized CTA is intentionally sparse — title only, no copy.
 * The build-pages adapter's pattern-map will map it to cta_section block;
 * the operator can then fill in proper copy via the inspector. Better
 * than silently shipping a page without a CTA.
 */
function ensureCtaLast(
  sections: SectionSpec[],
  pageSpec: { name: string; slug: string },
  warnings?: string[],
): SectionSpec[] {
  const last = sections[sections.length - 1];
  const lastKey = ((last?.gutenbergPattern || last?.sectionType) ?? '')
    .toString()
    .toLowerCase();
  if (last && CTA_SECTION_KEYS.has(lastKey)) {
    return sections;
  }
  // Telemetry — the operator wants to know which pages the planner forgot
  // to close with CTA so the prompt can be tightened next iteration. The
  // synthesized fallback ships a usable page, but the warning surfaces
  // the underlying planner failure in the build response.
  if (warnings) {
    warnings.push(
      `Page '${pageSpec.name}' (${pageSpec.slug}): planner did not close with cta-section, synthesized fallback. Review planner prompt + LLM output.`,
    );
  }
  return [...sections, synthesizeCta(pageSpec)];
}

function synthesizeCta(pageSpec: { name: string; slug: string }): SectionSpec {
  // Title falls back to the page name so the synthesized CTA isn't an
  // empty card — the operator sees "Contact" / "Pricing" etc. and can
  // edit. Empty subtitle / description / button so pattern-map.ts:166's
  // null-return on missing title doesn't fire (it requires a title).
  return {
    sectionType: 'cta-section',
    gutenbergPattern: 'cta-section',
    title: pageSpec.name,
    subtitle: '',
    description: '',
  };
}

function synthesizeHero(
  pageSpec: { name: string; slug: string },
  designSystem: Record<string, unknown>,
): SectionSpec {
  const heroStyles = (designSystem.heroStyles as Record<string, unknown> | undefined) ?? {};
  const pageType = inferPageType(pageSpec.slug);

  // Pull the user-selected variant for this page type, if any.
  // Fall back to a sensible per-type default.
  const homeStyle = heroStyles.homeHero as { variant?: string } | undefined;
  const subStyle = heroStyles.subPageHero as { variant?: string } | undefined;
  const contactStyle = heroStyles.contactHero as { variant?: string } | undefined | null;
  const locationStyle = heroStyles.locationHero as { variant?: string } | undefined | null;

  let variant: string;
  if (pageType === 'home') {
    variant = homeStyle?.variant ?? 'image-overlay';
  } else if (pageType === 'contact' && contactStyle) {
    // form-split lands as page-hero today (renderer ships later).
    variant = contactStyle.variant ?? 'page-hero';
  } else if (pageType === 'location' && locationStyle) {
    variant = locationStyle.variant ?? 'page-hero';
  } else {
    variant = subStyle?.variant ?? 'page-hero';
  }

  return {
    sectionType: variantToSectionType(variant),
    gutenbergPattern: variantToSectionType(variant),
    title: pageSpec.name,
    subtitle: '',
    description: '',
  };
}

function inferPageType(slug: string): 'home' | 'contact' | 'location' | 'sub' {
  if (!slug || slug === '/' || slug === '') return 'home';
  const s = slug.toLowerCase();
  if (s.includes('contact') || s.includes('quote') || s.includes('consult') || s.includes('book')) {
    return 'contact';
  }
  if (s.includes('location') || s.includes('branch') || s.includes('store-finder')) {
    return 'location';
  }
  return 'sub';
}

function variantToSectionType(variant: string): string {
  switch (variant) {
    case 'image-overlay': return 'hero';
    case 'split-image':   return 'hero-split';
    case 'page-hero':     return 'page-hero';
    case 'text-only':     return 'hero-text';
    case 'form-split':    return 'hero-form';
    case 'map-split':     return 'hero-map';
    default:              return 'page-hero';
  }
}

/**
 * Infer the parent slug for a sitemap entry from its slug shape.
 *
 * "/our-orchids/phalaenopsis"  → "/our-orchids"
 * "/about/team"                → "/about"
 * "/contact" or "/" or "#name" → null (top-level / menu group / home)
 *
 * The caller decides what to do when the inferred parent doesn't exist
 * as a real sitemap entry — usually it synthesises a virtual menu group
 * using humanizeSlug() so 5 sibling pages don't all sit at the top.
 */
function inferParentSlug(
  entry: { slug: string },
  _siblings: Set<string>,
): string | null {
  const slug = entry.slug;
  if (!slug || slug === '/' || slug.startsWith('#')) return null;
  if (!slug.startsWith('/')) return null;
  const parts = slug.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * Convert a slug-shape parent like "/our-orchids" into a friendly label
 * for a synthesized menu group ("Our Orchids").
 */
function humanizeSlug(slug: string): string {
  return slug
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .pop()!
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/**
 * Wizard slugs look like '/about', '/services/wholesale', or '/'.
 * pages.slug is unique per tenant and stores just the leaf — strip the
 * leading slash and collapse '/' into a path-like form.
 */
function normalizeSlug(raw: string): string {
  let s = raw.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!s) s = 'home';
  // Replace nested slashes with hyphens to keep slugs flat (the b2bsmart
  // page schema uses unique slugs without explicit hierarchy in the row).
  s = s.replace(/\//g, '-').toLowerCase();
  return s;
}
