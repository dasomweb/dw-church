/**
 * LLM Classifier — Phase 12-γ.4 (2026-06-03).
 *
 * AI-driven migration: for each scraped page, ask Gemini 2.5 Flash to
 * classify the page type and extract structured fields matching our
 * ClassifiedData shape. Runs AFTER the rule-based pass — rule-based is
 * fast/free first pass, LLM picks up what rules miss + enriches what
 * rules caught.
 *
 * User mandate ([[project_migration_ai_classifier]]): migration MUST
 * include AI that surveys all subpages and converts them to our
 * content structure. Rule-based alone is insufficient — custom
 * WordPress themes, non-English categories, custom post types, ACF
 * fields all fall outside the rule set.
 *
 * Cost target: ~$0.05–0.30 per tenant migration (Gemini 2.5 Flash
 * pricing at the time of writing; per-page input ~2K tokens × $0.075
 * /1M = ~$0.00015/page × 30 pages = ~$0.005 floor + output).
 */

import { env } from '../../config/env.js';
import type { ClassifiedData, RawExtractedData } from './types.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';
const PER_PAGE_INPUT_CAP = 8000;     // chars of body text per page sent to LLM
const CONCURRENCY = 4;                // parallel page-classify calls
const TIMEOUT_MS = 30_000;

/**
 * The structured output shape Gemini returns per page. Wide schema so
 * one page can contribute to multiple content modules (e.g. an "About"
 * page that has both a pastor greeting AND a history timeline).
 */
interface LlmPageResult {
  classification: 'sermon' | 'bulletin' | 'column' | 'event' | 'album' | 'staff'
    | 'history' | 'pastor_greeting' | 'about' | 'vision' | 'worship' | 'directions'
    | 'newcomer' | 'mission' | 'home' | 'board' | 'other';
  confidence: number; // 0..1
  reason: string;     // model's short rationale (logged for debug, not stored)
  // Each field is optional — Gemini fills only what the page actually
  // contains. Empty arrays = nothing found.
  churchInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    slogan?: string;
  };
  sermons?: { title: string; preacher?: string; date?: string; scripture?: string; youtubeUrl?: string; thumbnailUrl?: string; }[];
  bulletins?: { title: string; date?: string; pdfUrl?: string; }[];
  columns?: { title: string; content?: string; topImageUrl?: string; date?: string; }[];
  events?: { title: string; date?: string; description?: string; location?: string; imageUrl?: string; }[];
  albums?: { title: string; images?: string[]; }[];
  staff?: { name: string; role?: string; department?: string; photoUrl?: string; bio?: string; }[];
  history?: { year: number; month?: string; title: string; description?: string; }[];
  worshipTimes?: { name: string; day?: string; time?: string; location?: string; }[];
  pageContent?: {
    blockType: string;  // hero_banner / text_image / pastor_message / etc.
    props: Record<string, unknown>;
  }[];
  boardPosts?: { title: string; author?: string; date?: string; content?: string; }[];
}

/**
 * Main entry — runs Gemini classify for each page in raw.pages + each
 * WP post in raw.wpPosts, merging structured output into `data`
 * in-place. Idempotent: pre-existing items are deduplicated by title +
 * date so the rule-based pass and LLM pass don't double-count.
 *
 * Errors per page are silently swallowed — the rule-based output is
 * the floor, LLM only ever ADDS.
 */
export async function applyLlmClassification(
  data: ClassifiedData,
  raw: RawExtractedData,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  pagesProcessed: number;
  llmAdded: number;
  /** Count per classification — lets the operator see "5 column pages,
   *  2 about pages, etc." so they know what the LLM did. */
  breakdown?: Record<string, number>;
  /** Per-page warnings (LLM gave empty blocks, exception, etc.). */
  warnings?: string[];
}> {
  if (!env.GEMINI_API_KEY) {
    // No key → silently skip. Caller already has rule-based output.
    return { pagesProcessed: 0, llmAdded: 0, breakdown: {}, warnings: ['GEMINI_API_KEY 미설정'] };
  }

  // Build the work list: one LLM call per crawled page.
  type Work = { url: string; title: string; bodyText: string; headSummary: string };

  const work: Work[] = raw.pages.map((p) => ({
    url: p.url,
    title: p.title,
    bodyText: p.textContent.slice(0, PER_PAGE_INPUT_CAP),
    headSummary: summarizeSeo(p.seo),
  }));

  const total = work.length;
  let done = 0;
  const beforeCounts = countTotals(data);

  // Per-classification tallies + warnings so we can SEE what the LLM
  // produced for each page (vs. silently swallowing per-page errors).
  // Surfaced in the return so /migrate-url can log them server-side.
  const breakdown: Record<string, number> = {};
  const warnings: string[] = [];

  // Simple concurrency limiter.
  const queue = [...work];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) break;
        try {
          const result = await classifyOnePage(job.url, job.title, job.bodyText, job.headSummary);
          if (result) {
            breakdown[result.classification] = (breakdown[result.classification] ?? 0) + 1;
            // Static-page classifications must populate pageContent.
            // If LLM classified the page but returned no blocks, the
            // page content is lost. Surface this so we can diagnose.
            const isStatic = ['pastor_greeting', 'about', 'vision', 'directions',
              'newcomer', 'mission', 'home', 'history'].includes(result.classification);
            if (isStatic && (!result.pageContent || result.pageContent.length === 0)) {
              warnings.push(`${result.classification} 분류이나 pageContent 비어있음: ${job.url}`);
            }
            mergeIntoData(data, result);
          } else {
            warnings.push(`LLM 응답 실패: ${job.url}`);
          }
        } catch (err) {
          warnings.push(`예외: ${job.url} — ${err instanceof Error ? err.message : String(err)}`);
        }
        done++;
        onProgress?.(done, total);
      }
    })());
  }
  await Promise.all(workers);

  const afterCounts = countTotals(data);
  return {
    pagesProcessed: total,
    llmAdded: afterCounts - beforeCounts,
    breakdown,
    warnings,
  };
}

// ─── one page → Gemini structured output ────────────────────

async function classifyOnePage(
  url: string,
  title: string,
  bodyText: string,
  headSummary: string,
): Promise<LlmPageResult | null> {
  if (!bodyText.trim() && !title.trim()) return null;

  const systemPrompt = `You are a website migration assistant for Korean church websites.
Your job: given one page from a source church website, classify what kind of
content it is and extract any structured items present.

Content type taxonomy (pick the most specific that fits):
- sermon: 설교 / message / preaching (a list page OR a single sermon post)
- bulletin: 주보 / weekly bulletin / jubo
- column: 칼럼 / pastoral column / devotion / 묵상
- event: 행사 / 공지 / notice / news / announcement
- album: 앨범 / gallery / photo collection (3+ images grouped under one title)
- staff: 교역자 / pastor list / ministry leader list
- history: 연혁 / chronicle / timeline (year-tagged events)
- pastor_greeting: 담임목사 인사말 / pastor message / greeting
- about: 교회 소개 / introduction
- vision: 비전 / 사명 / mission statement (separate from about/mission)
- worship: 예배 안내 / worship times / service schedule
- directions: 오시는 길 / location / contact / 찾아오는 길
- newcomer: 새가족 안내 / welcome
- mission: 선교 / outreach
- home: top-level home/landing page
- board: generic board (free / Q&A / community)
- other: doesn't match any above

For each item you extract, return ONLY the fields you can determine
from the provided content. Don't hallucinate dates, authors, or
scripture references that aren't in the page.

For Korean church terminology:
- "담임목사" = senior pastor; "부목사" = associate pastor; "전도사" = evangelist
- "장로/권사/집사" = elder/deaconess/deacon (also "staff" in our model)
- "주일예배" = Sunday service; "수요예배" = Wednesday service; "새벽기도" = dawn prayer
- "주보" = weekly bulletin; "설교" = sermon; "칼럼" = column

CRITICAL — pageContent extraction (for static pages):
When you classify a page as one of {pastor_greeting, about, vision,
directions, newcomer, mission, worship, home}, you MUST also populate
pageContent[] with the page body translated into structured blocks.
Without this, the static page content is lost.

For each page classification, use these exact blockType values + props:

- pastor_greeting → blockType="pastor_message", props={ title, name, message, photoUrl }
    title = page heading (default "담임목사 인사말")
    name = pastor's name extracted from body (e.g. "김아무개 목사")
    message = full greeting body text (preserve paragraphs as \n\n)
    photoUrl = URL of any pastor photo in the page

- about → blockType="church_intro", props={ title, content, imageUrl }
    title = page heading (default "교회 소개")
    content = full intro body text
    imageUrl = main image URL if present

- vision → blockType="mission_vision", props={ title, content, imageUrl }
    title = page heading (default "비전")
    content = full vision statement text
    imageUrl = main image URL if present

- directions → TWO blocks:
    blockType="location_map", props={ title="오시는 길", address }
    blockType="contact_info", props={ title="연락처", phone, email, address }

- newcomer → blockType="newcomer_info", props={ title, content, imageUrl }
    title = page heading (default "새가족 안내")
    content = full newcomer info text
    imageUrl = main image URL if present

- mission → blockType="text_image", props={ title, content, imageUrl }
    title = page heading (default "선교")
    content = full mission text
    imageUrl = main image URL if present

- worship → leave pageContent empty (worship times go into worshipTimes[] field)

- home → blockType="text_image" only if home page has substantial intro text
    title, content, imageUrl as above

For OTHER pages with substantial body text (not in above list), if you
still want to preserve content, use blockType="text_image" or
"text_only" — but only when classification is one of the above types.

Output STRICT JSON matching the schema. If the page doesn't fit any
category, return {"classification":"other","confidence":0.1,"reason":"..."}.`;

  const userPrompt = `URL: ${url}
TITLE: ${title}
HEAD/META: ${headSummary}

BODY (truncated to ${PER_PAGE_INPUT_CAP} chars):
${bodyText}`;

  const apiKey = env.GEMINI_API_KEY;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: PAGE_RESULT_SCHEMA,
          },
        }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.log(`[llm] ${url} HTTP ${res.status}: ${errBody.slice(0, 500)}`);
      return null;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.log(`[llm] ${url} empty response: ${JSON.stringify(data).slice(0, 500)}`);
      return null;
    }
    const parsed = JSON.parse(text) as LlmPageResult;
    return parsed;
  } catch (err) {
    console.log(`[llm] ${url} exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── merge into ClassifiedData ──────────────────────────────

function mergeIntoData(data: ClassifiedData, r: LlmPageResult): void {
  // ── church info: only fill empties (rule-based already ran) ──
  if (r.churchInfo) {
    const ci = data.churchInfo as unknown as Record<string, string>;
    for (const [k, v] of Object.entries(r.churchInfo)) {
      if (v && !ci[k]) ci[k] = v;
    }
  }

  // ── sermons: dedup by title + date ──
  const sermonKey = (s: { title: string; date?: string }) =>
    (s.title + '|' + (s.date ?? '')).toLowerCase();
  const seenSermons = new Set(data.sermons.map((s) => sermonKey(s)));
  for (const s of r.sermons ?? []) {
    const k = sermonKey(s);
    if (seenSermons.has(k)) continue;
    seenSermons.add(k);
    data.sermons.push({
      title: s.title,
      scripture: s.scripture ?? '',
      preacher: s.preacher ?? '',
      date: s.date ?? '',
      youtubeUrl: s.youtubeUrl ?? '',
      thumbnailUrl: s.thumbnailUrl ?? '',
    });
  }

  // ── bulletins ──
  const bulletinKey = (b: { title: string; date?: string }) =>
    (b.title + '|' + (b.date ?? '')).toLowerCase();
  const seenBulletins = new Set(data.bulletins.map((b) => bulletinKey(b)));
  for (const b of r.bulletins ?? []) {
    const k = bulletinKey(b);
    if (seenBulletins.has(k)) continue;
    seenBulletins.add(k);
    data.bulletins.push({
      title: b.title,
      date: b.date ?? '',
      pdfUrl: b.pdfUrl ?? '',
      images: [],
    });
  }

  // ── columns ──
  const colKey = (c: { title: string }) => c.title.toLowerCase();
  const seenCols = new Set(data.columns.map((c) => colKey(c)));
  for (const c of r.columns ?? []) {
    if (seenCols.has(colKey(c))) continue;
    seenCols.add(colKey(c));
    data.columns.push({
      title: c.title,
      content: c.content ?? '',
      topImageUrl: c.topImageUrl ?? '',
      youtubeUrl: '',
      date: c.date ?? '',
    });
  }

  // ── events ──
  const eventKey = (e: { title: string; date?: string }) =>
    (e.title + '|' + (e.date ?? '')).toLowerCase();
  const seenEvents = new Set(data.events.map((e) => eventKey(e)));
  for (const e of r.events ?? []) {
    if (seenEvents.has(eventKey(e))) continue;
    seenEvents.add(eventKey(e));
    data.events.push({
      title: e.title,
      description: e.description ?? '',
      date: e.date ?? '',
      location: e.location ?? '',
      imageUrl: e.imageUrl ?? '',
    });
  }

  // ── albums ──
  for (const a of r.albums ?? []) {
    if (!a.images?.length) continue;
    if (data.albums.some((existing) => existing.title.toLowerCase() === a.title.toLowerCase())) continue;
    data.albums.push({
      title: a.title,
      images: a.images,
      youtubeUrl: '',
    });
  }

  // ── staff ──
  const staffKey = (s: { name: string }) => s.name.toLowerCase().trim();
  const seenStaff = new Set(data.staff.map((s) => staffKey(s)));
  for (const s of r.staff ?? []) {
    if (seenStaff.has(staffKey(s))) continue;
    seenStaff.add(staffKey(s));
    data.staff.push({
      name: s.name,
      role: s.role ?? '',
      department: s.department ?? '',
      photoUrl: s.photoUrl ?? '',
      bio: s.bio ?? '',
    });
  }

  // ── history ──
  const histKey = (h: { year: number; title: string }) => `${h.year}|${h.title.toLowerCase()}`;
  const seenHist = new Set(data.history.map((h) => histKey(h)));
  for (const h of r.history ?? []) {
    if (seenHist.has(histKey(h))) continue;
    seenHist.add(histKey(h));
    data.history.push({
      year: h.year,
      month: h.month ?? '',
      title: h.title,
      description: h.description ?? '',
    });
  }

  // ── worship times ──
  if (r.worshipTimes?.length && data.worshipTimes.length === 0) {
    data.worshipTimes = r.worshipTimes.map((w) => ({
      name: w.name,
      day: w.day ?? '',
      time: w.time ?? '',
      location: w.location ?? '',
    }));
  }

  // ── page content blocks ──
  if (r.pageContent?.length) {
    const slug = inferSlugFromClassification(r.classification);
    if (slug) {
      let existing = data.pageContents.find((p) => p.pageSlug === slug);
      if (!existing) {
        existing = { pageSlug: slug, blocks: [] };
        data.pageContents.push(existing);
      }
      for (const blk of r.pageContent) {
        if (!existing.blocks.some((b) => b.blockType === blk.blockType)) {
          existing.blocks.push(blk);
        }
      }
    }
  }

  // ── board posts (uncategorized go to 'blog' board) ──
  if (r.boardPosts?.length) {
    let blog = data.boards.find((b) => b.boardSlug === 'blog');
    if (!blog) {
      blog = { boardSlug: 'blog', boardTitle: '블로그', posts: [] };
      data.boards.push(blog);
    }
    for (const bp of r.boardPosts) {
      blog.posts.push({
        title: bp.title,
        content: bp.content ?? '',
        author: bp.author ?? '',
        date: bp.date ?? '',
      });
    }
  }
}

// ─── helpers ────────────────────────────────────────────────

function summarizeSeo(seo: RawExtractedData['pages'][number]['seo']): string {
  if (!seo) return '';
  return [
    seo.ogTitle && `og:title=${seo.ogTitle}`,
    seo.ogDescription && `og:description=${seo.ogDescription.slice(0, 200)}`,
    seo.metaKeywords && `keywords=${seo.metaKeywords.slice(0, 200)}`,
    seo.ldName && `ld:name=${seo.ldName}`,
    seo.isWordPress && 'platform=wordpress',
  ].filter(Boolean).join(' | ');
}

function countTotals(data: ClassifiedData): number {
  return data.sermons.length + data.bulletins.length + data.columns.length
    + data.events.length + data.albums.length + data.staff.length
    + data.history.length + data.worshipTimes.length
    + data.boards.reduce((sum, b) => sum + b.posts.length, 0)
    + data.pageContents.reduce((sum, p) => sum + p.blocks.length, 0);
}

function inferSlugFromClassification(c: LlmPageResult['classification']): string | null {
  switch (c) {
    case 'home': return 'home';
    case 'about': return 'about';
    case 'pastor_greeting': return 'pastor-greeting';
    case 'vision': return 'vision';
    case 'directions': return 'directions';
    case 'newcomer': return 'newcomer';
    case 'mission': return 'mission';
    case 'worship': return 'worship';
    case 'history': return 'history';
    default: return null;
  }
}

// Gemini structured-output schema. Recursive-ish via inline object
// definitions. The schema is OpenAPI 3.0 subset per Gemini's spec.
const PAGE_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    classification: {
      type: 'string',
      enum: ['sermon', 'bulletin', 'column', 'event', 'album', 'staff', 'history',
        'pastor_greeting', 'about', 'vision', 'worship', 'directions', 'newcomer',
        'mission', 'home', 'board', 'other'],
    },
    confidence: { type: 'number' },
    reason: { type: 'string' },
    churchInfo: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        description: { type: 'string' },
        slogan: { type: 'string' },
      },
    },
    sermons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' }, preacher: { type: 'string' }, date: { type: 'string' },
          scripture: { type: 'string' }, youtubeUrl: { type: 'string' }, thumbnailUrl: { type: 'string' },
        },
        required: ['title'],
      },
    },
    bulletins: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, date: { type: 'string' }, pdfUrl: { type: 'string' } },
        required: ['title'],
      },
    },
    columns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          topImageUrl: { type: 'string' },
          date: { type: 'string' },
        },
        required: ['title'],
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' }, date: { type: 'string' },
          description: { type: 'string' }, location: { type: 'string' }, imageUrl: { type: 'string' },
        },
        required: ['title'],
      },
    },
    albums: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
        },
        required: ['title'],
      },
    },
    staff: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, role: { type: 'string' }, department: { type: 'string' },
          photoUrl: { type: 'string' }, bio: { type: 'string' },
        },
        required: ['name'],
      },
    },
    history: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          year: { type: 'number' }, month: { type: 'string' },
          title: { type: 'string' }, description: { type: 'string' },
        },
        required: ['year', 'title'],
      },
    },
    worshipTimes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, day: { type: 'string' },
          time: { type: 'string' }, location: { type: 'string' },
        },
        required: ['name'],
      },
    },
    pageContent: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockType: { type: 'string' },
          props: { type: 'object' },
        },
        required: ['blockType'],
      },
    },
    boardPosts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' }, author: { type: 'string' },
          date: { type: 'string' }, content: { type: 'string' },
        },
        required: ['title'],
      },
    },
  },
  required: ['classification', 'confidence', 'reason'],
} as const;
