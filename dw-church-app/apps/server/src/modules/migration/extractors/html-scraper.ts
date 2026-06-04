/**
 * HTML Scraper Extractor — fetches pages from a website and extracts text + images.
 * No CSS, no styles, no layout — only raw content.
 */

/**
 * HTML Scraper — generic crawler (no platform-specific paths).
 * See [[feedback_migration_ai_only]] — migration is AI-only, so this
 * file does ONE job: discover URLs + fetch raw text + image URLs +
 * head metadata. Nothing CMS-specific.
 */
import type { RawExtractedData, RawPage, RawPageSeo } from '../types.js';
import { emptyRawPageSeo } from '../types.js';

const USER_AGENT = 'TrueLight-Migration/2.0';

/**
 * Phase 12-γ.2 (2026-06-03) — SEO/head metadata extraction.
 * Captures every signal a downstream classifier could use to seed the
 * tenant's church_info + site_settings. All matchers are conservative
 * (return '' on no match) so a missing tag never throws.
 */
function extractSeoFromHead(html: string, pageUrl: string): RawPageSeo {
  const seo = emptyRawPageSeo();

  // <head>…</head>. If parsing fails we use the whole document — meta
  // tags before <body> still match.
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch?.[1] ?? html;

  seo.titleTag = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  // <meta name="…" content="…">  +  <meta content="…" name="…"> (order varies)
  const metaByName = (name: string): string => {
    const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i');
    return (head.match(re1)?.[1] ?? head.match(re2)?.[1] ?? '').trim();
  };
  const metaByProperty = (prop: string): string => {
    const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, 'i');
    return (head.match(re1)?.[1] ?? head.match(re2)?.[1] ?? '').trim();
  };

  seo.metaDescription = metaByName('description');
  seo.metaKeywords    = metaByName('keywords');
  seo.metaAuthor      = metaByName('author');
  seo.metaGenerator   = metaByName('generator');

  seo.ogTitle        = metaByProperty('og:title');
  seo.ogDescription  = metaByProperty('og:description');
  seo.ogImage        = metaByProperty('og:image');
  seo.ogUrl          = metaByProperty('og:url');
  seo.ogSiteName     = metaByProperty('og:site_name');
  seo.ogType         = metaByProperty('og:type');
  seo.ogLocale       = metaByProperty('og:locale');

  seo.twitterTitle       = metaByName('twitter:title')       || metaByProperty('twitter:title');
  seo.twitterDescription = metaByName('twitter:description') || metaByProperty('twitter:description');
  seo.twitterImage       = metaByName('twitter:image')       || metaByProperty('twitter:image');
  seo.twitterCard        = metaByName('twitter:card')        || metaByProperty('twitter:card');

  // <link rel="canonical|icon|apple-touch-icon" href="…">
  const linkByRel = (rel: string): string => {
    const re1 = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<link[^>]+href=["']([^"']*)["'][^>]+rel=["']${rel}["']`, 'i');
    return (head.match(re1)?.[1] ?? head.match(re2)?.[1] ?? '').trim();
  };
  seo.canonical          = resolveUrl(pageUrl, linkByRel('canonical'));
  const favHref          = linkByRel('shortcut icon') || linkByRel('icon');
  seo.faviconUrl         = favHref ? resolveUrl(pageUrl, favHref) : '';
  const appleHref        = linkByRel('apple-touch-icon');
  seo.appleTouchIconUrl  = appleHref ? resolveUrl(pageUrl, appleHref) : '';

  // WordPress signal — REST API discovery link or generator meta containing 'WordPress'.
  seo.isWordPress =
    /https:\/\/api\.w\.org\//i.test(head) ||
    /WordPress/i.test(seo.metaGenerator);

  // JSON-LD blocks. Iterate all <script type="application/ld+json">…</script>
  // and pull the first Organization/Church/LocalBusiness-shaped object.
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch: RegExpExecArray | null;
  while ((ldMatch = ldRegex.exec(head)) !== null) {
    const raw = (ldMatch[1] ?? '').trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed['@graph'] && Array.isArray(parsed['@graph'])
          ? parsed['@graph']
          : [parsed];
      for (const node of candidates) {
        if (!node || typeof node !== 'object') continue;
        const t = node['@type'];
        const types = Array.isArray(t) ? t.join(',') : String(t ?? '');
        if (!/Organization|Church|LocalBusiness|WebSite/i.test(types)) continue;
        if (node.name && !seo.ldName) seo.ldName = String(node.name);
        if (node.url && !seo.ldUrl) seo.ldUrl = String(node.url);
        if (node.logo && !seo.ldLogo) {
          seo.ldLogo = typeof node.logo === 'string' ? node.logo : String(node.logo?.url ?? '');
        }
        if (node.telephone && !seo.ldTelephone) seo.ldTelephone = String(node.telephone);
        if (node.email && !seo.ldEmail) seo.ldEmail = String(node.email);
        if (node.address && !seo.ldAddress) {
          if (typeof node.address === 'string') {
            seo.ldAddress = node.address;
          } else {
            const a = node.address;
            seo.ldAddress = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
              .filter(Boolean)
              .join(' ')
              .trim();
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip silently.
    }
  }

  return seo;
}

// ─── Fetch a single page ────────────────────────────────────

async function fetchPage(url: string): Promise<RawPage> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const html = await res.text();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';

  // SEO/head metadata — captured before body strip so we still see meta tags.
  const seo = extractSeoFromHead(html, url);

  // Extract body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;

  // Strip non-content elements, then strip all tags → plain text
  const cleanBody = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  const textContent = cleanBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract images (skip data: URIs, tiny icons)
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const images: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(cleanBody)) !== null) {
    const src = m[1] ?? '';
    if (!src.startsWith('data:') && src.length > 5) {
      images.push(resolveUrl(url, src));
    }
  }

  // Extract links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: { text: string; href: string }[] = [];
  while ((m = linkRegex.exec(bodyHtml)) !== null) {
    const href = m[1] ?? '';
    const text = (m[2] ?? '').replace(/<[^>]+>/g, '').trim();
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ text, href: resolveUrl(url, href) });
    }
  }

  return { url, title, textContent, images, links, seo };
}

// ─── Discover navigation links ──────────────────────────────

function discoverNavLinks(html: string, baseUrl: string): string[] {
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  if (!navMatch) return [];

  const urls = new Set<string>();
  const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(navMatch[1] ?? '')) !== null) {
    const href = resolveUrl(baseUrl, m[1] ?? '');
    if (href.startsWith(baseUrl)) urls.add(href);
  }
  return [...urls];
}

// ─── Main: Scrape entire site ───────────────────────────────

export async function extractFromHtml(
  siteUrl: string,
  maxPages = 30,
): Promise<RawExtractedData> {
  const mainPage = await fetchPage(siteUrl);
  const baseUrl = new URL(siteUrl).origin;

  // Discover internal pages from nav + main page links
  const bodyRes = await fetch(siteUrl, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
  const fullHtml = await bodyRes.text();
  const navUrls = discoverNavLinks(fullHtml, baseUrl);

  // Phase 12-γ.6 (2026-06-04) — diagnostic: surface crawler stats so we
  // can see why migration runs that should have 19 pages end up with 1.
  // Was silently swallowing per-page fetch failures in the loop below.
  console.log(`[crawler] mainPage.links=${mainPage.links.length}, navUrls=${navUrls.length}, mainPage.textContent.length=${mainPage.textContent.length}`);


  const urlsToFetch = new Set<string>(navUrls);
  for (const link of mainPage.links) {
    if (link.href.startsWith(baseUrl) && urlsToFetch.size < maxPages) {
      urlsToFetch.add(link.href);
    }
  }
  urlsToFetch.delete(siteUrl);
  urlsToFetch.delete(siteUrl + '/');

  // Fetch sub-pages with rate limiting
  const pages: RawPage[] = [mainPage];
  console.log(`[crawler] urlsToFetch=${urlsToFetch.size} candidates after dedup`);
  let fetched = 0;
  let failed = 0;
  for (const url of urlsToFetch) {
    if (pages.length >= maxPages) break;
    try {
      await sleep(500);
      const page = await fetchPage(url);
      pages.push(page);
      fetched++;
    } catch (err) {
      failed++;
      console.log(`[crawler] fetch failed: ${url} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`[crawler] total pages=${pages.length} (mainPage + ${fetched} sub-pages, ${failed} failed)`);

  return {
    source: {
      url: siteUrl,
      type: 'html',
      scrapedAt: new Date().toISOString(),
    },
    pages,
    youtubeVideos: [],
  };
}

// ─── Helpers ────────────────────────────────────────────────

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
