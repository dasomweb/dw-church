/**
 * Website scraper for church site migration.
 * Fetches pages, extracts structured data (sermons, staff, events, etc.)
 */

interface ScrapedPage {
  url: string;
  title: string;
  content: string;         // raw HTML body
  textContent: string;     // plain text
  images: string[];        // all image URLs
  links: { text: string; href: string }[];
}

export interface ScrapedSite {
  url: string;
  title: string;
  pages: ScrapedPage[];
  menu: { label: string; href: string; children: { label: string; href: string }[] }[];
}

export interface ExtractedData {
  churchInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    logoUrl: string;
  };
  sermons: {
    title: string;
    scripture: string;
    preacher: string;
    date: string;
    youtubeUrl: string;
    thumbnailUrl: string;
  }[];
  bulletins: {
    title: string;
    date: string;
    pdfUrl: string;
    images: string[];
  }[];
  albums: {
    title: string;
    images: string[];
    youtubeUrl: string;
  }[];
  columns: {
    title: string;
    content: string;
    imageUrl: string;
    youtubeUrl: string;
  }[];
  staff: {
    name: string;
    role: string;
    department: string;
    photoUrl: string;
    bio: string;
  }[];
  events: {
    title: string;
    description: string;
    date: string;
    location: string;
    imageUrl: string;
  }[];
  history: {
    year: string;
    month: string;
    title: string;
    description: string;
  }[];
  boards: {
    boardSlug: string;  // mission-letters, edu-infant, smallgroup, etc.
    posts: {
      title: string;
      content: string;
      author: string;
      date: string;
    }[];
  }[];
  pages: {
    title: string;
    slug: string;
    sections: {
      blockType: string;
      props: Record<string, unknown>;
    }[];
  }[];
  worshipTimes: {
    name: string;
    day: string;
    time: string;
    location: string;
  }[];
  images: string[];
}

/**
 * Fetch a page and extract basic info.
 */
export async function fetchPage(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DWChurch-Migration/1.0' },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const html = await res.text();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch?.[1]?.trim() ?? '';

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;

  // Extract plain text (strip tags)
  const textContent = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract images
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(bodyHtml)) !== null) {
    if (match[1] && !match[1].startsWith('data:')) {
      images.push(resolveUrl(url, match[1]));
    }
  }

  // Extract links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: { text: string; href: string }[] = [];
  while ((match = linkRegex.exec(bodyHtml)) !== null) {
    const href = match[1] ?? '';
    const text = (match[2] ?? '').replace(/<[^>]+>/g, '').trim();
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ text, href: resolveUrl(url, href) });
    }
  }

  return { url, title, content: bodyHtml, textContent, images, links };
}

/**
 * Scrape a site: fetch main page, discover nav links, fetch sub-pages.
 */
export async function scrapeSite(siteUrl: string, maxPages = 30): Promise<ScrapedSite> {
  const mainPage = await fetchPage(siteUrl);
  const baseUrl = new URL(siteUrl).origin;

  // Extract navigation menu from main page
  const menu = extractMenu(mainPage.content, baseUrl);

  // Collect all internal URLs from menu
  const urlsToFetch = new Set<string>();
  for (const item of menu) {
    if (item.href.startsWith(baseUrl)) urlsToFetch.add(item.href);
    for (const child of item.children) {
      if (child.href.startsWith(baseUrl)) urlsToFetch.add(child.href);
    }
  }

  // Also collect from main page links
  for (const link of mainPage.links) {
    if (link.href.startsWith(baseUrl) && urlsToFetch.size < maxPages) {
      urlsToFetch.add(link.href);
    }
  }

  // Remove the main page URL
  urlsToFetch.delete(siteUrl);
  urlsToFetch.delete(siteUrl + '/');

  // Fetch sub-pages (with rate limiting)
  const pages: ScrapedPage[] = [mainPage];
  for (const url of urlsToFetch) {
    if (pages.length >= maxPages) break;
    try {
      await sleep(500); // rate limit
      const page = await fetchPage(url);
      pages.push(page);
    } catch {
      // Skip failed pages
    }
  }

  return {
    url: siteUrl,
    title: mainPage.title,
    pages,
    menu,
  };
}

// ─── Helpers ─────────────────────────────────────────────

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

function extractMenu(html: string, baseUrl: string) {
  const menu: { label: string; href: string; children: { label: string; href: string }[] }[] = [];

  // Try to find nav element
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  if (!navMatch) return menu;

  const navHtml = navMatch[1] ?? '';

  // Extract top-level <li> with potential sub-menus
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(navHtml)) !== null) {
    const liContent = match[1] ?? '';
    const linkMatch = liContent.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href = resolveUrl(baseUrl, linkMatch[1] ?? '');
    const label = (linkMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
    if (!label) continue;

    // Check for sub-menu
    const children: { label: string; href: string }[] = [];
    const subMenuMatch = liContent.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (subMenuMatch) {
      const subLiRegex = /<li[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let subMatch;
      while ((subMatch = subLiRegex.exec(subMenuMatch[1] ?? '')) !== null) {
        const subHref = resolveUrl(baseUrl, subMatch[1] ?? '');
        const subLabel = (subMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
        if (subLabel) children.push({ label: subLabel, href: subHref });
      }
    }

    menu.push({ label, href, children });
  }

  return menu;
}
