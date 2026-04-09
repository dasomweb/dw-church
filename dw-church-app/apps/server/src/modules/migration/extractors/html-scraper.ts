/**
 * HTML Scraper Extractor — fetches pages from a website and extracts text + images.
 * No CSS, no styles, no layout — only raw content.
 */

import type { RawExtractedData, RawPage } from '../types.js';

const USER_AGENT = 'TrueLight-Migration/2.0';

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

  return { url, title, textContent, images, links };
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
  for (const url of urlsToFetch) {
    if (pages.length >= maxPages) break;
    try {
      await sleep(500);
      const page = await fetchPage(url);
      pages.push(page);
    } catch {
      // Skip failed pages
    }
  }

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
