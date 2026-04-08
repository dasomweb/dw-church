/**
 * Maps WordPress REST API data to the ExtractedData format used by apply.ts.
 * Categorizes posts by their WP categories/custom post types into
 * sermons, bulletins, columns, events, boards, etc.
 */

import type { WPSiteData, WPPage, WPPost, WPMedia, WPCategory } from './wp-api.js';
import type { ExtractedData } from './scraper.js';

// ─── Category Detection Patterns ──────────────────────────

// Maps category slugs/names to our content types
const SERMON_PATTERNS = [
  'sermon', 'sermons', '설교', '주일설교', '수요설교', '말씀', 'message', 'messages',
];
const BULLETIN_PATTERNS = [
  'bulletin', 'bulletins', '주보', 'weekly-bulletin', 'church-bulletin',
];
const COLUMN_PATTERNS = [
  'column', 'columns', '칼럼', '목회칼럼', '담임목사칼럼', '목사님칼럼', 'pastoral-column',
];
const EVENT_PATTERNS = [
  'event', 'events', '행사', '이벤트', 'church-event',
];
const STAFF_PATTERNS = [
  'staff', '교역자', '사역자', '목사', 'pastor', 'pastors', 'leadership',
];
const HISTORY_PATTERNS = [
  'history', '연혁', '교회연혁', 'church-history', 'timeline',
];
const ALBUM_PATTERNS = [
  'album', 'albums', 'gallery', '앨범', '갤러리', '사진', 'photo', 'photos',
];

function matchesPatterns(value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase().trim();
  return patterns.some((p) => lower === p || lower.includes(p));
}

// ─── HTML Helpers ─────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImagesFromHtml(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1] && !match[1].startsWith('data:')) {
      images.push(match[1]);
    }
  }
  return images;
}

function extractYoutubeUrl(html: string): string {
  // Look for YouTube embeds or links
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/i,
    /youtube\.com\/embed\/([\w-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }
  return '';
}

function extractPdfUrl(html: string): string {
  const pdfMatch = html.match(/href=["']([^"']+\.pdf)["']/i);
  return pdfMatch?.[1] ?? '';
}

// ─── Build Category Lookup ────────────────────────────────

interface CategoryLookup {
  sermonIds: Set<number>;
  bulletinIds: Set<number>;
  columnIds: Set<number>;
  eventIds: Set<number>;
  staffIds: Set<number>;
  historyIds: Set<number>;
  albumIds: Set<number>;
  categoryNameById: Map<number, string>;
}

function buildCategoryLookup(categories: WPCategory[]): CategoryLookup {
  const lookup: CategoryLookup = {
    sermonIds: new Set(),
    bulletinIds: new Set(),
    columnIds: new Set(),
    eventIds: new Set(),
    staffIds: new Set(),
    historyIds: new Set(),
    albumIds: new Set(),
    categoryNameById: new Map(),
  };

  for (const cat of categories) {
    const nameSlug = `${cat.name} ${cat.slug}`;
    lookup.categoryNameById.set(cat.id, cat.name);

    if (matchesPatterns(nameSlug, SERMON_PATTERNS)) lookup.sermonIds.add(cat.id);
    else if (matchesPatterns(nameSlug, BULLETIN_PATTERNS)) lookup.bulletinIds.add(cat.id);
    else if (matchesPatterns(nameSlug, COLUMN_PATTERNS)) lookup.columnIds.add(cat.id);
    else if (matchesPatterns(nameSlug, EVENT_PATTERNS)) lookup.eventIds.add(cat.id);
    else if (matchesPatterns(nameSlug, STAFF_PATTERNS)) lookup.staffIds.add(cat.id);
    else if (matchesPatterns(nameSlug, HISTORY_PATTERNS)) lookup.historyIds.add(cat.id);
    else if (matchesPatterns(nameSlug, ALBUM_PATTERNS)) lookup.albumIds.add(cat.id);
  }

  return lookup;
}

// ─── Media Lookup ─────────────────────────────────────────

function buildMediaLookup(media: WPMedia[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of media) {
    map.set(m.id, m.source_url);
  }
  return map;
}

// ─── Post Classification ─────────────────────────────────

type PostType = 'sermon' | 'bulletin' | 'column' | 'event' | 'staff' | 'history' | 'album' | 'general';

function classifyPost(post: WPPost, catLookup: CategoryLookup): PostType {
  // Check custom post type first (set by fetchWPSiteData)
  const cpt = (post as unknown as Record<string, unknown>)._customPostType as string | undefined;
  if (cpt) {
    if (matchesPatterns(cpt, ['sermon', 'sermons'])) return 'sermon';
    if (matchesPatterns(cpt, ['staff'])) return 'staff';
    if (matchesPatterns(cpt, ['event', 'events'])) return 'event';
  }

  // Check categories
  const postCats = post.categories ?? [];
  for (const catId of postCats) {
    if (catLookup.sermonIds.has(catId)) return 'sermon';
    if (catLookup.bulletinIds.has(catId)) return 'bulletin';
    if (catLookup.columnIds.has(catId)) return 'column';
    if (catLookup.eventIds.has(catId)) return 'event';
    if (catLookup.staffIds.has(catId)) return 'staff';
    if (catLookup.historyIds.has(catId)) return 'history';
    if (catLookup.albumIds.has(catId)) return 'album';
  }

  // Check slug/title for Korean patterns
  const titleSlug = `${stripHtml(((post.title as any)?.rendered || post.title || ""))} ${post.slug}`;
  if (matchesPatterns(titleSlug, SERMON_PATTERNS)) return 'sermon';
  if (matchesPatterns(titleSlug, BULLETIN_PATTERNS)) return 'bulletin';
  if (matchesPatterns(titleSlug, COLUMN_PATTERNS)) return 'column';

  return 'general';
}

// ─── Page Block Type Detection ────────────────────────────

function detectPageBlockType(page: WPPage): string {
  const content = ((page.content as any)?.rendered || page.content || "");
  const slug = page.slug;
  const title = stripHtml(((page.title as any)?.rendered || page.title || ""));
  const combined = `${title} ${slug}`;

  // Detect specific page types by slug/title patterns
  if (matchesPatterns(combined, ['about', '소개', '교회소개', 'church-info'])) return 'text_only';
  if (matchesPatterns(combined, ['worship', '예배', '예배안내', '예배시간'])) return 'worship_times';
  if (matchesPatterns(combined, ['contact', '연락', '오시는길', '위치', 'location', 'directions'])) return 'map_section';
  if (matchesPatterns(combined, ['staff', '교역자', '사역자'])) return 'staff_grid';
  if (matchesPatterns(combined, HISTORY_PATTERNS)) return 'history_timeline';
  if (matchesPatterns(combined, ALBUM_PATTERNS)) return 'album_grid';

  // Detect by content analysis
  const images = extractImagesFromHtml(content);
  if (images.length > 5) return 'gallery_grid';

  return 'text_only';
}

// ─── Main Mapper ──────────────────────────────────────────

export function mapWPDataToExtracted(wpData: WPSiteData): ExtractedData {
  const catLookup = buildCategoryLookup(wpData.categories);
  const mediaLookup = buildMediaLookup(wpData.media);

  const result: ExtractedData = {
    churchInfo: {
      name: wpData.siteName,
      address: '',
      phone: '',
      email: '',
      description: '',
      logoUrl: '',
    },
    sermons: [],
    bulletins: [],
    albums: [],
    columns: [],
    staff: [],
    events: [],
    history: [],
    boards: [],
    pages: [],
    worshipTimes: [],
    images: [],
  };

  // ─── Collect all image URLs for later R2 upload ─────
  const allImageUrls = new Set<string>();
  for (const m of wpData.media) {
    allImageUrls.add(m.source_url);
  }

  // ─── Map Pages ──────────────────────────────────────
  for (const page of wpData.pages) {
    const blockType = detectPageBlockType(page);
    const content = ((page.content as any)?.rendered || page.content || "");
    const images = extractImagesFromHtml(content);
    images.forEach((img) => allImageUrls.add(img));

    const featuredUrl = page.featured_media ? (mediaLookup.get(page.featured_media) ?? '') : '';

    result.pages.push({
      title: stripHtml(((page.title as any)?.rendered || page.title || "")),
      slug: page.slug,
      sections: [
        {
          blockType: 'hero_banner',
          props: {
            title: stripHtml(((page.title as any)?.rendered || page.title || "")),
            backgroundImageUrl: featuredUrl,
          },
        },
        {
          blockType,
          props: {
            title: stripHtml(((page.title as any)?.rendered || page.title || "")),
            content: stripHtml(((page.content as any)?.rendered || page.content || "")),
            images,
          },
        },
      ],
    });
  }

  // ─── Classify and Map Posts ─────────────────────────
  const generalPosts: WPPost[] = [];

  for (const post of wpData.posts) {
    const type = classifyPost(post, catLookup);
    const content = ((post.content as any)?.rendered || post.content || "");
    const featuredUrl = post.featured_media ? (mediaLookup.get(post.featured_media) ?? '') : '';
    const images = extractImagesFromHtml(content);
    images.forEach((img) => allImageUrls.add(img));
    if (featuredUrl) allImageUrls.add(featuredUrl);

    switch (type) {
      case 'sermon': {
        const youtubeUrl = extractYoutubeUrl(content);
        result.sermons.push({
          title: stripHtml(((post.title as any)?.rendered || post.title || "")),
          scripture: '', // WP doesn't have a standard scripture field
          preacher: '',
          date: post.date ? post.date.split('T')[0] ?? '' : '',
          youtubeUrl,
          thumbnailUrl: featuredUrl,
        });
        break;
      }
      case 'bulletin': {
        const pdfUrl = extractPdfUrl(content);
        result.bulletins.push({
          title: stripHtml(((post.title as any)?.rendered || post.title || "")),
          date: post.date ? post.date.split('T')[0] ?? '' : '',
          pdfUrl,
          images,
        });
        break;
      }
      case 'column': {
        result.columns.push({
          title: stripHtml(((post.title as any)?.rendered || post.title || "")),
          content: stripHtml(content),
          imageUrl: featuredUrl || images[0] || '',
          youtubeUrl: extractYoutubeUrl(content),
        });
        break;
      }
      case 'event': {
        result.events.push({
          title: stripHtml(((post.title as any)?.rendered || post.title || "")),
          description: stripHtml(content),
          date: post.date ? post.date.split('T')[0] ?? '' : '',
          location: '',
          imageUrl: featuredUrl || images[0] || '',
        });
        break;
      }
      case 'staff': {
        result.staff.push({
          name: stripHtml(((post.title as any)?.rendered || post.title || "")),
          role: '',
          department: '',
          photoUrl: featuredUrl || images[0] || '',
          bio: stripHtml(content),
        });
        break;
      }
      case 'history': {
        // Try to extract year from date or title
        const dateStr = post.date ? post.date.split('T')[0] ?? '' : '';
        const year = dateStr.split('-')[0] ?? '';
        const month = dateStr.split('-')[1] ?? '';
        result.history.push({
          year,
          month,
          title: stripHtml(((post.title as any)?.rendered || post.title || "")),
          description: stripHtml(content),
        });
        break;
      }
      case 'album': {
        result.albums.push({
          title: stripHtml(((post.title as any)?.rendered || post.title || "")),
          images,
          youtubeUrl: extractYoutubeUrl(content),
        });
        break;
      }
      default:
        generalPosts.push(post);
    }
  }

  // ─── General posts → boards ─────────────────────────
  if (generalPosts.length > 0) {
    // Group by their first category, or use 'general'
    const boardMap = new Map<string, { title: string; content: string; author: string; date: string }[]>();

    for (const post of generalPosts) {
      const firstCatId = post.categories?.[0];
      const boardSlug = firstCatId
        ? (catLookup.categoryNameById.get(firstCatId) ?? 'general')
        : 'general';

      if (!boardMap.has(boardSlug)) {
        boardMap.set(boardSlug, []);
      }
      boardMap.get(boardSlug)!.push({
        title: stripHtml(((post.title as any)?.rendered || post.title || "")),
        content: stripHtml(((post.content as any)?.rendered || post.content || "")),
        author: '',
        date: post.date ? post.date.split('T')[0] ?? '' : '',
      });
    }

    for (const [boardSlug, posts] of boardMap) {
      result.boards.push({ boardSlug, posts });
    }
  }

  // ─── All image URLs ─────────────────────────────────
  result.images = Array.from(allImageUrls);

  return result;
}

// ─── Summary Generator ───────────────────────────────────

export interface MigrationSummary {
  pages: number;
  posts: number;
  sermons: number;
  bulletins: number;
  columns: number;
  events: number;
  staff: number;
  albums: number;
  history: number;
  boards: number;
  boardPosts: number;
  images: number;
  worshipTimes: number;
}

export function generateSummary(data: ExtractedData): MigrationSummary {
  return {
    pages: data.pages.length,
    posts: data.sermons.length + data.bulletins.length + data.columns.length +
           data.events.length + data.boards.reduce((sum, b) => sum + b.posts.length, 0),
    sermons: data.sermons.length,
    bulletins: data.bulletins.length,
    columns: data.columns.length,
    events: data.events.length,
    staff: data.staff.length,
    albums: data.albums.length,
    history: data.history.length,
    boards: data.boards.length,
    boardPosts: data.boards.reduce((sum, b) => sum + b.posts.length, 0),
    images: data.images.length,
    worshipTimes: data.worshipTimes.length,
  };
}
