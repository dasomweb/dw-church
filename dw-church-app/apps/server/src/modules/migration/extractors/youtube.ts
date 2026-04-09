/**
 * YouTube Extractor — extracts video list from a YouTube channel.
 * Uses YouTube oEmbed API (no API key required for basic info).
 * For channel listing, scrapes the channel page HTML.
 */

import type { RawYouTubeVideo } from '../types.js';

const USER_AGENT = 'TrueLight-Migration/2.0';

/**
 * Extract video ID from various YouTube URL formats.
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/v\/([\w-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Generate thumbnail URL from video ID.
 */
export function thumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Fetch video info via oEmbed (no API key needed).
 */
async function fetchVideoInfo(videoId: string): Promise<{ title: string; date: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return null;
    const data = await res.json() as { title?: string };
    return { title: data.title || '', date: '' };
  } catch {
    return null;
  }
}

/**
 * Extract YouTube video URLs from a page's HTML or links.
 * Looks for embedded iframes and anchor links containing YouTube URLs.
 */
export function extractYouTubeUrlsFromPage(
  textContent: string,
  links: { text: string; href: string }[],
): string[] {
  const videoIds = new Set<string>();

  // From links
  for (const link of links) {
    const id = extractVideoId(link.href);
    if (id) videoIds.add(id);
  }

  // From text content (embedded URLs)
  const urlRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(textContent)) !== null) {
    if (m[1]) videoIds.add(m[1]);
  }

  return [...videoIds].map((id) => `https://www.youtube.com/watch?v=${id}`);
}

/**
 * Extract videos from a YouTube channel page by scraping.
 * Fetches channel HTML and extracts video IDs.
 * Assumption: YouTube channel URLs follow /channel/ID, /@handle, or /c/name patterns.
 */
export async function extractFromYouTubeChannel(
  channelUrl: string,
  maxVideos = 100,
): Promise<RawYouTubeVideo[]> {
  const videos: RawYouTubeVideo[] = [];

  try {
    // Fetch the channel videos page
    const videosUrl = channelUrl.replace(/\/$/, '') + '/videos';
    const res = await fetch(videosUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) return videos;

    const html = await res.text();

    // Extract video IDs from the page source (they appear in JSON data)
    const videoIdRegex = /"videoId":"([\w-]{11})"/g;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;

    while ((m = videoIdRegex.exec(html)) !== null && seen.size < maxVideos) {
      const videoId = m[1]!;
      if (seen.has(videoId)) continue;
      seen.add(videoId);

      // Fetch title via oEmbed
      const info = await fetchVideoInfo(videoId);
      await sleep(200); // Rate limit oEmbed calls

      videos.push({
        title: info?.title || `Video ${videoId}`,
        videoId,
        date: info?.date || '',
        thumbnailUrl: thumbnailUrl(videoId),
      });
    }
  } catch {
    // Channel scraping failed — return what we have
  }

  return videos;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
