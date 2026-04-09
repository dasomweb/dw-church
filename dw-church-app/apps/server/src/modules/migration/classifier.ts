/**
 * Classifier — maps raw extracted data (text + images) to our data structure.
 * Uses rule-based pattern matching (hybrid approach: rules first, AI later).
 * See MIGRATION.md §5 for classification logic.
 */

import type {
  RawExtractedData,
  ClassifiedData,
  ClassifiedWorshipTime,
  ClassifiedHistoryItem,
  ClassifiedPageContent,
} from './types.js';
import { emptyClassifiedData } from './types.js';
import { extractVideoId, thumbnailUrl, extractYouTubeUrlsFromPage } from './extractors/youtube.js';

// ─── Slug mapping: source URL → our page slug ──────────────

const SLUG_PATTERNS: [RegExp, string][] = [
  [/^(home|index|main|\/)$/i, 'home'],
  [/about|intro|church-info|cpstory/i, 'about'],
  [/pastor|greet|senior-pastor/i, 'pastor-greeting'],
  [/vision|mission/i, 'vision'],
  [/history|timeline|chronicle/i, 'history'],
  [/direction|location|map|contact|access/i, 'directions'],
  [/staff|people|leader|minister/i, 'staff'],
  [/worship|service|sunday/i, 'worship'],
  [/newcomer|welcome|first-time|visitor/i, 'newcomer'],
  [/sermon|preaching|message/i, 'sermons'],
  [/column|pastoral|devotion/i, 'columns'],
  [/bulletin|weekly|jubo/i, 'bulletins'],
  [/edu.*child|children|sunday-school/i, 'edu-children'],
  [/edu.*youth|youth|middle|high/i, 'edu-youth'],
  [/edu.*young|young-adult|college/i, 'edu-young-adult'],
  [/mission|outreach/i, 'mission'],
  [/event|news|notice|announcement/i, 'events'],
  [/album|gallery|photo/i, 'albums'],
];

function mapSlug(sourceUrl: string, siteBaseUrl: string): string | null {
  const path = sourceUrl
    .replace(siteBaseUrl, '')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .toLowerCase();

  if (!path || path === '#') return 'home';

  for (const [pattern, slug] of SLUG_PATTERNS) {
    if (pattern.test(path)) return slug;
  }

  return null; // Unknown page — will be skipped or assigned generic slug
}

// ─── Text pattern extractors ────────────────────────────────

function extractPhone(text: string): string {
  const m = text.match(/(\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4})/);
  return m?.[1] ?? '';
}

function extractEmail(text: string): string {
  const m = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  return m?.[0] ?? '';
}

function extractAddress(text: string): string {
  const lines = text.split(/[.\n]/);
  for (const line of lines) {
    const t = line.trim();
    // Korean address
    if (/[시도구군읍면동로길번지]/.test(t) && t.length > 5 && t.length < 200) return t;
    // English address
    if (/\d+\s+\w+\s+(st|ave|rd|blvd|dr|ln|way|ct|street|avenue)/i.test(t) && t.length < 200) return t;
  }
  return '';
}

function extractWorshipTimes(text: string): ClassifiedWorshipTime[] {
  const services: ClassifiedWorshipTime[] = [];
  // Pattern: "예배이름 요일 시간 장소" or table rows
  const patterns = [
    // "주일 1부 예배 일요일 오전 7:00 본당"
    /([\w가-힣\s]+(?:예배|worship))\s+(\S+)\s+(\d{1,2}:\d{2})\s*(.*)/gi,
    // "주일1부 07:00"
    /([\w가-힣]+(?:부|예배))\s+(\d{1,2}:\d{2})/gi,
  ];

  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      services.push({
        name: m[1]?.trim() || '',
        day: m[2]?.trim() || '',
        time: m[3]?.trim() || m[2]?.trim() || '',
        location: m[4]?.trim() || '',
      });
    }
    if (services.length > 0) break;
  }

  return services;
}

function extractHistoryItems(text: string): ClassifiedHistoryItem[] {
  const items: ClassifiedHistoryItem[] = [];
  // Pattern: "1990년 3월 교회 설립" or "1990 - Church founded"
  const regex = /(\d{4})(?:년)?\s*(\d{1,2})?(?:월)?\s*[-–]?\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const desc = m[3]?.trim() || '';
    if (desc.length > 2 && desc.length < 500) {
      items.push({
        year: parseInt(m[1]!, 10),
        month: m[2] || '',
        title: desc.slice(0, 100),
        description: desc,
      });
    }
  }
  return items;
}

// ─── Main classifier ────────────────────────────────────────

export function classify(raw: RawExtractedData): ClassifiedData {
  const data = emptyClassifiedData();
  const baseUrl = raw.source.url ? new URL(raw.source.url).origin : '';
  const allImages: string[] = [];

  // ── YouTube videos → sermons ──
  for (const v of raw.youtubeVideos) {
    data.sermons.push({
      title: v.title,
      scripture: '',
      preacher: '',
      date: v.date,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnailUrl: v.thumbnailUrl,
    });
  }

  // ── Process each page ──
  for (const page of raw.pages) {
    const slug = mapSlug(page.url, baseUrl);
    allImages.push(...page.images);

    // Extract church info from any page (accumulate)
    const phone = extractPhone(page.textContent);
    const email = extractEmail(page.textContent);
    const address = extractAddress(page.textContent);
    if (phone && !data.churchInfo.phone) data.churchInfo.phone = phone;
    if (email && !data.churchInfo.email) data.churchInfo.email = email;
    if (address && !data.churchInfo.address) data.churchInfo.address = address;

    // Church name from home page title
    if (slug === 'home' && page.title) {
      data.churchInfo.name = page.title
        .replace(/\s*[-|–]\s*.*$/, '') // Remove " - subtitle" part
        .trim();
    }

    // Extract YouTube URLs from page content → sermons
    const ytUrls = extractYouTubeUrlsFromPage(page.textContent, page.links);
    if (slug === 'sermons' || !slug) {
      for (const ytUrl of ytUrls) {
        const videoId = extractVideoId(ytUrl);
        if (videoId && !data.sermons.some((s) => s.youtubeUrl.includes(videoId))) {
          data.sermons.push({
            title: '', // Will be enriched via oEmbed if needed
            scripture: '',
            preacher: '',
            date: '',
            youtubeUrl: ytUrl,
            thumbnailUrl: thumbnailUrl(videoId),
          });
        }
      }
    }

    // Page-specific classification
    if (slug === 'worship') {
      const times = extractWorshipTimes(page.textContent);
      if (times.length > 0) data.worshipTimes = times;
    }

    if (slug === 'history') {
      const items = extractHistoryItems(page.textContent);
      if (items.length > 0) data.history = items;
    }

    // Build page content blocks (static block props)
    // hero_banner excluded per MIGRATION.md — admin sets it manually
    if (slug) {
      const pageContent = buildPageContent(slug, page.title, page.textContent, page.images);
      if (pageContent.blocks.length > 0) {
        data.pageContents.push(pageContent);
      }
    }

    // Extract PDF links → bulletins
    for (const link of page.links) {
      if (/\.pdf$/i.test(link.href)) {
        data.bulletins.push({
          title: link.text || page.title || 'Bulletin',
          date: '',
          pdfUrl: link.href,
          images: [],
        });
      }
    }
  }

  // Collect all unique images for R2 upload
  data.images = [...new Set(allImages)];

  return data;
}

// ─── Build page content blocks ──────────────────────────────

function buildPageContent(
  slug: string,
  title: string,
  textContent: string,
  images: string[],
): ClassifiedPageContent {
  const blocks: ClassifiedPageContent['blocks'] = [];
  const text = textContent.slice(0, 2000);
  const firstImage = images[0] || '';

  switch (slug) {
    case 'about':
      blocks.push({
        blockType: 'church_intro',
        props: { title: title || '교회 소개', content: text, imageUrl: firstImage },
      });
      break;

    case 'pastor-greeting':
      blocks.push({
        blockType: 'pastor_message',
        props: { title: title || '담임목사 인사말', name: '', message: text, photoUrl: firstImage },
      });
      break;

    case 'vision':
      blocks.push({
        blockType: 'mission_vision',
        props: { title: title || '비전', content: text, imageUrl: firstImage },
      });
      break;

    case 'directions':
      blocks.push({
        blockType: 'location_map',
        props: { title: title || '오시는 길', address: extractAddress(textContent) },
      });
      blocks.push({
        blockType: 'contact_info',
        props: {
          title: '연락처',
          phone: extractPhone(textContent),
          address: extractAddress(textContent),
          email: extractEmail(textContent),
        },
      });
      break;

    case 'newcomer':
      blocks.push({
        blockType: 'newcomer_info',
        props: { title: title || '새가족 안내', content: text, imageUrl: firstImage },
      });
      break;

    case 'worship':
      // worship_times block — data will be in worshipTimes field, applied separately
      break;

    // Dynamic block pages — no static content to set
    case 'sermons':
    case 'bulletins':
    case 'columns':
    case 'albums':
    case 'events':
    case 'staff':
    case 'history':
      break;

    default:
      // Generic pages with content
      if (text.length > 50) {
        blocks.push({
          blockType: firstImage ? 'text_image' : 'text_only',
          props: { title: title || slug, content: text, ...(firstImage ? { imageUrl: firstImage } : {}) },
        });
      }
      break;
  }

  return { pageSlug: slug, blocks };
}
