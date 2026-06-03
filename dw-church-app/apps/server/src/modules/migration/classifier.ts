/**
 * Classifier — maps raw extracted data (text + images) to our data structure.
 * Uses rule-based pattern matching (hybrid approach: rules first, AI later).
 * See MIGRATION.md §5 for classification logic.
 */

import type {
  RawExtractedData,
  RawPage,
  ClassifiedData,
  ChurchInfo,
  ClassifiedWorshipTime,
  ClassifiedHistoryItem,
  ClassifiedPageContent,
  ClassifiedStaff,
  ClassifiedEvent,
  ClassifiedAlbum,
  ClassifiedColumn,
  ClassifiedBoard,
  ClassifiedBoardPost,
  ClassifiedMenu,
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

/**
 * Phase 12-γ (2026-06-03) — extractors for the 6 content types that
 * the original WordPress-era classifier left unfilled. All are
 * conservative pattern-based: when the page text doesn't clearly look
 * like the target type, return [] so Phase 12-β LLM classifier can take
 * over without double-counting.
 */

/**
 * Staff (교역자) — extract from a staff/leader page. Patterns: a list of
 * people, each with name + role + optional photo. Korean church sites
 * usually mark roles with 목사/전도사/장로/권사/집사. The text gets fed
 * here line-by-line; we look for "이름 직책" or "직책 이름" patterns.
 */
function extractStaffItems(page: RawPage): ClassifiedStaff[] {
  const items: ClassifiedStaff[] = [];
  const ROLES = /(담임\s*목사|부\s*목사|전도사|장로|권사|집사|간사|선교사|사역자|director|pastor|elder|deacon|minister)/i;
  const lines = page.textContent.split(/[.\n,]/);
  for (const raw of lines) {
    const t = raw.trim();
    if (t.length < 4 || t.length > 80) continue;
    if (!ROLES.test(t)) continue;
    // Try to split "name role" or "role name".
    const m = t.match(/^([가-힣A-Za-z\s]{2,20})\s+(.{2,30})$/) ||
              t.match(/^(.{2,30})\s+([가-힣A-Za-z\s]{2,20})$/);
    if (!m) continue;
    const a = m[1]?.trim() || '';
    const b = m[2]?.trim() || '';
    // Heuristic: shorter side is the name, longer + role keyword is the role.
    const [name, role] = ROLES.test(a) ? [b, a] : [a, b];
    if (!name || !role) continue;
    items.push({ name, role, department: '', photoUrl: '', bio: '' });
    if (items.length >= 30) break;
  }
  return items;
}

/**
 * Events (행사) — title + date + (optional) description. We look at
 * the event/news page links — each link's text becomes the title, and
 * any nearby date pattern (YYYY-MM-DD, YYYY.MM.DD, YYYY년 MM월 DD일)
 * becomes the date.
 */
function extractEvents(page: RawPage): ClassifiedEvent[] {
  const items: ClassifiedEvent[] = [];
  const DATE = /(\d{4})[-./년]\s*(\d{1,2})[-./월]\s*(\d{1,2})/;
  // Each link with a date-looking neighbour in the text becomes an event.
  for (const link of page.links) {
    const title = link.text.trim();
    if (title.length < 4 || title.length > 100) continue;
    const window = page.textContent.indexOf(title);
    if (window < 0) continue;
    const surrounding = page.textContent.slice(Math.max(0, window - 60), window + title.length + 60);
    const dm = surrounding.match(DATE);
    const date = dm ? `${dm[1]}-${(dm[2] ?? '').padStart(2, '0')}-${(dm[3] ?? '').padStart(2, '0')}` : '';
    if (!date && !/event|notice|행사|소식|announcement/i.test(title)) continue;
    items.push({ title, description: '', date, location: '', imageUrl: '' });
    if (items.length >= 50) break;
  }
  return items;
}

/**
 * Albums (앨범) — gallery pages: group page images into a single
 * album bearing the page title. If the page has fewer than 3 images,
 * skip — that's probably not a gallery, just decorative photos.
 */
function extractAlbums(page: RawPage): ClassifiedAlbum[] {
  if (page.images.length < 3) return [];
  return [{
    title: page.title || '갤러리',
    images: page.images.slice(0, 50),
    youtubeUrl: '',
  }];
}

/**
 * Columns (목회칼럼) — find blog-post-style content. Each link from a
 * columns page becomes a candidate column with title + leading text.
 * Body text isn't fetched here (would need a second-pass crawl per
 * column URL); this records titles + first image so the operator can
 * fill content later, or the LLM phase can scrape per-column.
 */
function extractColumnsPosts(page: RawPage): ClassifiedColumn[] {
  const items: ClassifiedColumn[] = [];
  for (const link of page.links) {
    const title = link.text.trim();
    if (title.length < 5 || title.length > 200) continue;
    if (!/column|pastoral|devotion|message|칼럼|기고/i.test(link.href + ' ' + title)) continue;
    items.push({
      title,
      content: '',  // Body fetched in separate per-column scrape (LLM phase).
      topImageUrl: page.images[items.length] || '',
      youtubeUrl: '',
    });
    if (items.length >= 100) break;
  }
  return items;
}

/**
 * Boards (게시판) + posts — when a page's slug looks like a board
 * (notices / community / Q&A), treat each link as a post. Unlike
 * columns this assumes one board per page and collects all matching
 * links as its posts.
 */
function extractBoardFromPage(page: RawPage, boardSlug: string): ClassifiedBoard | null {
  const posts: ClassifiedBoardPost[] = [];
  const DATE_RE = /(\d{4}[-./]\d{1,2}[-./]\d{1,2})/;
  for (const link of page.links) {
    const title = link.text.trim();
    if (title.length < 5 || title.length > 200) continue;
    // Skip nav / footer noise.
    if (/^(home|about|contact|menu|로그인|회원가입|이전|다음)$/i.test(title)) continue;
    const dateMatch = page.textContent.slice(
      Math.max(0, page.textContent.indexOf(title) - 80),
      page.textContent.indexOf(title) + title.length + 80,
    ).match(DATE_RE);
    posts.push({
      title,
      content: '',  // Per-post body fetched in LLM phase.
      author: '',
      date: dateMatch ? (dateMatch[1] ?? '').replace(/[./]/g, '-') : '',
    });
    if (posts.length >= 200) break;
  }
  if (posts.length === 0) return null;
  return {
    boardSlug,
    boardTitle: page.title || boardSlug,
    posts,
  };
}

/**
 * Menus — flatten the site's top-level nav. The slug field is
 * resolved by `mapSlug` against the link href; entries that map to a
 * known slug enter the tenant menu, anything else is treated as an
 * external link or skipped.
 */
function extractMenusFromPage(page: RawPage, siteBaseUrl: string): ClassifiedMenu[] {
  const out: ClassifiedMenu[] = [];
  let order = 0;
  for (const link of page.links) {
    const label = link.text.trim();
    if (label.length < 2 || label.length > 30) continue;
    // Only internal links.
    if (siteBaseUrl && !link.href.startsWith(siteBaseUrl)) continue;
    const slug = mapSlug(link.href, siteBaseUrl);
    if (!slug) continue;
    // Dedup by slug.
    if (out.some((m) => m.pageSlug === slug)) continue;
    out.push({
      label,
      pageSlug: slug,
      parentLabel: null,
      sortOrder: order++,
    });
    if (out.length >= 20) break;
  }
  return out;
}

/**
 * Phase 12-γ.2 (2026-06-03) — SEO → ChurchInfo mapping.
 *
 * Reads RawPageSeo (head metadata) from the home page and seeds
 * churchInfo with title/description/og:image/JSON-LD signals. Other
 * pages can also contribute (e.g. an Organization JSON-LD might only
 * exist on /about), so we accept an array and merge with first-wins
 * semantics — the home page is checked first.
 *
 * See [[project_migration_seo_extraction]] for motivation.
 */
function extractChurchInfoFromSeo(
  pages: { page: RawPage; isHome: boolean }[],
): Partial<ChurchInfo> {
  const out: Partial<ChurchInfo> = {};
  // Home page first, then the rest in document order. First non-empty
  // value wins per field — keeps signals from the home page (highest
  // signal-to-noise) ahead of deep pages.
  const ordered = [...pages].sort((a, b) => Number(b.isHome) - Number(a.isHome));

  const take = (key: keyof ChurchInfo, val: string | undefined | null) => {
    if (!val) return;
    const v = String(val).trim();
    if (!v) return;
    if (!out[key]) (out as Record<string, string>)[key] = v;
  };

  // Clean up a title: drop " | Site Name" / " - Subtitle" suffixes.
  const cleanTitle = (t: string): string =>
    t.replace(/\s*[|–-]\s*[^|–-]{2,}$/, '').trim();

  for (const { page } of ordered) {
    const seo = page.seo;
    if (!seo) continue;

    // Church name candidates (priority: ldName > ogSiteName > clean title > meta author).
    take('name', seo.ldName);
    take('name', seo.ogSiteName);
    take('name', cleanTitle(seo.ogTitle) || cleanTitle(seo.titleTag));
    take('name', seo.metaAuthor);

    // SEO fields.
    take('seoTitle', seo.ogTitle || seo.titleTag);
    take('seoDescription', seo.metaDescription || seo.ogDescription || seo.twitterDescription);
    take('seoKeywords', seo.metaKeywords);

    // Visual / branding.
    take('ogImageUrl', seo.ogImage || seo.twitterImage);
    take('logoUrl', seo.ldLogo || seo.appleTouchIconUrl || seo.faviconUrl);
    take('locale', seo.ogLocale);

    // Contact (JSON-LD is more reliable than text scrape).
    take('phone', seo.ldTelephone);
    take('email', seo.ldEmail);
    take('address', seo.ldAddress);

    // Description fallback for greeting blocks.
    take('description', seo.metaDescription || seo.ogDescription);

    // Slogan candidate: the part of title that got stripped off in
    // cleanTitle (e.g. "선한교회 - 사랑이 흐르는 교회" → slogan
    // "사랑이 흐르는 교회").
    const fullTitle = seo.ogTitle || seo.titleTag;
    const tailMatch = fullTitle.match(/\s*[|–-]\s*([^|–-]{2,80})$/);
    if (tailMatch) take('slogan', tailMatch[1]);
  }

  return out;
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

  // ── Phase 12-γ.2: harvest SEO/head metadata across pages → churchInfo.
  //    Done BEFORE per-page text scraping so JSON-LD-sourced phone/email/
  //    address (high-signal) wins over body-text regex (low-signal).
  const homeUrl = `${baseUrl}/`;
  const seoSeed = extractChurchInfoFromSeo(
    raw.pages.map((p) => ({
      page: p,
      isHome: p.url === baseUrl || p.url === homeUrl || mapSlug(p.url, baseUrl) === 'home',
    })),
  );
  // Merge — only fill fields the seed actually provided. emptyClassifiedData()
  // gave us '' defaults; SEO overrides empties only.
  const ci = data.churchInfo as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(seoSeed)) {
    if (v && !ci[k]) ci[k] = v;
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

    // Phase 12-γ: type-specific extraction for the 6 previously-missing
    // content types. Each is gated on the page slug so we only run the
    // (relatively expensive) per-page heuristics where they're likely
    // to find something.

    if (slug === 'staff') {
      const staff = extractStaffItems(page);
      if (staff.length > 0) data.staff.push(...staff);
    }

    if (slug === 'events') {
      const events = extractEvents(page);
      if (events.length > 0) data.events.push(...events);
    }

    if (slug === 'albums') {
      const albums = extractAlbums(page);
      if (albums.length > 0) data.albums.push(...albums);
    }

    if (slug === 'columns') {
      const cols = extractColumnsPosts(page);
      if (cols.length > 0) data.columns.push(...cols);
    }

    // Boards — any page whose slug doesn't match a known content type
    // but whose links look like a board (many same-style posts) is
    // treated as a generic board. For now we only handle "events" /
    // generic "notice" pages explicitly to avoid scooping every page.
    if (!slug || slug === 'events') {
      // Use the events page also as a "notice" board candidate when
      // the URL hints at it.
      const looksLikeBoard = /board|notice|bbs|community|qna|게시판/i.test(page.url);
      if (looksLikeBoard) {
        const boardSlug = page.url.split('/').filter(Boolean).pop() || 'board';
        const board = extractBoardFromPage(page, boardSlug);
        if (board) data.boards.push(board);
      }
    }

    // Menus accumulated from the home page only — that's where the
    // canonical site nav lives. Subsequent pages would just emit their
    // own page-internal sidebar links and pollute the menu.
    if (slug === 'home') {
      data.menus = extractMenusFromPage(page, baseUrl);
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
