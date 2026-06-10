/**
 * Migration Agent — AI orchestrates the entire migration.
 *
 * User mandate (2026-06-04): "AI 분석이 먼저다. 크롤러는 도구가 되어야 한다."
 * The previous design (crawler-first → LLM cleans up) silently failed when
 * the crawler returned an empty result, because nothing was driving the
 * decision of WHAT to fetch and WHEN to give up. This rewrite flips it:
 *
 *   1. Gemini receives the source URL + the goal (church-site migration)
 *   2. Gemini chooses tools to investigate (fetch_url, fetch_sitemap,
 *      try_wp_rest, try_youtube_channel) and emits function calls
 *   3. We execute each function call, return the result to Gemini
 *   4. Loop until Gemini returns a final ClassifiedData JSON or hits the
 *      iteration cap
 *
 * The agent decides everything: which strategy to start with (sitemap?
 * REST? homepage scrape?), when one path has failed and to switch to
 * another, when to stop. This matches the AI Builder pattern (agents
 * service in apps/agents) — multi-step LLM loop with tools — except
 * inlined into the Fastify server because the agents service isn't yet
 * deployed for True Light.
 */

import { env } from '../../config/env.js';
import type { ClassifiedData } from './types.js';
import { emptyClassifiedData } from './types.js';
import { renderHtml } from './extractors/browser-render.js';

// Migration runs on Claude (Anthropic Messages API) — Gemini was unreliable at
// analyzing a site and structuring it into ClassifiedData (same input gave 7
// pages one run, empty {} the next). Migration is a one-time setup step, so the
// strongest practical agentic model is worth it.
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16384;
const MAX_ITERATIONS = 20;        // hard cap on agent loop
const FETCH_TIMEOUT_MS = 25_000;
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
// Cloudflare Worker proxy endpoint — when SAAS_PROXY_SECRET is set,
// outbound fetches go through here instead of direct. Cloudflare's
// IPs are essentially never blocked by the SiteGround / Sucuri /
// Cloudflare-fronted WordPress installs that block Railway's AWS IPs.
const PROXY_ENDPOINT = 'https://api.truelight.app/__migration_proxy';

/**
 * Fetch through the Cloudflare Worker proxy when configured, else
 * direct. Returns the response object — caller reads .text() / .json().
 */
async function proxiedFetch(targetUrl: string, init: RequestInit & { signal?: AbortSignal } = {}): Promise<Response> {
  const secret = env.SAAS_PROXY_SECRET;
  if (!secret) {
    // No proxy configured — direct fetch with browser headers.
    return await fetch(targetUrl, {
      ...init,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        ...(init.headers ?? {}),
      },
    });
  }
  const proxyUrl = `${PROXY_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`;
  return await fetch(proxyUrl, {
    ...init,
    headers: { 'X-Tenant-Verify': secret, ...(init.headers ?? {}) },
  });
}

interface AgentResult {
  data: ClassifiedData;
  iterations: number;
  toolCalls: { name: string; args: Record<string, unknown>; ok: boolean }[];
  warnings: string[];
}

// Claude Messages API content blocks + message shape.
type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };
type Msg = { role: 'user' | 'assistant'; content: Block[] };

/**
 * Run the migration agent. Returns a populated ClassifiedData based on
 * whatever the agent could extract, plus per-tool diagnostics so the
 * dialog can show "agent ran 12 tool calls, 3 failed".
 */
export type MigrationFocus = 'all' | 'static' | { content: string };

export async function runMigrationAgent(
  sourceUrl: string,
  youtubeChannelUrl: string | null,
  onProgress?: (msg: string) => void,
  focus: MigrationFocus = 'all',
): Promise<AgentResult> {
  const data = emptyClassifiedData();
  const toolCalls: AgentResult['toolCalls'] = [];
  const warnings: string[] = [];

  if (!env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY 미설정 — agent 비활성');
    return { data, iterations: 0, toolCalls, warnings };
  }

  // Focus narrows the agent's task — a smaller, well-scoped extraction is far
  // more reliable than the all-in-one crawl. 'static' = page layouts only;
  // {content} = one content type only (per-module migration).
  const focusDirective =
    focus === 'static'
      ? `\nSCOPE — SITE STRUCTURE (analyze the sitemap; no individual posts): Reproduce the FULL sitemap. First call fetch_sitemap and read the nav. ANALYZE EVERY navigation page and CLASSIFY it from its menu label AND its page content, then emit a pageContents entry for it:
  • Static page (인사말/소개/비전/오시는 길/예배안내/새가족/사명 등) → emit its real blocks in order (hero_banner first, then text_image / image_gallery).
  • DYNAMIC content list page (설교/주보/칼럼/앨범·갤러리/행사·공지/교역자/게시판/연혁) → RESERVE the page with ONE matching data block (see the data-block list below) using the canonical pageSlug. Do NOT open or copy the individual posts — leave the sermons/bulletins/columns/events/albums/staff/history/boards ITEM arrays EMPTY (those migrate per-module later).
Also emit a menus[] entry for EVERY page (same pageSlug, preserving the source nav hierarchy via parentLabel + order via sortOrder). The migrated nav + pages MUST MIRROR the source sitemap — judge each page yourself, do not skip dynamic sections.\nEach fetch_url result has a "backgroundImages" array (hero/section background photos pulled from the page's CSS) — set the hero_banner's backgroundImageUrl to backgroundImages[0] when present, and use "images" for inline content/gallery pictures.`
      : typeof focus === 'object'
        ? `\nSCOPE — "${focus.content}" CONTENT ONLY: Extract ONLY the "${focus.content}" items. Find that section's list page and its WordPress REST endpoint (/wp-json/wp/v2/...), page through ALL items, and capture each item's fields + images. Leave pageContents and every OTHER content type as EMPTY. Do not waste turns on unrelated pages.`
        : '';

  // Conversation history (Claude Messages API format).
  const messages: Msg[] = [{
    role: 'user',
    content: [{
      type: 'text',
      text: `You are a Korean-church website migration agent. Source: ${sourceUrl}${youtubeChannelUrl ? `, YouTube channel: ${youtubeChannelUrl}` : ''}.

GOAL: investigate the source and call commit_result with a populated
ClassifiedData JSON.${focusDirective}

CRITICAL RULES — follow these or migration fails:

1. NEVER commit_result with empty arrays unless you have EXHAUSTED all
   fetch strategies. Empty result = failure.

2. ALWAYS try multiple strategies before giving up. If fetch_url returns
   small text (textLength < 500), HTTP 202/403/429, or 'no body', the
   site is fronted by a CDN/anti-bot AND you MUST try:
     (a) try_wp_rest with endpoint '/wp-json/wp/v2/posts?per_page=50'
     (b) try_wp_rest with endpoint '/wp-json/wp/v2/pages?per_page=50'
     (c) try_wp_rest with endpoint '/wp-json/wp/v2/media?per_page=30'
     (d) try_wp_rest with endpoint '/wp-json/wp/v2/categories'
   WP REST often works even when the front-end HTML is blocked.

3. ALWAYS try fetch_sitemap early. If it returns URLs, fetch_url several
   that look like content pages (greeting/, vision/, jubo/, etc.).

4. Use AT LEAST 8 tool calls before commit_result, unless you've
   definitively gathered all content.

ClassifiedData EXACT field shape (use these field names — NOT pastorGreeting,
NOT boardPosts):
{
  "churchInfo": { "name": "", "address": "", "phone": "", "email": "",
    "description": "", "seoTitle": "", "seoDescription": "", "seoKeywords": "",
    "ogImageUrl": "", "logoUrl": "", "locale": "", "slogan": "" },
  "sermons": [{ "title": "", "scripture": "", "preacher": "", "date": "",
    "youtubeUrl": "", "thumbnailUrl": "" }],
  "bulletins": [{ "title": "", "date": "", "pdfUrl": "", "images": [] }],
  "columns": [{ "title": "", "content": "", "topImageUrl": "",
    "youtubeUrl": "", "date": "", "sourceUrl": "" }],
  "events": [{ "title": "", "description": "", "date": "",
    "location": "", "imageUrl": "" }],
  "albums": [{ "title": "", "images": [], "youtubeUrl": "" }],
  "staff": [{ "name": "", "role": "", "department": "", "photoUrl": "",
    "bio": "" }],
  "history": [{ "year": 0, "month": "", "title": "", "description": "" }],
  "worshipTimes": [{ "name": "", "day": "", "time": "", "location": "" }],
  "menus": [{ "label": "", "pageSlug": "", "parentLabel": null,
    "sortOrder": 0 }],
  "pageContents": [{
    // Use the EXACT canonical slug for a known section so it maps to the right
    // content module; for any other page use a short kebab slug from its label.
    "pageSlug":
      "home" | "welcome" | "vision" | "directions" | "worship" | "newcomer" | "mission"   // static
      | "sermons" | "bulletins" | "columns" | "albums" | "events" | "staff" | "history" | "board"  // dynamic
      | "<kebab-from-label>",
    "blocks": [{
      "blockType":
        "hero_banner" | "pastor_message" | "church_intro" | "mission_vision"
        | "location_map" | "contact_info" | "newcomer_info" | "text_image" | "image_gallery"  // static
        | "recent_sermons" | "recent_bulletins" | "recent_columns" | "album_gallery"
        | "event_grid" | "staff_grid" | "history_timeline" | "board",                          // data blocks
      "props": { ... block-specific ... }
    }]
  }],
  "images": ["url1", "url2"]
}

REPRODUCE THE PAGE LAYOUT AS ORDERED BLOCKS — don't flatten a page into one
text dump. For each page, walk the page top-to-bottom and emit blocks IN ORDER:
  1. FIRST block is ALWAYS a hero_banner built from the page's top banner /
     header section (its big heading = title, the small line under it =
     subtitle, the banner background photo = backgroundImageUrl).
  2. Then one block per visible section. A heading + paragraph + a side image
     (e.g. "Explore the Bible" logo + description) → a text_image block with
     that section's title, content, imageUrl, and layout alternating
     "left"/"right" down the page. A heading + paragraph with NO image →
     text_image with imageUrl "". A grid/row of images → image_gallery.
  3. Keep the source's sub-headings and scripture lines inside content
     (preserve line breaks with \n). Capture EVERY <img> src you see on the
     page into the relevant block's imageUrl / images and also into "images".

Static block templates (use exact keys):
  hero_banner    → { title, subtitle, backgroundImageUrl, buttonText, buttonUrl }
  pastor_message → { title, pastorName, message, imageUrl }
  church_intro   → { title, content, imageUrl }
  mission_vision → { title, content, imageUrl }
  location_map   → { title, address }
  contact_info   → { title, phone, email, address }
  newcomer_info  → { title, content, imageUrl }
  text_image     → { title, subtitle, content, imageUrl, layout }
  image_gallery  → { title, images }

PAGE CLASSIFICATION — judge each nav page by its LABEL + content, pick the page
type, and reserve DYNAMIC pages with a single data block { title } (no items):
  설교 / sermon / message / 말씀      → pageSlug "sermons",   block recent_sermons
  주보 / jubo / bulletin              → pageSlug "bulletins", block recent_bulletins
  칼럼 / 묵상 / column / devotion      → pageSlug "columns",   block recent_columns
  앨범 / 갤러리 / 사진 / gallery / photo → pageSlug "albums",    block album_gallery
  행사 / 공지 / 소식 / event / news     → pageSlug "events",    block event_grid
  교역자 / 섬기는 / 사역자 / staff       → pageSlug "staff",     block staff_grid
  연혁 / history / 발자취              → pageSlug "history",    block history_timeline
  게시판 / board / 자유게시판           → pageSlug "board",     block board
Static pages: 인사말/환영/greeting → "welcome" (pastor_message), 비전/사명/vision →
  "vision" (mission_vision), 교회소개/about → church_intro, 오시는 길/contact →
  "directions" (location_map + contact_info), 예배안내/worship → "worship"
  (worship_times + the worshipTimes list), 새가족/newcomer → "newcomer".

You have at most ${MAX_ITERATIONS} tool calls. Use them. Don't give up early.`,
    }],
  }];

  // ── Tool implementations (executed when Gemini emits functionCall) ──
  async function execTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    onProgress?.(`tool:${name}(${JSON.stringify(args).slice(0, 80)})`);
    if (name === 'fetch_url') {
      const url = String(args.url ?? '');
      if (!url) return { error: 'url required' };
      const result = await fetchUrl(url);
      onProgress?.(`result:fetch_url status=${result.status} textLen=${result.textLength} linkCount=${Array.isArray(result.links) ? result.links.length : 0}`);
      return result;
    }
    if (name === 'fetch_sitemap') {
      const baseUrl = String(args.baseUrl ?? sourceUrl);
      const result = await fetchSitemap(baseUrl);
      onProgress?.(`result:fetch_sitemap count=${result.count ?? 0} err=${result.error ?? 'none'}`);
      return result;
    }
    if (name === 'try_wp_rest') {
      const baseUrl = String(args.baseUrl ?? sourceUrl);
      const endpoint = String(args.endpoint ?? '/wp-json/wp/v2/posts');
      const result = await tryWpRest(baseUrl, endpoint);
      onProgress?.(`result:try_wp_rest endpoint=${endpoint} status=${result.status ?? 'fail'} total=${result.total ?? 0}`);
      return result;
    }
    if (name === 'try_youtube_channel') {
      const channelUrl = String(args.channelUrl ?? youtubeChannelUrl ?? '');
      if (!channelUrl) return { error: 'no channel url' };
      return await tryYoutubeChannel(channelUrl);
    }
    if (name === 'commit_result') {
      const payload = args.classifiedData as Record<string, unknown>;
      // Count incoming items so we can see whether Gemini built a real
      // payload or just empty arrays (the silent-failure path).
      const itemCount = countIncoming(payload);
      onProgress?.(`commit_result.payload itemCount=${itemCount} keys=${Object.keys(payload ?? {}).join(',')}`);
      if (itemCount === 0) {
        // REJECT empty commits — don't let Gemini "give up" with empty arrays.
        // The functionResponse below feeds this message back so it retries.
        return {
          ok: false,
          rejected: true,
          itemCountInPayload: 0,
          error: 'REJECTED: classifiedData was empty. You already fetched real pages — their text is in this conversation. Build a real payload now: for each content page add a pageContents entry (hero_banner first using the page heading + banner image, then text_image blocks per section with their heading/body/image), plus churchInfo (name/address/phone/email), worshipTimes, menus, and every sermon/column/event/staff/album/bulletin you saw. Then call commit_result again. Do NOT submit empty arrays.',
        };
      }
      mergeAgentResult(data, payload);
      return { ok: true, committed: countTotals(data), itemCountInPayload: itemCount };
    }
    return { error: `unknown tool: ${name}` };
  }

  // Append a user-side text block. Claude requires alternating roles AND that
  // a turn with tool_use is answered by a turn whose content carries the
  // matching tool_result. So if the last message is already a user turn (it
  // holds this round's tool_results), we ADD the nudge text to it rather than
  // push a second consecutive user message (which the API rejects).
  const pushUserText = (text: string): void => {
    const last = messages[messages.length - 1];
    if (last && last.role === 'user') {
      last.content.push({ type: 'text', text });
    } else {
      messages.push({ role: 'user', content: [{ type: 'text', text }] });
    }
  };

  // ── The agent loop ──
  let iterations = 0;
  let committed = false;
  // Claude can return a text-only turn (no tool_use) before it has committed.
  // Rather than discard everything gathered so far, nudge it to commit. Capped
  // so a model that refuses can't spin the loop forever.
  let forcedCommitNudges = 0;
  const MAX_FORCED_COMMIT_NUDGES = 2;
  while (iterations < MAX_ITERATIONS && !committed) {
    iterations++;
    const response = await callClaude(messages);
    if (!response) {
      warnings.push(`Claude call ${iterations} failed`);
      break;
    }

    // Append the assistant turn so the next call has context.
    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(
      (b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use',
    );

    if (toolUses.length > 0) {
      // Execute each tool_use and return ALL results in ONE user message
      // (Claude requires every tool_use to be answered in the next turn).
      const toolResults: Block[] = [];
      for (const tu of toolUses) {
        try {
          const result = await execTool(tu.name, tu.input);
          toolCalls.push({ name: tu.name, args: tu.input, ok: !('error' in result) });
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
          // Only a NON-empty commit counts. An empty commit is rejected
          // (result.rejected) and fed back so Claude retries.
          if (tu.name === 'commit_result' && !('rejected' in result)) committed = true;
        } catch (err) {
          toolCalls.push({ name: tu.name, args: tu.input, ok: false });
          warnings.push(`tool ${tu.name} threw: ${err instanceof Error ? err.message : String(err)}`);
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: String(err) }) });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    } else {
      // No tool_use — Claude may have answered with the JSON as text.
      const text = response.content
        .filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      let parsedText = false;
      if (text) {
        const parsed = parseAgentJson(text);
        if (parsed && countIncoming(parsed) > 0) {
          mergeAgentResult(data, parsed);
          committed = true;
          parsedText = true;
        } else {
          warnings.push(`agent ended without commit; final text: ${text.slice(0, 200)}`);
        }
      }
      if (!committed && !parsedText && forcedCommitNudges < MAX_FORCED_COMMIT_NUDGES) {
        forcedCommitNudges++;
        pushUserText(`STOP investigating. You have already fetched the source pages — their full text is in this conversation above. Call commit_result NOW with a populated ClassifiedData built from what you gathered: map page bodies into pageContents (담임목사 인사말 → pastor_message, 교회 소개/비전 → church_intro/mission_vision, 오시는 길 → location_map, 연락처 → contact_info), worshipTimes from any 예배 시간표, churchInfo (name/address/phone), and menus from the nav links. Use empty arrays ONLY for content types that genuinely do not exist on this site. Use the commit_result tool.`);
        continue;
      }
      break;
    }
  }

  // Final guarantee when the loop ended without a populated commit (it
  // exhausted iterations mid-crawl, or kept committing empty). Hand the model
  // an explicit checklist of the pages it fetched, then accept EITHER a
  // populated commit_result tool call OR a text reply containing the JSON
  // (parseAgentJson). Empty payloads are rejected and retried.
  if (!committed) {
    const fetchedUrls = [...new Set(
      toolCalls
        .filter((t) => t.name === 'fetch_url')
        .map((t) => String((t.args as { url?: string }).url ?? ''))
        .filter(Boolean),
    )];
    const checklist = fetchedUrls.slice(0, 25).map((u, i) => `${i + 1}. ${u}`).join('\n');
    for (let attempt = 0; attempt < 3 && !committed; attempt++) {
      pushUserText(`STOP fetching. Build the result NOW. You already fetched these pages (their text is above in this conversation):
${checklist || '(see the fetched page text above)'}

Emit a commit_result whose classifiedData is POPULATED — an empty object is a failure. For EACH content page add a pageContents entry whose blocks reproduce the layout in order: a hero_banner first (page heading → title, the small line under it → subtitle, the banner background photo → backgroundImageUrl), then one text_image per section (heading → title, body → content, side image → imageUrl, alternating layout left/right), and image_gallery for image grids. Also fill churchInfo (name/address/phone/email), worshipTimes, menus, and every sermon/column/event/staff/album/bulletin you saw.`);
      const response = await callClaude(messages);
      if (!response) break;
      messages.push({ role: 'assistant', content: response.content });
      const toolUses = response.content.filter(
        (b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use',
      );
      if (toolUses.length > 0) {
        const toolResults: Block[] = [];
        for (const tu of toolUses) {
          try {
            const result = await execTool(tu.name, tu.input) as { itemCountInPayload?: number; error?: string };
            toolCalls.push({ name: tu.name, args: tu.input, ok: !('error' in result) });
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
            if (tu.name === 'commit_result' && (result.itemCountInPayload ?? 0) > 0) committed = true;
          } catch (err) {
            toolCalls.push({ name: tu.name, args: tu.input, ok: false });
            warnings.push(`forced commit_result threw: ${err instanceof Error ? err.message : String(err)}`);
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: String(err) }) });
          }
        }
        messages.push({ role: 'user', content: toolResults });
      } else {
        const text = response.content
          .filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        const parsed = parseAgentJson(text);
        if (parsed && countIncoming(parsed) > 0) {
          mergeAgentResult(data, parsed);
          committed = true;
        }
      }
      onProgress?.(`result:final_commit attempt=${attempt + 1} items=${countTotals(data)} committed=${committed}`);
    }
  }

  if (!committed) {
    warnings.push(`agent stopped after ${iterations} iterations without commit_result`);
  }
  return { data, iterations, toolCalls, warnings };
}

// ────────────────────────────────────────────────────────────
// Tool implementations (independent of agent loop, reusable).
// Each returns a small JSON-ish object that Gemini can read on
// the next turn. Truncation is aggressive — Gemini doesn't need
// the full HTML, just enough to decide what to do next.
// ────────────────────────────────────────────────────────────

async function fetchUrl(url: string): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // Render in a REAL headless browser first — passes JS-challenge WAFs that
    // block the bare fetch/proxy below. Falls back to proxiedFetch if chromium
    // is unavailable or the render fails.
    let html: string;
    let status = 200;
    let headers: Record<string, string> = {};
    const rendered = await renderHtml(url, FETCH_TIMEOUT_MS);
    if (rendered) {
      html = rendered;
    } else {
      const res = await proxiedFetch(url, { redirect: 'follow', signal: ctrl.signal });
      html = await res.text();
      status = res.status;
      headers = Object.fromEntries(res.headers.entries());
    }
    // Extract a digest that's small enough to pass back to Gemini.
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = (titleMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] ?? html;
    const text = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
    const links: { text: string; href: string }[] = [];
    const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(bodyHtml)) !== null && links.length < 100) {
      const href = m[1] ?? '';
      const linkText = (m[2] ?? '').replace(/<[^>]+>/g, '').trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push({ text: linkText, href: resolveUrl(url, href) });
      }
    }
    // Comprehensive, GENERIC image discovery so the agent can SEE every image
    // on the page and decide where each belongs (hero background vs content vs
    // gallery) — NOT a hardcoded per-theme rule. Source sites are usually
    // Elementor/WordPress where real images hide in srcset, lazy-load
    // data-attributes, CSS background-image, and Elementor data-settings JSON
    // — `<img src>` alone misses hero backgrounds and gallery photos.
    const imageSet = new Set<string>();
    const bgSet = new Set<string>(); // likely hero/section backgrounds
    const norm = (raw: string) => raw.trim().replace(/&amp;/g, '&').replace(/\\\//g, '/');
    const ok = (u: string) => u && !u.startsWith('data:') && !/\.svg(\?|$)/i.test(u);
    const addImg = (raw: string | undefined) => { if (raw && ok(norm(raw))) imageSet.add(resolveUrl(url, norm(raw))); };
    const addBg = (raw: string | undefined) => {
      if (raw && ok(norm(raw))) { const r = resolveUrl(url, norm(raw)); bgSet.add(r); imageSet.add(r); }
    };
    // 1. src + lazy-load variants
    const attrRe = /(?:\bsrc|data-src|data-lazy-src|data-large_image|data-bg|data-background|data-thumb)\s*=\s*["']([^"']+)["']/gi;
    while ((m = attrRe.exec(html)) !== null) addImg(m[1]);
    // 2. srcset — each candidate URL (drop the descriptor)
    const srcsetRe = /srcset\s*=\s*["']([^"']+)["']/gi;
    while ((m = srcsetRe.exec(html)) !== null) {
      for (const cand of (m[1] ?? '').split(',')) addImg(cand.trim().split(/\s+/)[0]);
    }
    // 3. CSS background-image: url(...) in inline styles → background candidates
    const bgRe = /background(?:-image)?\s*:\s*[^;"']*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
    while ((m = bgRe.exec(html)) !== null) addBg(m[1]);
    // 4. Catch-all: any image-extension URL anywhere in the markup. Picks up
    //    Elementor data-settings JSON ("url":"...jpg"), generated CSS refs, etc.
    const anyImgRe = /https?:\/\/[^\s"'()<>\\]+\.(?:jpe?g|png|webp|gif)/gi;
    while ((m = anyImgRe.exec(html)) !== null) addImg(m[0]);
    // 5. Elementor/theme generate per-page CSS where section & hero
    //    background-image lives (not in the HTML). Fetch those stylesheets and
    //    extract their backgrounds — generic, works for any Elementor site.
    const cssLinks: string[] = [];
    const linkRe2 = /<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi;
    while ((m = linkRe2.exec(html)) !== null) {
      const href = m[1] ?? '';
      if (/elementor\/css\/post-|elementor\/css\/global|\/uploads\/.*\.css/i.test(href)) {
        cssLinks.push(resolveUrl(url, href));
      }
    }
    for (const cssUrl of cssLinks.slice(0, 4)) {
      try {
        const cssRes = await proxiedFetch(cssUrl, { signal: ctrl.signal });
        if (!cssRes.ok) continue;
        const css = await cssRes.text();
        let cm: RegExpExecArray | null;
        const cssBgRe = /background(?:-image)?\s*:\s*[^;}]*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
        while ((cm = cssBgRe.exec(css)) !== null) addBg(cm[1]);
      } catch { /* skip css */ }
    }
    const images = [...imageSet];
    return {
      url,
      status,
      contentType: headers['content-type'] ?? '',
      title,
      textLength: text.length,
      text,
      links: links.slice(0, 50),
      images: images.slice(0, 40),
      backgroundImages: [...bgSet].slice(0, 15),
      isWordPress: /wp-content|wp-json|wp-includes/.test(html),
    };
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSitemap(baseUrl: string): Promise<Record<string, unknown>> {
  const candidates = [
    `${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
    `${baseUrl.replace(/\/$/, '')}/sitemap_index.xml`,
    `${baseUrl.replace(/\/$/, '')}/wp-sitemap.xml`,
  ];
  for (const url of candidates) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await proxiedFetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const xml = await res.text();
      const urls: string[] = [];
      const re = /<loc>([^<]+)<\/loc>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null && urls.length < 200) {
        urls.push(m[1] ?? '');
      }
      if (urls.length > 0) {
        return { sitemap: url, count: urls.length, urls };
      }
    } catch {
      /* try next */
    }
  }
  return { error: 'no sitemap found' };
}

async function tryWpRest(baseUrl: string, endpoint: string): Promise<Record<string, unknown>> {
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const res = await proxiedFetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { url, status: res.status, error: `HTTP ${res.status}` };
    const json = await res.json();
    const items = Array.isArray(json) ? json : [];
    // Trim each item to the fields Gemini needs to decide what to extract.
    const summarised = items.slice(0, 30).map((it: Record<string, unknown>) => ({
      id: it.id,
      type: it.type,
      slug: it.slug,
      link: it.link,
      date: it.date,
      title: ((it.title as Record<string, string>)?.rendered ?? '').replace(/<[^>]+>/g, '').slice(0, 200),
      excerpt: ((it.excerpt as Record<string, string>)?.rendered ?? '').replace(/<[^>]+>/g, '').slice(0, 300),
      categories: it.categories,
      tags: it.tags,
      featured_media: it.featured_media,
    }));
    return { url, status: res.status, total: items.length, items: summarised };
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tryYoutubeChannel(channelUrl: string): Promise<Record<string, unknown>> {
  // Best-effort fetch of the channel page — Gemini decides what to do
  // with the result. (Full implementation lives in extractors/youtube.ts
  // and gets invoked from /migrate-url separately when the operator
  // entered a channel URL; this tool is the agent-callable variant.)
  return await fetchUrl(channelUrl);
}

// ────────────────────────────────────────────────────────────
// Claude (Anthropic Messages API) call with tool use enabled.
// ────────────────────────────────────────────────────────────

const CLAUDE_TOOLS = [
  {
    name: 'fetch_url',
    description: 'Fetch a single web page. Returns title, plain text (truncated to ~6000 chars), links, image URLs, and a WordPress hint.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Absolute URL to fetch' } },
      required: ['url'],
    },
  },
  {
    name: 'fetch_sitemap',
    description: 'Try /sitemap.xml, /sitemap_index.xml, /wp-sitemap.xml at the given base URL. Returns up to 200 page URLs.',
    input_schema: {
      type: 'object',
      properties: { baseUrl: { type: 'string' } },
      required: ['baseUrl'],
    },
  },
  {
    name: 'try_wp_rest',
    description: 'Try a WordPress REST API endpoint, e.g. /wp-json/wp/v2/posts or /wp-json/wp/v2/pages. Returns up to 30 summarised items.',
    input_schema: {
      type: 'object',
      properties: { baseUrl: { type: 'string' }, endpoint: { type: 'string' } },
      required: ['baseUrl', 'endpoint'],
    },
  },
  {
    name: 'try_youtube_channel',
    description: 'Fetch a YouTube channel page (for sermon video metadata).',
    input_schema: {
      type: 'object',
      properties: { channelUrl: { type: 'string' } },
      required: ['channelUrl'],
    },
  },
  {
    name: 'commit_result',
    description: 'When you have gathered enough material, call this with the final ClassifiedData JSON. This ends the agent loop.',
    input_schema: {
      type: 'object',
      properties: {
        classifiedData: {
          type: 'object',
          description: 'Final structured migration result (ClassifiedData shape — see the instructions in the first message).',
        },
      },
      required: ['classifiedData'],
    },
  },
];

const CLAUDE_SYSTEM =
  'You are a website-migration agent for Korean church sites. Use the provided ' +
  'tools to investigate the source site, then call commit_result with a fully ' +
  'populated ClassifiedData object. Prefer tool calls over prose.';

async function callClaude(messages: Msg[]): Promise<{ content: Block[] } | null> {
  try {
    const res = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        system: CLAUDE_SYSTEM,
        tools: CLAUDE_TOOLS,
        messages,
      }),
    });
    if (!res.ok) {
      console.log(`[agent] Claude HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    const content = (data.content ?? []) as Block[];
    return { content };
  } catch (err) {
    console.log(`[agent] Claude exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Merge / helpers.
// ────────────────────────────────────────────────────────────

function mergeAgentResult(data: ClassifiedData, payload: Record<string, unknown> | undefined): void {
  if (!payload || typeof payload !== 'object') return;
  // Pass through all top-level fields. Whatever Gemini emits as
  // ClassifiedData, copy keys that exist on the empty template.
  for (const key of Object.keys(emptyClassifiedData()) as Array<keyof ClassifiedData>) {
    const incoming = (payload as Record<string, unknown>)[key];
    if (incoming == null) continue;
    if (Array.isArray(incoming)) {
      const arr = (data as unknown as Record<string, unknown[]>)[key];
      if (Array.isArray(arr)) arr.push(...incoming);
    } else if (typeof incoming === 'object') {
      // churchInfo — merge fields
      const target = (data as unknown as Record<string, Record<string, unknown>>)[key];
      if (target && typeof target === 'object') {
        for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
          if (v && !target[k]) target[k] = v;
        }
      }
    }
  }
}

function countTotals(data: ClassifiedData): number {
  return data.sermons.length + data.bulletins.length + data.columns.length
    + data.events.length + data.albums.length + data.staff.length
    + data.history.length + data.worshipTimes.length + data.pageContents.length
    + data.boards.reduce((s, b) => s + b.posts.length, 0);
}

/** Sum of array lengths across whatever payload Gemini sent. Used to
 *  detect 'agent gave up with empty arrays' as opposed to 'agent
 *  extracted real data'. */
function countIncoming(payload: Record<string, unknown> | undefined): number {
  if (!payload) return 0;
  let count = 0;
  for (const v of Object.values(payload)) {
    if (Array.isArray(v)) count += v.length;
  }
  return count;
}

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

// Gemini sometimes returns the ClassifiedData as text instead of a
// commit_result function call — wrapped in a ```json fence, occasionally with
// leading prose ("Here is the data:"). Parse defensively: try the fence-strip
// first, then fall back to the widest {…} substring. Returns null if neither
// yields valid JSON (e.g. truncated output).
function parseAgentJson(text: string): Record<string, unknown> | null {
  const candidates: string[] = [];
  const fenced = stripJsonFence(text);
  candidates.push(fenced);
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function resolveUrl(base: string, relative: string): string {
  try { return new URL(relative, base).href; } catch { return relative; }
}
