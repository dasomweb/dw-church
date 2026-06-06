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

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';
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

/**
 * Run the migration agent. Returns a populated ClassifiedData based on
 * whatever the agent could extract, plus per-tool diagnostics so the
 * dialog can show "agent ran 12 tool calls, 3 failed".
 */
export async function runMigrationAgent(
  sourceUrl: string,
  youtubeChannelUrl: string | null,
  onProgress?: (msg: string) => void,
): Promise<AgentResult> {
  const data = emptyClassifiedData();
  const toolCalls: AgentResult['toolCalls'] = [];
  const warnings: string[] = [];

  if (!env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY 미설정 — agent 비활성');
    return { data, iterations: 0, toolCalls, warnings };
  }

  // Conversation history (Gemini "contents" format).
  type Content = { role: 'user' | 'model' | 'function'; parts: Part[] };
  type Part =
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } };

  const history: Content[] = [{
    role: 'user',
    parts: [{
      text: `You are a Korean-church website migration agent. Source: ${sourceUrl}${youtubeChannelUrl ? `, YouTube channel: ${youtubeChannelUrl}` : ''}.

GOAL: investigate the source and call commit_result with a populated
ClassifiedData JSON.

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
    "youtubeUrl": "", "date": "" }],
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
    "pageSlug": "pastor-greeting" | "about" | "vision" | "directions" |
      "newcomer" | "mission" | "worship" | "history" | "home",
    "blocks": [{
      "blockType": "hero_banner" | "pastor_message" | "church_intro" |
        "mission_vision" | "location_map" | "contact_info" |
        "newcomer_info" | "text_image" | "image_gallery",
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

Page-content blockType templates (use exact keys):
  hero_banner    → { title, subtitle, backgroundImageUrl, buttonText, buttonUrl }
  pastor_message → { title, name, message, photoUrl }
  church_intro   → { title, content, imageUrl }
  mission_vision → { title, content, imageUrl }
  location_map   → { title, address }
  contact_info   → { title, phone, email, address }
  newcomer_info  → { title, content, imageUrl }
  text_image     → { title, subtitle, content, imageUrl, layout }
  image_gallery  → { title, images }

Korean content type cues for classifying WP posts:
  설교/sermon, 주보/jubo/bulletin, 칼럼/column, 행사/공지/notice → events,
  교역자/staff, 인사말/greeting → pastor_greeting page, 비전/vision page,
  예배/worship → worshipTimes, 연혁/history.

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

  // ── The agent loop ──
  let iterations = 0;
  let committed = false;
  // Gemini sometimes returns an empty turn (no functionCall, no text) before
  // it has committed — especially after a long crawl. Rather than give up and
  // discard everything gathered so far, nudge it to commit. Capped so a model
  // that refuses can't spin the loop forever.
  let forcedCommitNudges = 0;
  const MAX_FORCED_COMMIT_NUDGES = 2;
  while (iterations < MAX_ITERATIONS && !committed) {
    iterations++;
    const response = await callGemini(history);
    if (!response) {
      warnings.push(`Gemini call ${iterations} failed`);
      break;
    }

    // Append model turn to history so the next call has context.
    history.push({ role: 'model', parts: response.parts });

    let hadFunctionCall = false;
    for (const part of response.parts) {
      if ('functionCall' in part) {
        hadFunctionCall = true;
        const { name, args } = part.functionCall;
        try {
          const result = await execTool(name, args);
          toolCalls.push({ name, args, ok: !('error' in result) });
          history.push({
            role: 'function',
            parts: [{ functionResponse: { name, response: result } }],
          });
          // Only a NON-empty commit counts. An empty commit is rejected
          // (result.rejected) and fed back so Gemini retries instead of
          // "giving up" with empty arrays.
          if (name === 'commit_result' && !('rejected' in result)) committed = true;
        } catch (err) {
          toolCalls.push({ name, args, ok: false });
          warnings.push(`tool ${name} threw: ${err instanceof Error ? err.message : String(err)}`);
          history.push({
            role: 'function',
            parts: [{ functionResponse: { name, response: { error: String(err) } } }],
          });
        }
      }
    }

    if (!hadFunctionCall) {
      // No tool call — Gemini's done, try to parse text as final result.
      let parsedText = false;
      for (const part of response.parts) {
        if ('text' in part && part.text) {
          const parsed = parseAgentJson(part.text);
          if (parsed) {
            mergeAgentResult(data, parsed);
            committed = true;
            parsedText = true;
          } else {
            warnings.push(`agent ended without commit; final text: ${part.text.slice(0, 200)}`);
          }
        }
      }
      // Empty/non-JSON turn without a commit → don't discard the crawl.
      // Force a commit_result and keep looping (bounded).
      if (!committed && !parsedText && forcedCommitNudges < MAX_FORCED_COMMIT_NUDGES) {
        forcedCommitNudges++;
        history.push({
          role: 'user',
          parts: [{
            text: `STOP investigating. You have already fetched the source pages — their full text is in this conversation above. Call commit_result NOW with a populated ClassifiedData built from what you gathered: map page bodies into pageContents (담임목사 인사말 → pastor_message, 교회 소개/비전 → church_intro/mission_vision, 오시는 길 → location_map, 연락처 → contact_info), worshipTimes from any 예배 시간표, churchInfo (name/address/phone), and menus from the nav links. Use empty arrays ONLY for content types that genuinely do not exist on this site. Do not reply with prose — emit the commit_result function call.`,
          }],
        });
        continue;
      }
      break;
    }
  }

  // Final guarantee: the most common 0-item failure is the agent burning all
  // its turns on fetch_url and hitting the iteration cap mid-crawl, never
  // committing. The empty-turn nudge above never fires in that case (every
  // turn had a functionCall). So here we force the issue: function-calling
  // mode=ANY/commit_result makes Gemini emit commit_result from the page text
  // already in context — it cannot fetch or reply with prose.
  if (!committed) {
    // mode=ANY forces the call but Gemini sometimes emits an EMPTY
    // classifiedData ({}). Reject empty commits and retry with an explicit
    // checklist of the pages it already fetched, so it has a concrete list to
    // turn into pageContents instead of giving up.
    const fetchedUrls = [...new Set(
      toolCalls
        .filter((t) => t.name === 'fetch_url')
        .map((t) => String((t.args as { url?: string }).url ?? ''))
        .filter(Boolean),
    )];
    const checklist = fetchedUrls.slice(0, 25).map((u, i) => `${i + 1}. ${u}`).join('\n');
    for (let attempt = 0; attempt < 3 && !committed; attempt++) {
      history.push({
        role: 'user',
        parts: [{
          text: `STOP. Output commit_result NOW with a POPULATED ClassifiedData — an empty {} is a FAILURE and will be rejected. You already fetched these pages (their text is in this conversation above):
${checklist || '(see the fetched page text above)'}

For EACH content page, add a pageContents entry whose blocks reproduce the layout in order: a hero_banner first (page heading → title, the small line under it → subtitle, the banner background photo → backgroundImageUrl), then one text_image per section (its heading → title, body → content, side image → imageUrl, alternating layout left/right), and image_gallery for image grids. Also fill churchInfo (name/address/phone/email), worshipTimes, menus, and every sermon/column/event/staff/album/bulletin you saw. Do NOT return an empty classifiedData.`,
        }],
      });
      const response = await callGemini(history, { forceCommit: true });
      if (!response) break;
      history.push({ role: 'model', parts: response.parts });
      for (const part of response.parts) {
        if ('functionCall' in part && part.functionCall.name === 'commit_result') {
          try {
            const result = await execTool('commit_result', part.functionCall.args) as { itemCountInPayload?: number };
            toolCalls.push({ name: 'commit_result', args: part.functionCall.args, ok: true });
            if ((result.itemCountInPayload ?? 0) > 0) {
              committed = true;
              onProgress?.(`result:forced_commit items=${countTotals(data)}`);
            } else {
              onProgress?.(`result:forced_commit empty (attempt ${attempt + 1})`);
            }
          } catch (err) {
            warnings.push(`forced commit_result threw: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
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
    const res = await proxiedFetch(url, { redirect: 'follow', signal: ctrl.signal });
    const html = await res.text();
    const headers = Object.fromEntries(res.headers.entries());
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
    const images: string[] = [];
    const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
    while ((m = imgRe.exec(bodyHtml)) !== null && images.length < 40) {
      const src = m[1] ?? '';
      if (src && !src.startsWith('data:')) images.push(resolveUrl(url, src));
    }
    return {
      url,
      status: res.status,
      contentType: headers['content-type'] ?? '',
      title,
      textLength: text.length,
      text,
      links: links.slice(0, 50),
      images: images.slice(0, 20),
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
// Gemini call with function-calling enabled.
// ────────────────────────────────────────────────────────────

const TOOL_DECLARATIONS = [{
  functionDeclarations: [
    {
      name: 'fetch_url',
      description: 'Fetch a single web page. Returns title, plain text (truncated to ~6000 chars), links, image URLs, and a WordPress hint.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Absolute URL to fetch' } },
        required: ['url'],
      },
    },
    {
      name: 'fetch_sitemap',
      description: 'Try /sitemap.xml, /sitemap_index.xml, /wp-sitemap.xml at the given base URL. Returns up to 200 page URLs.',
      parameters: {
        type: 'object',
        properties: { baseUrl: { type: 'string' } },
        required: ['baseUrl'],
      },
    },
    {
      name: 'try_wp_rest',
      description: 'Try a WordPress REST API endpoint, e.g. /wp-json/wp/v2/posts or /wp-json/wp/v2/pages. Returns up to 30 summarised items.',
      parameters: {
        type: 'object',
        properties: { baseUrl: { type: 'string' }, endpoint: { type: 'string' } },
        required: ['baseUrl', 'endpoint'],
      },
    },
    {
      name: 'try_youtube_channel',
      description: 'Fetch a YouTube channel page (for sermon video metadata).',
      parameters: {
        type: 'object',
        properties: { channelUrl: { type: 'string' } },
        required: ['channelUrl'],
      },
    },
    {
      name: 'commit_result',
      description: 'When you have gathered enough material, call this with the final ClassifiedData JSON. This ends the agent loop.',
      parameters: {
        type: 'object',
        properties: {
          classifiedData: {
            type: 'object',
            description: 'Final structured migration result (ClassifiedData shape — see system prompt).',
          },
        },
        required: ['classifiedData'],
      },
    },
  ],
}];

interface GeminiResponse {
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
  >;
}

async function callGemini(
  history: Array<{ role: string; parts: unknown[] }>,
  opts: { forceCommit?: boolean } = {},
): Promise<GeminiResponse | null> {
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: history,
          tools: TOOL_DECLARATIONS,
          // forceCommit: make Gemini MANDATORILY emit commit_result (no more
          // fetching, no prose) — used as the final guarantee when the agent
          // explored but never committed within the iteration budget.
          ...(opts.forceCommit
            ? { toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['commit_result'] } } }
            : {}),
          // A full-site ClassifiedData payload (churchInfo + pageContents
          // blocks + worshipTimes + menus + …) easily exceeds 4096 tokens.
          // At 4096 the commit_result args / final JSON got truncated →
          // empty commit or unparseable text. gemini-2.5-flash allows far
          // more, so give it ample room.
          generationConfig: { temperature: 0.2, maxOutputTokens: 16384 },
        }),
      },
    );
    if (!res.ok) {
      console.log(`[agent] Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    const parts = (data.candidates?.[0]?.content?.parts ?? []) as GeminiResponse['parts'];
    return { parts };
  } catch (err) {
    console.log(`[agent] Gemini exception: ${err instanceof Error ? err.message : String(err)}`);
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
