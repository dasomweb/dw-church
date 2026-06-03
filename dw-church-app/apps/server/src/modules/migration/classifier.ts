/**
 * Classifier — thin pass-through (2026-06-03 refactor).
 *
 * User mandate ([[feedback_migration_ai_only]]): migration is AI-only.
 * No per-CMS branching, no rule-based regex patterns for content type
 * detection. The OLD classifier had ~500 lines of WP-REST routing,
 * KBoard merging, slug regex, etc. — all deleted.
 *
 * What this file does now:
 *   1. Seed churchInfo from <head> SEO/OG/JSON-LD (universal head data,
 *      not page-content classification — keeping it because it's
 *      free signal that every site has).
 *   2. Pre-fill data.images with image URLs the crawler already found,
 *      so the applier has a starting set for R2 upload.
 *   3. Return otherwise-empty ClassifiedData — the LLM classifier
 *      (llm-classifier.ts) fills everything else by reading each page
 *      and asking Gemini to classify + extract.
 */

import type {
  RawExtractedData,
  RawPage,
  ClassifiedData,
  ChurchInfo,
} from './types.js';
import { emptyClassifiedData } from './types.js';
import { extractVideoId, thumbnailUrl, extractYouTubeUrlsFromPage } from './extractors/youtube.js';

// ─── SEO → ChurchInfo (universal head data) ────────────────

function extractChurchInfoFromSeo(
  pages: { page: RawPage; isHome: boolean }[],
): Partial<ChurchInfo> {
  const out: Partial<ChurchInfo> = {};
  const ordered = [...pages].sort((a, b) => Number(b.isHome) - Number(a.isHome));

  const take = (key: keyof ChurchInfo, val: string | undefined | null) => {
    if (!val) return;
    const v = String(val).trim();
    if (!v) return;
    if (!out[key]) (out as Record<string, string>)[key] = v;
  };

  const cleanTitle = (t: string): string =>
    t.replace(/\s*[|–-]\s*[^|–-]{2,}$/, '').trim();

  for (const { page } of ordered) {
    const seo = page.seo;
    if (!seo) continue;

    take('name', seo.ldName);
    take('name', seo.ogSiteName);
    take('name', cleanTitle(seo.ogTitle) || cleanTitle(seo.titleTag));
    take('name', seo.metaAuthor);

    take('seoTitle', seo.ogTitle || seo.titleTag);
    take('seoDescription', seo.metaDescription || seo.ogDescription || seo.twitterDescription);
    take('seoKeywords', seo.metaKeywords);

    take('ogImageUrl', seo.ogImage || seo.twitterImage);
    take('logoUrl', seo.ldLogo || seo.appleTouchIconUrl || seo.faviconUrl);
    take('locale', seo.ogLocale);

    take('phone', seo.ldTelephone);
    take('email', seo.ldEmail);
    take('address', seo.ldAddress);

    take('description', seo.metaDescription || seo.ogDescription);

    const fullTitle = seo.ogTitle || seo.titleTag;
    const tailMatch = fullTitle.match(/\s*[|–-]\s*([^|–-]{2,80})$/);
    if (tailMatch) take('slogan', tailMatch[1]);
  }

  return out;
}

// ─── Main classifier (thin) ────────────────────────────────

export function classify(raw: RawExtractedData): ClassifiedData {
  const data = emptyClassifiedData();
  const baseUrl = raw.source.url ? new URL(raw.source.url).origin : '';

  // 1. Church info from <head> across all pages (highest-signal-first).
  const homeUrl = `${baseUrl}/`;
  const seoSeed = extractChurchInfoFromSeo(
    raw.pages.map((p) => ({
      page: p,
      isHome: p.url === baseUrl || p.url === homeUrl,
    })),
  );
  const ci = data.churchInfo as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(seoSeed)) {
    if (v && !ci[k]) ci[k] = v;
  }

  // 2. YouTube channel videos → sermons (independent of HTML pages —
  //    fed by the YouTube channel URL the operator entered).
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

  // 3. Embedded YouTube URLs found in page bodies → sermon candidates.
  //    Dedup by video id so we don't double-count.
  const seenVideoIds = new Set<string>();
  for (const s of data.sermons) {
    const id = extractVideoId(s.youtubeUrl);
    if (id) seenVideoIds.add(id);
  }
  for (const page of raw.pages) {
    const ytUrls = extractYouTubeUrlsFromPage(page.textContent, page.links);
    for (const ytUrl of ytUrls) {
      const id = extractVideoId(ytUrl);
      if (!id || seenVideoIds.has(id)) continue;
      seenVideoIds.add(id);
      data.sermons.push({
        title: '',
        scripture: '',
        preacher: '',
        date: '',
        youtubeUrl: ytUrl,
        thumbnailUrl: thumbnailUrl(id),
      });
    }
  }

  // 4. Pre-fill data.images with everything the crawler saw. The applier
  //    re-filters by `include` set, so this is harmless.
  const allImages: string[] = [];
  for (const page of raw.pages) {
    allImages.push(...page.images);
  }
  data.images = [...new Set(allImages)];

  // Everything else (page type classification, sermon/bulletin/staff
  // extraction, page-content blocks, worship times, history, menus) is
  // left empty — the LLM classifier fills it.
  return data;
}
