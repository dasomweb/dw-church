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
      text: `You are a Korean-church website migration agent. Your job: given
the source URL ${sourceUrl}${youtubeChannelUrl ? ` and YouTube channel ${youtubeChannelUrl}` : ''},
investigate the site using the provided tools and accumulate
ClassifiedData (pastor greeting, vision, worship times, sermons,
bulletins, columns, events, albums, staff, history, board posts, etc.).

Strategy hints (you decide):
  - Start broad: try fetch_sitemap; if successful, use the URLs to pick
    pages worth fetching. If sitemap is missing, fetch_url the homepage
    and read its links.
  - If the homepage HTML mentions wp-json or /wp-content, the site is
    likely WordPress — try_wp_rest can pull /wp-json/wp/v2/posts directly.
  - When you have enough material, call the final tool 'commit_result'
    with the full ClassifiedData JSON. Don't keep fetching forever.
  - You have at most ${MAX_ITERATIONS} tool calls total.

Korean church content type cues:
  - 설교/sermon: page lists sermons with date + speaker
  - 주보/jubo/bulletin: weekly PDF or post
  - 칼럼/column: pastoral writing
  - 행사/notice/news: announcements, events
  - 교역자/staff: pastors / leaders
  - 인사말/greeting: pastor's welcome message
  - 비전/vision: church's mission statement
  - 예배/worship: service times
  - 연혁/history: timeline of church milestones

When you commit_result, you're done. Don't ask for confirmation.`,
    }],
  }];

  // ── Tool implementations (executed when Gemini emits functionCall) ──
  async function execTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    onProgress?.(`tool:${name}(${JSON.stringify(args).slice(0, 80)})`);
    if (name === 'fetch_url') {
      const url = String(args.url ?? '');
      if (!url) return { error: 'url required' };
      return await fetchUrl(url);
    }
    if (name === 'fetch_sitemap') {
      const baseUrl = String(args.baseUrl ?? sourceUrl);
      return await fetchSitemap(baseUrl);
    }
    if (name === 'try_wp_rest') {
      const baseUrl = String(args.baseUrl ?? sourceUrl);
      const endpoint = String(args.endpoint ?? '/wp-json/wp/v2/posts');
      return await tryWpRest(baseUrl, endpoint);
    }
    if (name === 'try_youtube_channel') {
      const channelUrl = String(args.channelUrl ?? youtubeChannelUrl ?? '');
      if (!channelUrl) return { error: 'no channel url' };
      return await tryYoutubeChannel(channelUrl);
    }
    if (name === 'commit_result') {
      mergeAgentResult(data, args.classifiedData as Record<string, unknown>);
      return { ok: true, committed: countTotals(data) };
    }
    return { error: `unknown tool: ${name}` };
  }

  // ── The agent loop ──
  let iterations = 0;
  let committed = false;
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
          if (name === 'commit_result') committed = true;
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
      for (const part of response.parts) {
        if ('text' in part && part.text) {
          try {
            const parsed = JSON.parse(stripJsonFence(part.text));
            mergeAgentResult(data, parsed);
            committed = true;
          } catch {
            warnings.push(`agent ended without commit; final text: ${part.text.slice(0, 200)}`);
          }
        }
      }
      break;
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
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
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
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: ctrl.signal,
      });
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
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
      signal: ctrl.signal,
    });
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

async function callGemini(history: Array<{ role: string; parts: unknown[] }>): Promise<GeminiResponse | null> {
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: history,
          tools: TOOL_DECLARATIONS,
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
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

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

function resolveUrl(base: string, relative: string): string {
  try { return new URL(relative, base).href; } catch { return relative; }
}
