/**
 * WordPress WXR (eXtended RSS) extractor. Turns a WordPress export .xml file
 * into the same RawExtractedData shape the crawl pipeline produces, so the
 * existing classify() + applyAll() downstream (content mapping + R2 image
 * migration) is reused verbatim. This sources content from the operator's
 * uploaded export instead of crawling — sidestepping the WAF egress block that
 * stops the URL crawler.
 *
 * Regex/string parsing (the codebase has no XML parser dep and WXR is
 * machine-generated, so it's stable). CDATA-wrapped fields are unwrapped.
 */
import type { RawExtractedData, RawPage } from '../types.js';
import { emptyRawPageSeo } from '../types.js';

function unwrapCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1]! : s).trim();
}

/** First `<name>…</name>` in a block, CDATA-unwrapped. Name may be namespaced
 *  (e.g. wp:post_type, content:encoded) — the ':' is matched literally. */
function firstTag(block: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? unwrapCdata(m[1]!) : '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

/** HTML → plain text, preserving paragraph/line breaks so the imported copy
 *  keeps its structure when rendered as a text block. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\s*(br|hr)\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** All image URLs referenced by <img src>/<img data-src> in an HTML string. */
export function imagesFromHtml(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<img[^>]+(?:data-)?src=["']([^"']+)["']/gi)) {
    const url = m[1]!.trim();
    if (url && !url.startsWith('data:')) out.add(url);
  }
  return [...out];
}

/**
 * Parse a WXR export into RawExtractedData. Imports published/draft `page` and
 * `post` items (skips nav_menu_item / attachment as page content — embedded
 * images are captured from each item's HTML and migrated by the image applier).
 */
export function parseWxr(xml: string): RawExtractedData {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const pages: RawPage[] = [];

  for (const item of items) {
    const type = firstTag(item, 'wp:post_type').toLowerCase();
    if (type !== 'page' && type !== 'post') continue;
    const status = firstTag(item, 'wp:status').toLowerCase();
    if (status && status !== 'publish' && status !== 'draft') continue; // skip trash/private/auto-draft

    const title = decodeEntities(firstTag(item, 'title'));
    const contentHtml = firstTag(item, 'content:encoded');
    if (!title && !contentHtml.trim()) continue;

    const link = firstTag(item, 'link') || firstTag(item, 'guid');
    pages.push({
      url: link,
      title,
      textContent: htmlToText(contentHtml),
      images: imagesFromHtml(contentHtml),
      links: [],
      seo: emptyRawPageSeo(),
    });
  }

  return {
    source: { url: 'wxr-upload', type: 'manual', scrapedAt: new Date().toISOString() },
    pages,
    youtubeVideos: [],
  };
}
