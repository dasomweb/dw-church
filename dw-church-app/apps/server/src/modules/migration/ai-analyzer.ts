/**
 * AI-powered page analyzer for non-WordPress site migration.
 * Uses Gemini 2.5 Flash to classify scraped pages and extract structured content.
 */

import { env } from '../../config/env.js';
import type { ScrapedSite } from './scraper.js';

// ─── Types ────────────────────────────────────────────────

export type PageCategory =
  | 'about' | 'vision' | 'history' | 'staff' | 'directions' | 'contact'
  | 'worship' | 'sermons' | 'bulletins' | 'columns' | 'albums' | 'events'
  | 'news' | 'board' | 'education' | 'mission' | 'newcomer' | 'other';

export interface AnalyzedPage {
  url: string;
  title: string;
  type: 'static' | 'dynamic';
  category: PageCategory;
  suggestedBlocks: { blockType: string; props: Record<string, unknown> }[];
  extractedContent: {
    title?: string;
    textContent?: string;
    images?: string[];
    tables?: { headers: string[]; rows: string[][] }[];
    staffMembers?: { name: string; role: string; photoUrl: string; bio: string }[];
    sermons?: { title: string; date: string; scripture: string; youtubeUrl: string }[];
    events?: { title: string; date: string; description: string }[];
  };
  confidence: number;
}

interface GeminiPageInput {
  url: string;
  title: string;
  textSnippet: string;
  imageCount: number;
}

// ─── Constants ────────────────────────────────────────────

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const BATCH_SIZE = 5;
const RATE_LIMIT_MS = 1500; // 1.5s between Gemini calls to avoid rate limits

// ─── System Prompt ────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 한국 교회 웹사이트 마이그레이션 전문가입니다.
주어진 페이지 정보를 분석하여 각 페이지를 분류하고 콘텐츠를 추출하세요.

각 페이지에 대해 다음을 판단하세요:
1. type: "static" (고정 콘텐츠 페이지) 또는 "dynamic" (반복/목록 콘텐츠)
2. category: 아래 중 하나
   - static 타입: about, vision, history, staff, directions, contact, worship, newcomer, education, mission, other
   - dynamic 타입: sermons, bulletins, columns, albums, events, news, board
3. suggestedBlocks: 해당 페이지에 적합한 블록 타입 목록
   - hero_banner: 페이지 상단 배너
   - text_only: 텍스트 콘텐츠
   - worship_times: 예배 시간표
   - map_section: 지도/오시는길
   - staff_grid: 교역자 목록
   - history_timeline: 연혁
   - gallery_grid: 갤러리
   - sermon_list: 설교 목록
   - bulletin_list: 주보 목록
   - event_list: 행사 목록
   - board_list: 게시판
4. extractedContent: 페이지에서 추출 가능한 구조화된 데이터

응답은 반드시 유효한 JSON 배열로만 출력하세요. 설명이나 마크다운 없이 순수 JSON만 반환하세요.`;

// ─── Gemini API Call ──────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

// ─── Build Analysis Prompt ────────────────────────────────

function buildBatchPrompt(pages: GeminiPageInput[]): string {
  const pagesJson = pages.map((p, i) => ({
    index: i,
    url: p.url,
    title: p.title,
    textSnippet: p.textSnippet,
    imageCount: p.imageCount,
  }));

  return `아래 ${pages.length}개의 교회 웹사이트 페이지를 분석하세요.

페이지 데이터:
${JSON.stringify(pagesJson, null, 2)}

각 페이지에 대해 아래 형식의 JSON 배열을 반환하세요:
[
  {
    "index": 0,
    "type": "static" | "dynamic",
    "category": "about" | "vision" | "history" | "staff" | "directions" | "contact" | "worship" | "sermons" | "bulletins" | "columns" | "albums" | "events" | "news" | "board" | "education" | "mission" | "newcomer" | "other",
    "suggestedBlocks": [
      { "blockType": "hero_banner", "props": { "title": "페이지 제목" } },
      { "blockType": "text_only", "props": { "title": "섹션 제목", "content": "텍스트 내용 요약" } }
    ],
    "extractedContent": {
      "title": "페이지 제목",
      "textContent": "주요 텍스트 내용",
      "images": ["이미지URL1", "이미지URL2"],
      "tables": [{ "headers": ["시간", "예배명"], "rows": [["오전 11시", "주일예배"]] }],
      "staffMembers": [{ "name": "홍길동", "role": "담임목사", "photoUrl": "", "bio": "약력" }],
      "sermons": [{ "title": "설교제목", "date": "2024-01-01", "scripture": "요한복음 3:16", "youtubeUrl": "" }],
      "events": [{ "title": "행사명", "date": "2024-01-01", "description": "설명" }]
    },
    "confidence": 0.85
  }
]

규칙:
- 실제 페이지 내용에 있는 데이터만 추출하세요. 없는 데이터를 만들어내지 마세요.
- extractedContent에서 해당되지 않는 필드는 빈 배열이나 빈 문자열로 두세요.
- confidence는 0~1 사이 값으로, 분류의 확신도를 나타냅니다.
- textContent는 페이지의 주요 내용을 요약하세요 (원본 텍스트 기반).
- 예배시간 정보가 있으면 tables에 추출하세요.
- 교역자 정보가 있으면 staffMembers에 추출하세요.`;
}

// ─── Parse Gemini Response ────────────────────────────────

interface GeminiAnalysisItem {
  index: number;
  type: 'static' | 'dynamic';
  category: PageCategory;
  suggestedBlocks: { blockType: string; props: Record<string, unknown> }[];
  extractedContent: AnalyzedPage['extractedContent'];
  confidence: number;
}

function parseGeminiResponse(text: string): GeminiAnalysisItem[] {
  // Strip markdown code fence if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array from Gemini');
  }
  return parsed as GeminiAnalysisItem[];
}

// ─── Fallback Analysis (no AI) ────────────────────────────
// Used when Gemini API is unavailable or fails

const CATEGORY_PATTERNS: Record<PageCategory, string[]> = {
  about: ['about', '소개', '교회소개', 'church-info', '인사말', '담임목사'],
  vision: ['vision', '비전', '사명', '목표'],
  history: ['history', '연혁', '교회연혁', 'timeline'],
  staff: ['staff', '교역자', '사역자', '목사', 'pastor', 'leadership'],
  directions: ['direction', '오시는길', '위치', 'location', '약도', '찾아오시는'],
  contact: ['contact', '연락', '문의'],
  worship: ['worship', '예배', '예배안내', '예배시간'],
  sermons: ['sermon', '설교', '주일설교', '수요설교', '말씀', 'message'],
  bulletins: ['bulletin', '주보', 'weekly-bulletin'],
  columns: ['column', '칼럼', '목회칼럼', '담임목사칼럼'],
  albums: ['album', 'gallery', '앨범', '갤러리', '사진', 'photo'],
  events: ['event', '행사', '이벤트'],
  news: ['news', '소식', '공지', '새소식', 'notice'],
  board: ['board', '게시판', '나눔', '간증'],
  education: ['education', '교육', '주일학교', '청년', '유년부', '중고등부'],
  mission: ['mission', '선교', 'outreach'],
  newcomer: ['newcomer', '새가족', '새신자', '등록'],
  other: [],
};

function fallbackClassify(url: string, title: string, textContent: string): { type: 'static' | 'dynamic'; category: PageCategory } {
  const combined = `${title} ${url} ${textContent.slice(0, 500)}`.toLowerCase();

  // Dynamic content patterns
  const dynamicCategories: PageCategory[] = ['sermons', 'bulletins', 'columns', 'albums', 'events', 'news', 'board'];

  for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS) as [PageCategory, string[]][]) {
    if (cat === 'other') continue;
    for (const pattern of patterns) {
      if (combined.includes(pattern.toLowerCase())) {
        return {
          type: dynamicCategories.includes(cat) ? 'dynamic' : 'static',
          category: cat,
        };
      }
    }
  }

  return { type: 'static', category: 'other' };
}

function blockTypeForCategory(category: PageCategory): string {
  const map: Record<PageCategory, string> = {
    about: 'text_only',
    vision: 'text_only',
    history: 'history_timeline',
    staff: 'staff_grid',
    directions: 'map_section',
    contact: 'text_only',
    worship: 'worship_times',
    sermons: 'sermon_list',
    bulletins: 'bulletin_list',
    columns: 'text_only',
    albums: 'gallery_grid',
    events: 'event_list',
    news: 'board_list',
    board: 'board_list',
    education: 'text_only',
    mission: 'text_only',
    newcomer: 'text_only',
    other: 'text_only',
  };
  return map[category];
}

// ─── Main Export ──────────────────────────────────────────

export async function analyzePages(site: ScrapedSite): Promise<AnalyzedPage[]> {
  const pages = site.pages;
  const results: AnalyzedPage[] = [];

  // Prepare page inputs for Gemini
  const pageInputs: GeminiPageInput[] = pages.map((p) => ({
    url: p.url,
    title: p.title,
    textSnippet: p.textContent.slice(0, 2000),
    imageCount: p.images.length,
  }));

  // Check if Gemini API key is available
  if (!env.GEMINI_API_KEY) {
    // Fallback: use pattern-based classification
    return pages.map((p) => {
      const classification = fallbackClassify(p.url, p.title, p.textContent);
      const mainBlock = blockTypeForCategory(classification.category);
      return {
        url: p.url,
        title: p.title,
        type: classification.type,
        category: classification.category,
        suggestedBlocks: [
          { blockType: 'hero_banner', props: { title: p.title } },
          { blockType: mainBlock, props: { title: p.title, content: p.textContent.slice(0, 500) } },
        ],
        extractedContent: {
          title: p.title,
          textContent: p.textContent.slice(0, 1000),
          images: p.images,
        },
        confidence: 0.4,
      };
    });
  }

  // Process in batches
  for (let i = 0; i < pageInputs.length; i += BATCH_SIZE) {
    const batch = pageInputs.slice(i, i + BATCH_SIZE);
    const batchPages = pages.slice(i, i + BATCH_SIZE);

    try {
      // Rate limit between batches
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      }

      const prompt = buildBatchPrompt(batch);
      const responseText = await callGemini(prompt);
      const analyzed = parseGeminiResponse(responseText);

      // Map Gemini results back to AnalyzedPage format
      for (const item of analyzed) {
        const sourcePage = batchPages[item.index];
        if (!sourcePage) continue;

        results.push({
          url: sourcePage.url,
          title: sourcePage.title,
          type: item.type ?? 'static',
          category: item.category ?? 'other',
          suggestedBlocks: item.suggestedBlocks ?? [
            { blockType: 'hero_banner', props: { title: sourcePage.title } },
            { blockType: 'text_only', props: { title: sourcePage.title } },
          ],
          extractedContent: {
            title: item.extractedContent?.title ?? sourcePage.title,
            textContent: item.extractedContent?.textContent ?? sourcePage.textContent.slice(0, 1000),
            images: item.extractedContent?.images ?? sourcePage.images,
            tables: item.extractedContent?.tables ?? [],
            staffMembers: item.extractedContent?.staffMembers ?? [],
            sermons: item.extractedContent?.sermons ?? [],
            events: item.extractedContent?.events ?? [],
          },
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        });
      }

      // Handle any pages in the batch that Gemini didn't return results for
      for (let j = 0; j < batchPages.length; j++) {
        const page = batchPages[j]!;
        const hasResult = results.some((r) => r.url === page.url);
        if (!hasResult) {
          const classification = fallbackClassify(page.url, page.title, page.textContent);
          results.push({
            url: page.url,
            title: page.title,
            type: classification.type,
            category: classification.category,
            suggestedBlocks: [
              { blockType: 'hero_banner', props: { title: page.title } },
              { blockType: blockTypeForCategory(classification.category), props: { title: page.title } },
            ],
            extractedContent: {
              title: page.title,
              textContent: page.textContent.slice(0, 1000),
              images: page.images,
            },
            confidence: 0.3,
          });
        }
      }
    } catch (err) {
      // AI batch failed — fallback to pattern matching for this batch
      for (const page of batchPages) {
        const classification = fallbackClassify(page.url, page.title, page.textContent);
        results.push({
          url: page.url,
          title: page.title,
          type: classification.type,
          category: classification.category,
          suggestedBlocks: [
            { blockType: 'hero_banner', props: { title: page.title } },
            { blockType: blockTypeForCategory(classification.category), props: { title: page.title } },
          ],
          extractedContent: {
            title: page.title,
            textContent: page.textContent.slice(0, 1000),
            images: page.images,
          },
          confidence: 0.3,
        });
      }
    }
  }

  return results;
}
