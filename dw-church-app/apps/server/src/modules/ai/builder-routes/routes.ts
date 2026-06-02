import type { FastifyInstance } from 'fastify';
import { env } from '../../../config/env.js';
import { prisma } from '../../../config/database.js';
import { requireAdmin } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import { validateSlug } from '../../../utils/validate-schema.js';
import { profileFor, modeFor } from './block-tag-map.js';

/**
 * Builder-scoped AI endpoints — accessible to any tenant admin (not just
 * super_admin).
 *
 * Why split from the general planner-proxy?
 * - /api/v1/ai/planner/* drives the 7-step Planner Wizard which builds an
 *   entire site at once. Heavy, expensive — gated to super_admin so a
 *   tenant admin can't accidentally fire it for their own org.
 * - /api/v1/ai/builder/* is the per-section "✨ AI image" / "✨ AI copy"
 *   button inside the page builder. Cheap, scoped to one section, used
 *   during normal day-to-day editing — needs the tenant admin role only.
 *
 * Same agents service backs both; only the auth gate differs.
 */
async function forwardToAgents(
  agentsPath: string,
  body: unknown,
): Promise<{ status: number; text: string }> {
  if (!env.INTERNAL_SERVICE_TOKEN) {
    throw new AppError('CONFIG_ERROR', 503, 'INTERNAL_SERVICE_TOKEN not configured');
  }
  const upstream = `${env.AGENTS_BASE_URL.replace(/\/$/, '')}${agentsPath}`;
  let response: Response;
  try {
    response = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    throw new AppError(
      'AGENTS_UNREACHABLE',
      503,
      `Agents service unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return { status: response.status, text: await response.text() };
}

function returnUpstream(reply: import('fastify').FastifyReply, upstream: { status: number; text: string }) {
  if (upstream.status >= 400) {
    let detail = `agents responded ${upstream.status}`;
    try {
      const j = JSON.parse(upstream.text) as { detail?: unknown };
      if (j.detail) detail = String(j.detail);
    } catch { /* not JSON */ }
    throw new AppError('AGENTS_ERROR', upstream.status, detail);
  }
  return reply
    .code(200)
    .header('content-type', 'application/json; charset=utf-8')
    .send(upstream.text);
}

/**
 * Read the AI context the wizard persisted into a tenant's settings during
 * /ai/build-pages. Returns whatever's there — empty object on miss/parse-fail.
 *
 * The wizard stores three JSON blobs:
 *   ai_business_profile  → { businessName, industry, description, services, targetAudience, ... }
 *   ai_strategy          → marketing strategy from /auto-strategy step
 *   ai_design_system     → design system from /design-system step
 *
 * Tenants that never ran the wizard simply have no rows — the page-content
 * call still works, just falls back to generic prompts (which is what the
 * old hardcoded-empty behavior was anyway, so no regression).
 */
async function loadTenantAiContext(slug: string): Promise<{
  business: Record<string, unknown>;
  strategy: Record<string, unknown>;
  designSystem: Record<string, unknown>;
}> {
  const validated = validateSlug(slug);
  const tenantSchema = `tenant_${validated}`;
  const empty = { business: {}, strategy: {}, designSystem: {} };

  // Belt and braces — never query a schema that doesn't exist (a slug from
  // an attacker-supplied header could resolve to something past validateSlug
  // if the tenant was deleted between header creation and now).
  const schemaCheck = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS exists`,
    tenantSchema,
  );
  if (!schemaCheck[0]?.exists) return empty;

  const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
    `SELECT key, value FROM "${tenantSchema}".settings
     WHERE key IN ('ai_business_profile', 'ai_strategy', 'ai_design_system')`,
  );
  const out = { ...empty };
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value) as Record<string, unknown>;
      if (row.key === 'ai_business_profile') out.business = parsed;
      else if (row.key === 'ai_strategy') out.strategy = parsed;
      else if (row.key === 'ai_design_system') out.designSystem = parsed;
    } catch {
      // Stale or hand-edited row — drop it silently.
    }
  }
  return out;
}

/**
 * Pull common fields off the persisted business profile and shape them for
 * the agents page-content prompt. The wizard saves a richer object than the
 * agents endpoint reads, so we cherry-pick only what the prompt actually uses.
 */
function shapePageContentBody(
  raw: Record<string, unknown>,
  ctx: Awaited<ReturnType<typeof loadTenantAiContext>>,
): Record<string, unknown> {
  const business = ctx.business as Record<string, unknown>;
  const strategy = ctx.strategy as Record<string, unknown>;

  // Build a single human-readable marketing context string from whatever
  // strategy fields the wizard happened to fill in. Keeps the prompt
  // robust whether the user ran the full marketing-insight step or skipped it.
  const strategyParts: string[] = [];
  for (const k of ['voice', 'tone', 'targetAudience', 'positioning', 'valueProp', 'keyMessage']) {
    const v = strategy[k];
    if (typeof v === 'string' && v.trim()) strategyParts.push(`${k}: ${v.trim()}`);
  }
  const marketingContext = strategyParts.length > 0
    ? strategyParts.join(' / ')
    : (typeof business.description === 'string' ? business.description : '');

  // Caller-provided values win — lets the planner-driven path (super_admin)
  // keep passing explicit overrides via body. Tenant-admin path only sends
  // pageName/pageSlug/sections so this enrichment is the meaningful source.
  return {
    ...raw,
    businessName: raw.businessName || business.businessName || '',
    industry: raw.industry || business.industry || '',
    marketingContext: raw.marketingContext || marketingContext,
    designSystem: raw.designSystem || ctx.designSystem,
  };
}

export async function aiBuilderRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ai/builder/page-content', { preHandler: [requireAdmin] }, async (request, reply) => {
    const raw = (request.body ?? {}) as Record<string, unknown>;

    // Tenant resolution — header set by the SPA's DWChurchClient. Without it
    // we still run, just with no enrichment (super_admin from /super-admin
    // historically called this with a fully-formed body).
    const slug = (request.headers['x-tenant-slug'] as string | undefined)?.trim();
    let body: Record<string, unknown> = raw;
    if (slug) {
      try {
        const ctx = await loadTenantAiContext(slug);
        body = shapePageContentBody(raw, ctx);
      } catch (err) {
        request.log.warn({ err, slug }, 'page-content: failed to load tenant AI context, falling back to raw body');
      }
    }

    const upstream = await forwardToAgents('/api/planner/page-content', body);
    return returnUpstream(reply, upstream);
  });

  app.post('/ai/builder/image/generate', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!env.INTERNAL_SERVICE_TOKEN) {
      throw new AppError('CONFIG_ERROR', 503, 'INTERNAL_SERVICE_TOKEN not configured');
    }
    const upstream = `${env.AGENTS_BASE_URL.replace(/\/$/, '')}/api/planner/image/generate`;

    // Tenant resolution. /api/v1/ai/builder/* is intentionally
    // excluded from the global tenant middleware (see TENANT_SKIP_PREFIXES
    // in middleware/tenant.ts) — the original design was "AI routes
    // resolve from JWT" but that doesn't work for super_admin operating
    // on a non-home tenant. Resolve from X-Tenant-Slug header here:
    //
    //   1. Header missing → require it (tenant context is REQUIRED
    //      because the image needs to land in a specific tenant's
    //      `files` table)
    //   2. User is tenant-scoped (admin/owner/editor): the header MUST
    //      match their JWT's tenantSlug — otherwise they're trying to
    //      operate on another tenant
    //   3. User is super_admin: any active tenant slug allowed
    //
    // This is the same policy auth.ts cross-tenant check uses for
    // non-super-admin requests, just enforced inline because the
    // tenant middleware was skipped for this route family.
    const headerSlug = request.headers['x-tenant-slug'] as string | undefined;
    if (!headerSlug) {
      throw new AppError(
        'TENANT_REQUIRED',
        400,
        'X-Tenant-Slug header required for image generation',
      );
    }
    const jwtSlug = request.user?.tenantSlug;
    const role = request.user?.role ?? '';
    const isSuper = role === 'super_admin';
    if (!isSuper && jwtSlug && jwtSlug !== headerSlug) {
      throw new AppError(
        'FORBIDDEN',
        403,
        `Cannot generate images on tenant '${headerSlug}' — your session is scoped to '${jwtSlug}'`,
      );
    }
    const tenantRow = await prisma.tenant.findFirst({
      where: { slug: headerSlug, isActive: true },
      select: { id: true, slug: true },
    });
    if (!tenantRow) {
      throw new AppError(
        'TENANT_NOT_FOUND',
        404,
        `Tenant '${headerSlug}' not found or inactive`,
      );
    }
    const enrichedBody = {
      ...(request.body as Record<string, unknown> ?? {}),
      tenantSlug: tenantRow.slug,
      tenantId: tenantRow.id,
    };

    let response: Response;
    try {
      response = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(enrichedBody),
      });
    } catch (err) {
      throw new AppError(
        'AGENTS_UNREACHABLE',
        503,
        `Agents service unreachable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const text = await response.text();
    if (!response.ok) {
      let detail = `agents responded ${response.status}`;
      try {
        const j = JSON.parse(text) as { detail?: unknown };
        if (j.detail) detail = String(j.detail);
      } catch { /* not JSON */ }
      throw new AppError('AGENTS_ERROR', response.status, detail);
    }

    return reply
      .code(200)
      .header('content-type', 'application/json; charset=utf-8')
      .send(text);
  });

  // POST /api/v1/ai/builder/image/analyze — vision analyze for
  // reference photo uploads. Forwards to agents /api/planner/image/
  // analyze which runs Gemini multimodal over the image and returns
  // { description, tag }. The TenantReferences upload UI calls this
  // after uploading a new reference so newly-added rows arrive with
  // auto-captions instead of forcing operators to write each one.
  app.post('/ai/builder/image/analyze', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!env.INTERNAL_SERVICE_TOKEN) {
      throw new AppError('CONFIG_ERROR', 503, 'INTERNAL_SERVICE_TOKEN not configured');
    }
    const upstream = await forwardToAgents('/api/planner/image/analyze', request.body ?? {});
    return returnUpstream(reply, upstream);
  });

  /**
   * POST /api/v1/ai/builder/section-image/auto-match
   *
   * Pick the best existing image from the tenant's media library for a
   * given section — no new image generation. The LLM reads:
   *   - business profile (tenant settings)
   *   - target page title
   *   - section block_type + operator-supplied title / subtitle / description
   *   - itemIndex (when image lives in a list block's items[])
   *   - up to N media library candidates (their description + tags +
   *     aspectRatio + kind), filtered to ones whose tags overlap the
   *     block_type's tag preferences
   * and returns the chosen candidate's URL. If no candidate is suitable
   * (LLM signals "none") the endpoint returns 404 so the operator knows
   * the library has nothing matching and can fall back to upload / AI
   * generation.
   *
   * Body: { pageId, sectionId, itemIndex? }
   * Response: { url, mediaId, reason } — `reason` is the LLM's short
   *   Korean rationale (operator sees it in the toast).
   *
   * Distinct from /section-image/auto-generate which produces a NEW
   * image; this endpoint exclusively recycles existing tenant assets.
   */
  app.post('/ai/builder/section-image/auto-match', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!env.INTERNAL_SERVICE_TOKEN) {
      throw new AppError('CONFIG_ERROR', 503, 'INTERNAL_SERVICE_TOKEN not configured');
    }
    const body = (request.body ?? {}) as {
      pageId?: unknown;
      sectionId?: unknown;
      itemIndex?: unknown;
    };
    const pageId = typeof body.pageId === 'string' ? body.pageId : null;
    const sectionId = typeof body.sectionId === 'string' ? body.sectionId : null;
    const itemIndex = typeof body.itemIndex === 'number' && body.itemIndex >= 0
      ? Math.floor(body.itemIndex) : null;
    if (!pageId || !sectionId) {
      throw new AppError('BAD_REQUEST', 400, 'pageId and sectionId are required');
    }

    const headerSlug = request.headers['x-tenant-slug'] as string | undefined;
    if (!headerSlug) {
      throw new AppError('TENANT_REQUIRED', 400, 'X-Tenant-Slug header required');
    }
    const jwtSlug = request.user?.tenantSlug;
    const role = request.user?.role ?? '';
    const isSuper = role === 'super_admin';
    if (!isSuper && jwtSlug && jwtSlug !== headerSlug) {
      throw new AppError('FORBIDDEN', 403, `Cannot match on tenant '${headerSlug}' — your session is scoped to '${jwtSlug}'`);
    }
    const tenantRow = await prisma.tenant.findFirst({
      where: { slug: headerSlug, isActive: true },
      select: { id: true, slug: true },
    });
    if (!tenantRow) {
      throw new AppError('TENANT_NOT_FOUND', 404, `Tenant '${headerSlug}' not found or inactive`);
    }
    const schema = `tenant_${validateSlug(tenantRow.slug)}`;

    // ── Section + page rows ─────────────────────────────────────────
    type SectionRow = { id: string; page_id: string; block_type: string; props: Record<string, unknown> };
    const sectionRows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `SELECT id, page_id, block_type, props
       FROM "${schema}".page_sections
       WHERE id = $1::uuid AND page_id = $2::uuid
       LIMIT 1`,
      sectionId, pageId,
    );
    const section = sectionRows[0];
    if (!section) {
      throw new AppError('SECTION_NOT_FOUND', 404, 'Section not found on this page');
    }
    type PageRow = { id: string; title: string | null; slug: string | null };
    const pageRows = await prisma.$queryRawUnsafe<PageRow[]>(
      `SELECT id, title, slug FROM "${schema}".pages WHERE id = $1::uuid LIMIT 1`,
      pageId,
    );
    const page = pageRows[0];
    if (!page) {
      throw new AppError('PAGE_NOT_FOUND', 404, 'Page not found');
    }

    // ── Business context (best-effort) ───────────────────────────────
    const ctx = await loadTenantAiContext(tenantRow.slug);
    const biz = ctx.business as Record<string, unknown>;
    const businessName = String(biz.businessName ?? '');
    const industry = String(biz.industry ?? '');

    // ── Section text ─────────────────────────────────────────────────
    const props = (section.props ?? {}) as Record<string, unknown>;
    const sectionTitle = String(props.title ?? '');
    const sectionSubtitle = String(props.subtitle ?? '');
    const sectionDesc = String(props.description ?? '');
    let itemTitle = '';
    let itemDesc = '';
    if (itemIndex !== null) {
      const items = props.items;
      if (Array.isArray(items) && items[itemIndex] && typeof items[itemIndex] === 'object') {
        const it = items[itemIndex] as Record<string, unknown>;
        itemTitle = String(it.title ?? it.name ?? '');
        itemDesc = String(it.description ?? it.role ?? '');
      }
    }

    // ── Candidate fetch ──────────────────────────────────────────────
    // Strategy: pull up to 40 most-recent items whose tags overlap the
    // block_type's preferred tags. If profile.tags is empty (unknown
    // block type), fall back to the 40 most recent overall — the LLM
    // can still pick from descriptions alone, just with a wider net.
    const profile = profileFor(section.block_type);
    type CandidateRow = {
      id: string; url: string; original_name: string | null;
      description: string | null; tag: string | null; tags: string[] | null;
      aspect_ratio: string | null; kind: string | null;
    };
    let candidates: CandidateRow[] = [];
    if (profile.tags.length > 0) {
      candidates = await prisma.$queryRawUnsafe<CandidateRow[]>(
        `SELECT id, url, original_name, description, tag, tags, aspect_ratio, kind
         FROM "${schema}".files
         WHERE mime_type LIKE 'image/%'
           AND COALESCE(tags, CASE WHEN tag IS NOT NULL THEN ARRAY[tag] ELSE ARRAY[]::TEXT[] END) && $1::text[]
         ORDER BY created_at DESC
         LIMIT 40`,
        profile.tags,
      );
    }
    // Fallback: no tagged matches → broaden to all images. Operator may
    // not have tagged uploads yet but a description-based match can
    // still work.
    if (candidates.length === 0) {
      candidates = await prisma.$queryRawUnsafe<CandidateRow[]>(
        `SELECT id, url, original_name, description, tag, tags, aspect_ratio, kind
         FROM "${schema}".files
         WHERE mime_type LIKE 'image/%'
         ORDER BY created_at DESC
         LIMIT 40`,
      );
    }
    if (candidates.length === 0) {
      throw new AppError(
        'NO_CANDIDATES', 404,
        '미디어 라이브러리에 이미지가 없습니다. 먼저 사진을 업로드하거나 AI 생성으로 만드세요.',
      );
    }

    // ── Compose the LLM ranking prompt ───────────────────────────────
    const indPart = industry ? ` (${industry})` : '';
    const sectionCopyLines: string[] = [];
    if (businessName) sectionCopyLines.push(`비즈니스: ${businessName}${indPart}`);
    if (page.title)   sectionCopyLines.push(`페이지: "${page.title}"`);
    sectionCopyLines.push(`섹션 타입: ${section.block_type}`);
    if (sectionTitle)    sectionCopyLines.push(`섹션 제목: "${sectionTitle}"`);
    if (sectionSubtitle) sectionCopyLines.push(`섹션 부제목: "${sectionSubtitle}"`);
    if (sectionDesc)     sectionCopyLines.push(`섹션 설명: ${sectionDesc}`);
    if (itemTitle)       sectionCopyLines.push(`항목 제목: "${itemTitle}"`);
    if (itemDesc)        sectionCopyLines.push(`항목 설명: ${itemDesc}`);

    const candidateLines = candidates.map((c, i) => {
      const tagStr = Array.isArray(c.tags) && c.tags.length > 0
        ? c.tags.join(', ')
        : (c.tag ?? '');
      const tagPart = tagStr ? ` [태그: ${tagStr}]` : '';
      const ratioPart = c.aspect_ratio ? ` (${c.aspect_ratio})` : '';
      const kindPart = c.kind ? ` {${c.kind}}` : '';
      const desc = (c.description ?? c.original_name ?? '(설명 없음)').trim();
      return `${i + 1}. id=${c.id}${tagPart}${ratioPart}${kindPart} — ${desc}`;
    }).join('\n');

    const promptForLlm =
      `당신은 웹사이트 빌더의 이미지 큐레이터입니다. 운영자가 만들고 있는 섹션에 ` +
      `미디어 라이브러리의 이미지 중 가장 잘 어울리는 한 장을 골라주세요.\n\n` +
      `[섹션 컨텍스트]\n${sectionCopyLines.join('\n')}\n\n` +
      `[후보 이미지 ${candidates.length}장]\n${candidateLines}\n\n` +
      `규칙:\n` +
      `- 섹션의 의미·톤·역할에 맞는 한 장을 고르세요.\n` +
      `- 비율이 섹션과 맞으면 우대 (hero=16:9, square=1:1, section=4:3 또는 3:2).\n` +
      `- 태그가 ${profile.tags.length > 0 ? profile.tags.join('/') : '컨텍스트와 어울리는 카테고리'} 와 ` +
      `맞으면 우대.\n` +
      `- 적합한 이미지가 정말 없으면 "id": null 로 응답.\n\n` +
      `다음 JSON 형식으로만 응답 (마크다운 펜스 없이):\n` +
      `{"id": "<선택한 uuid 또는 null>", "reason": "<한국어로 1-2문장 이유>"}`;

    // ── Forward to agents' generic LLM-rank endpoint ─────────────────
    // /api/planner/llm-rank wraps a Gemini Flash call and returns the
    // raw text. We then strip markdown fences (Gemini occasionally
    // wraps JSON in ```json blocks despite explicit instructions) and
    // parse the {id, reason} envelope.
    const upstream = await forwardToAgents('/api/planner/llm-rank', {
      prompt: promptForLlm,
      maxTokens: 400,
    });
    let parsed: { id?: unknown; reason?: unknown } = {};
    try {
      const wrapper = JSON.parse(upstream.text) as { text?: string };
      let rawText = String(wrapper.text ?? '').trim();
      // Strip ```json … ``` fences if present.
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(rawText);
    } catch (err) {
      request.log.warn({ err, text: upstream.text.slice(0, 200) }, 'auto-match: failed to parse LLM JSON');
      throw new AppError('LLM_PARSE_ERROR', 502, 'AI 응답 파싱 실패 — 다시 시도하세요.');
    }
    const chosenId = typeof parsed.id === 'string' ? parsed.id : null;
    const reason = typeof parsed.reason === 'string' ? parsed.reason : '';
    if (!chosenId) {
      throw new AppError(
        'NO_MATCH', 404,
        `AI 가 적합한 이미지를 찾지 못했습니다. ${reason || '미디어 라이브러리에 어울리는 이미지가 없어 보입니다 — 업로드하거나 AI 생성을 사용하세요.'}`,
      );
    }
    const chosen = candidates.find((c) => c.id === chosenId);
    if (!chosen) {
      throw new AppError(
        'INVALID_MATCH', 502,
        'AI 가 후보 목록에 없는 ID 를 반환했습니다 — 다시 시도하세요.',
      );
    }

    return reply
      .code(200)
      .header('content-type', 'application/json; charset=utf-8')
      .send(JSON.stringify({ url: chosen.url, mediaId: chosen.id, reason }));
  });

  /**
   * POST /api/v1/ai/builder/section-image/auto-generate
   *
   * Auto-generate a section image using whatever context the section,
   * its parent page, the tenant business profile, and the curated
   * reference photos provide — no operator prompt required.
   *
   * Body: { pageId, sectionId, itemIndex? }
   *   - pageId / sectionId locate the target section in the tenant's
   *     pages.page_sections rows.
   *   - itemIndex optional: when the operator clicks "AI auto" on an
   *     image inside a list item (features_grid item 2, team member 3,
   *     ...), the endpoint also reads that item's title/description so
   *     the prompt reflects what the operator wrote into THAT slot,
   *     not just the section's headline.
   *
   * Returns: { url } — same shape as /image/generate so the caller
   * can drop the URL straight into the section's imageUrl / photoUrl
   * / backgroundImageUrl field.
   *
   * The endpoint composes:
   *   - Business profile (tenant settings ai_business_profile blob)
   *   - Page title + purpose
   *   - Section block_type + the operator's existing title/subtitle/
   *     description (or item.title/description when itemIndex is set)
   *   - Reference photos whose `tags[]` overlap the block_type's
   *     preferred tags (see block-tag-map.ts). Their description fields
   *     are pasted into the prompt so the image generator knows what
   *     each reference depicts.
   *   - Variant / generation mode picked from block-tag-map (hero /
   *     section / square — space / product).
   *
   * The final prompt + reference URLs go to agents' image_service via
   * /api/planner/image/generate which already handles fail-loud on
   * unfetchable references and policy prefix injection.
   */
  app.post('/ai/builder/section-image/auto-generate', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!env.INTERNAL_SERVICE_TOKEN) {
      throw new AppError('CONFIG_ERROR', 503, 'INTERNAL_SERVICE_TOKEN not configured');
    }
    const body = (request.body ?? {}) as {
      pageId?: unknown;
      sectionId?: unknown;
      itemIndex?: unknown;
    };
    const pageId = typeof body.pageId === 'string' ? body.pageId : null;
    const sectionId = typeof body.sectionId === 'string' ? body.sectionId : null;
    const itemIndex = typeof body.itemIndex === 'number' && body.itemIndex >= 0
      ? Math.floor(body.itemIndex) : null;
    if (!pageId || !sectionId) {
      throw new AppError('BAD_REQUEST', 400, 'pageId and sectionId are required');
    }

    // Tenant resolution — same policy as /image/generate. The /ai/
    // builder/* family is skipped by tenant middleware so we re-check
    // X-Tenant-Slug + cross-tenant access here.
    const headerSlug = request.headers['x-tenant-slug'] as string | undefined;
    if (!headerSlug) {
      throw new AppError('TENANT_REQUIRED', 400, 'X-Tenant-Slug header required');
    }
    const jwtSlug = request.user?.tenantSlug;
    const role = request.user?.role ?? '';
    const isSuper = role === 'super_admin';
    if (!isSuper && jwtSlug && jwtSlug !== headerSlug) {
      throw new AppError(
        'FORBIDDEN', 403,
        `Cannot auto-generate on tenant '${headerSlug}' — your session is scoped to '${jwtSlug}'`,
      );
    }
    const tenantRow = await prisma.tenant.findFirst({
      where: { slug: headerSlug, isActive: true },
      select: { id: true, slug: true },
    });
    if (!tenantRow) {
      throw new AppError('TENANT_NOT_FOUND', 404, `Tenant '${headerSlug}' not found or inactive`);
    }
    const schema = `tenant_${validateSlug(tenantRow.slug)}`;

    // ── 1. Section + page rows ──────────────────────────────────────
    type SectionRow = { id: string; page_id: string; block_type: string; props: Record<string, unknown> };
    const sectionRows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `SELECT id, page_id, block_type, props
       FROM "${schema}".page_sections
       WHERE id = $1::uuid AND page_id = $2::uuid
       LIMIT 1`,
      sectionId, pageId,
    );
    const section = sectionRows[0];
    if (!section) {
      throw new AppError('SECTION_NOT_FOUND', 404, 'Section not found on this page');
    }

    type PageRow = { id: string; title: string | null; slug: string | null };
    const pageRows = await prisma.$queryRawUnsafe<PageRow[]>(
      `SELECT id, title, slug FROM "${schema}".pages WHERE id = $1::uuid LIMIT 1`,
      pageId,
    );
    const page = pageRows[0];
    if (!page) {
      throw new AppError('PAGE_NOT_FOUND', 404, 'Page not found');
    }

    // ── 2. Business context (best-effort — empty when wizard never ran) ─
    const ctx = await loadTenantAiContext(tenantRow.slug);
    const biz = ctx.business as Record<string, unknown>;
    const businessName = String(biz.businessName ?? '');
    const industry = String(biz.industry ?? '');
    const businessDesc = String(biz.description ?? '');

    // ── 3. Section text — operator's actual copy ────────────────────
    const props = section.props ?? {};
    const sectionTitle = String((props as Record<string, unknown>).title ?? '');
    const sectionSubtitle = String((props as Record<string, unknown>).subtitle ?? '');
    const sectionDesc = String((props as Record<string, unknown>).description ?? '');
    let itemTitle = '';
    let itemDesc = '';
    if (itemIndex !== null) {
      const items = (props as Record<string, unknown>).items;
      if (Array.isArray(items) && items[itemIndex] && typeof items[itemIndex] === 'object') {
        const it = items[itemIndex] as Record<string, unknown>;
        itemTitle = String(it.title ?? it.name ?? '');
        itemDesc = String(it.description ?? it.role ?? '');
      }
    }

    // ── 4. block_type → tag preferences, variant, mode ─────────────
    const profile = profileFor(section.block_type);
    const generationMode = modeFor(section.block_type);

    // ── 5. Matching reference photos ────────────────────────────────
    type RefRow = { id: string; url: string; description: string | null; tag: string | null; tags: string[] | null };
    let refRows: RefRow[] = [];
    if (profile.tags.length > 0) {
      refRows = await prisma.$queryRawUnsafe<RefRow[]>(
        `SELECT id, url, description, tag, tags
         FROM "${schema}".files
         WHERE kind = 'reference'
           AND COALESCE(tags, CASE WHEN tag IS NOT NULL THEN ARRAY[tag] ELSE ARRAY[]::TEXT[] END) && $1::text[]
         ORDER BY created_at DESC
         LIMIT 5`,
        profile.tags,
      );
    }
    const referenceUrls = refRows.map((r) => r.url);

    // ── 6. Compose the prompt ───────────────────────────────────────
    // Strategy: lead with the business profile so the model anchors on
    // the brand, then the section's actual copy as the semantic core,
    // then each reference's caption so the model knows what physical
    // subject each attached image depicts. image_service.py already
    // prepends NO_TEXT_RULE + mode policy on top of whatever we send.
    const lines: string[] = [];
    if (businessName) {
      const indPart = industry ? ` (${industry})` : '';
      lines.push(`Business: ${businessName}${indPart}.`);
    }
    if (businessDesc) lines.push(`About the business: ${businessDesc}`);
    if (page.title) lines.push(`Page: "${page.title}".`);

    const blockLabel = section.block_type.replace(/_/g, ' ');
    lines.push(`Section: ${blockLabel}.`);
    if (sectionTitle)    lines.push(`Section title: "${sectionTitle}".`);
    if (sectionSubtitle) lines.push(`Section subtitle: "${sectionSubtitle}".`);
    if (sectionDesc)     lines.push(`Section description: ${sectionDesc}`);
    if (itemTitle)       lines.push(`Specific item title: "${itemTitle}".`);
    if (itemDesc)        lines.push(`Specific item detail: ${itemDesc}`);

    if (refRows.length > 0) {
      lines.push('');
      lines.push(`Attached ${refRows.length} reference photo(s) showing the real subject:`);
      for (const r of refRows) {
        const caption = (r.description ?? '').trim();
        const tagLine = Array.isArray(r.tags) && r.tags.length > 0
          ? `[${r.tags.join(', ')}]`
          : (r.tag ? `[${r.tag}]` : '');
        if (caption) lines.push(`  - ${tagLine} ${caption}`.trim());
      }
      lines.push('');
      lines.push('Generate an image that matches the references in subject + setting while fitting the section copy above.');
    } else {
      lines.push('');
      lines.push('No reference photos available — generate a clean, brand-appropriate image based on the section context above.');
    }

    const finalPrompt = lines.join('\n');

    // ── 7. Forward to agents image_service ──────────────────────────
    const upstream = `${env.AGENTS_BASE_URL.replace(/\/$/, '')}/api/planner/image/generate`;
    const enrichedBody = {
      prompt: finalPrompt,
      variant: profile.variant,
      referenceUrls,
      mode: generationMode,
      tenantSlug: tenantRow.slug,
      tenantId: tenantRow.id,
    };
    let response: Response;
    try {
      response = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(enrichedBody),
      });
    } catch (err) {
      throw new AppError(
        'AGENTS_UNREACHABLE', 503,
        `Agents service unreachable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const text = await response.text();
    if (!response.ok) {
      let detail = `agents responded ${response.status}`;
      try {
        const j = JSON.parse(text) as { detail?: unknown };
        if (j.detail) detail = String(j.detail);
      } catch { /* not JSON */ }
      throw new AppError('AGENTS_ERROR', response.status, detail);
    }

    return reply
      .code(200)
      .header('content-type', 'application/json; charset=utf-8')
      .send(text);
  });
}
