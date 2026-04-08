/**
 * Maps AI-analyzed pages to ExtractedData format and suggests page matching
 * between source site pages and target tenant pages.
 */

import type { AnalyzedPage, PageCategory } from './ai-analyzer.js';
import type { ExtractedData } from './scraper.js';

// ─── Types ────────────────────────────────────────────────

export interface PageMatch {
  sourceUrl: string;
  sourceTitle: string;
  targetPageId: string | null;  // null = create new page
  targetPageTitle: string;
  targetPageSlug: string;
  confidence: number;
  blocks: { blockType: string; props: Record<string, unknown> }[];
}

export interface TenantPage {
  id: string;
  title: string;
  slug: string;
}

// ─── Slug Matching Patterns ───────────────────────────────
// Maps our page categories to common tenant page slugs

const CATEGORY_SLUG_MAP: Record<PageCategory, string[]> = {
  about: ['about', 'church-info', 'greeting'],
  vision: ['vision', 'mission'],
  history: ['history'],
  staff: ['staff', 'pastors', 'leadership'],
  directions: ['directions', 'location', 'map'],
  contact: ['contact'],
  worship: ['worship'],
  sermons: ['sermons'],
  bulletins: ['bulletins'],
  columns: ['columns'],
  albums: ['albums', 'gallery', 'photos'],
  events: ['events'],
  news: ['news', 'notices'],
  board: ['board', 'community'],
  education: ['education'],
  mission: ['mission', 'outreach'],
  newcomer: ['newcomer', 'welcome'],
  other: [],
};

// ─── Map Analyzed Pages → ExtractedData ────────────────────

export function mapAnalyzedToExtracted(analyzed: AnalyzedPage[]): ExtractedData {
  const result: ExtractedData = {
    churchInfo: { name: '', address: '', phone: '', email: '', description: '', logoUrl: '' },
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

  const allImages = new Set<string>();

  for (const page of analyzed) {
    const ec = page.extractedContent;

    // Collect images from all pages
    if (ec.images) {
      ec.images.forEach((img) => allImages.add(img));
    }

    switch (page.category) {
      case 'sermons': {
        if (ec.sermons && ec.sermons.length > 0) {
          for (const s of ec.sermons) {
            result.sermons.push({
              title: s.title || '',
              scripture: s.scripture || '',
              preacher: '',
              date: s.date || '',
              youtubeUrl: s.youtubeUrl || '',
              thumbnailUrl: '',
            });
          }
        }
        break;
      }

      case 'staff': {
        if (ec.staffMembers && ec.staffMembers.length > 0) {
          for (const s of ec.staffMembers) {
            result.staff.push({
              name: s.name || '',
              role: s.role || '',
              department: '',
              photoUrl: s.photoUrl || '',
              bio: s.bio || '',
            });
          }
        }
        break;
      }

      case 'events': {
        if (ec.events && ec.events.length > 0) {
          for (const e of ec.events) {
            result.events.push({
              title: e.title || '',
              description: e.description || '',
              date: e.date || '',
              location: '',
              imageUrl: '',
            });
          }
        }
        break;
      }

      case 'worship': {
        // Extract worship times from tables if available
        if (ec.tables && ec.tables.length > 0) {
          for (const table of ec.tables) {
            for (const row of table.rows) {
              // Assume: [name/time, day, time, location] or similar
              result.worshipTimes.push({
                name: row[0] || '',
                day: row[1] || '',
                time: row[2] || row[1] || '',
                location: row[3] || '',
              });
            }
          }
        }
        // Also add as a static page
        result.pages.push({
          title: page.title,
          slug: 'worship',
          sections: page.suggestedBlocks.map((b) => ({
            blockType: b.blockType,
            props: b.props,
          })),
        });
        break;
      }

      case 'history': {
        // Extract history from text content
        result.pages.push({
          title: page.title,
          slug: 'history',
          sections: page.suggestedBlocks.map((b) => ({
            blockType: b.blockType,
            props: b.props,
          })),
        });
        break;
      }

      case 'albums': {
        if (ec.images && ec.images.length > 0) {
          result.albums.push({
            title: page.title,
            images: ec.images,
            youtubeUrl: '',
          });
        }
        break;
      }

      case 'news':
      case 'board': {
        // Add as board posts if text content available
        if (ec.textContent) {
          result.boards.push({
            boardSlug: page.category === 'news' ? 'notices' : 'general',
            posts: [{
              title: page.title,
              content: ec.textContent,
              author: '',
              date: '',
            }],
          });
        }
        break;
      }

      default: {
        // Static pages: about, vision, directions, contact, education, mission, newcomer, other
        const slugMap: Partial<Record<PageCategory, string>> = {
          about: 'about',
          vision: 'vision',
          directions: 'directions',
          contact: 'contact',
          education: 'education',
          mission: 'mission',
          newcomer: 'newcomer',
        };
        const slug = slugMap[page.category] || slugFromUrl(page.url);

        result.pages.push({
          title: page.title,
          slug,
          sections: page.suggestedBlocks.map((b) => ({
            blockType: b.blockType,
            props: b.props,
          })),
        });
      }
    }
  }

  result.images = Array.from(allImages);

  // Try to extract church name from the about page or first page
  const aboutPage = analyzed.find((p) => p.category === 'about');
  if (aboutPage) {
    result.churchInfo.name = aboutPage.extractedContent.title || aboutPage.title;
    result.churchInfo.description = aboutPage.extractedContent.textContent?.slice(0, 300) || '';
  } else if (analyzed.length > 0) {
    // Use main page title as church name
    const mainTitle = analyzed[0]!.title;
    result.churchInfo.name = mainTitle;
  }

  return result;
}

// ─── Page Matching ────────────────────────────────────────

export function suggestPageMatching(
  analyzed: AnalyzedPage[],
  tenantPages: TenantPage[],
): PageMatch[] {
  const matches: PageMatch[] = [];
  const usedTargetIds = new Set<string>();

  for (const page of analyzed) {
    // Find best matching tenant page by category → slug patterns
    const candidateSlugs = CATEGORY_SLUG_MAP[page.category] || [];
    let bestMatch: TenantPage | null = null;
    let bestScore = 0;

    for (const tp of tenantPages) {
      if (usedTargetIds.has(tp.id)) continue;

      let score = 0;

      // Exact slug match
      if (candidateSlugs.includes(tp.slug)) {
        score = 0.9;
      }
      // Partial slug match
      else if (candidateSlugs.some((s) => tp.slug.includes(s) || s.includes(tp.slug))) {
        score = 0.7;
      }
      // Title similarity (simple keyword match)
      else {
        const titleLower = tp.title.toLowerCase();
        const pageTitleLower = page.title.toLowerCase();
        if (titleLower === pageTitleLower) {
          score = 0.85;
        } else if (titleLower.includes(pageTitleLower) || pageTitleLower.includes(titleLower)) {
          score = 0.6;
        }
        // Korean title keyword matching
        const koreanPatterns = getCategoryKoreanKeywords(page.category);
        if (koreanPatterns.some((k) => tp.title.includes(k) || tp.slug.includes(k))) {
          score = Math.max(score, 0.75);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = tp;
      }
    }

    // Build page match entry
    const matchConfidence = bestMatch ? bestScore * page.confidence : 0;

    if (bestMatch && matchConfidence >= 0.4) {
      usedTargetIds.add(bestMatch.id);
      matches.push({
        sourceUrl: page.url,
        sourceTitle: page.title,
        targetPageId: bestMatch.id,
        targetPageTitle: bestMatch.title,
        targetPageSlug: bestMatch.slug,
        confidence: matchConfidence,
        blocks: page.suggestedBlocks,
      });
    } else {
      // No good match — suggest creating a new page
      const slug = slugFromUrl(page.url);
      matches.push({
        sourceUrl: page.url,
        sourceTitle: page.title,
        targetPageId: null,
        targetPageTitle: page.title,
        targetPageSlug: slug,
        confidence: page.confidence * 0.5,
        blocks: page.suggestedBlocks,
      });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

// ─── Helpers ──────────────────────────────────────────────

function slugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-') || 'home';
    return slug.toLowerCase();
  } catch {
    return 'page';
  }
}

function getCategoryKoreanKeywords(category: PageCategory): string[] {
  const map: Record<PageCategory, string[]> = {
    about: ['소개', '교회소개', '인사말'],
    vision: ['비전', '사명'],
    history: ['연혁', '교회연혁'],
    staff: ['교역자', '사역자', '목사'],
    directions: ['오시는길', '위치', '약도'],
    contact: ['연락', '문의'],
    worship: ['예배', '예배안내', '예배시간'],
    sermons: ['설교', '말씀'],
    bulletins: ['주보'],
    columns: ['칼럼', '목회칼럼'],
    albums: ['앨범', '갤러리', '사진'],
    events: ['행사', '이벤트'],
    news: ['소식', '공지', '새소식'],
    board: ['게시판', '나눔'],
    education: ['교육', '주일학교'],
    mission: ['선교'],
    newcomer: ['새가족', '새신자'],
    other: [],
  };
  return map[category] || [];
}
