/**
 * Platform Detector — Phase 12-γ.2 (2026-06-03).
 *
 * Registry-based detection of the source site's CMS / site builder.
 * Each detector returns a confidence score 0..1; the highest wins.
 *
 * Adding a new platform = appending one entry to PLATFORMS. The detector
 * never throws — unknown sites fall through to platform = 'unknown'.
 *
 * Why a registry (not if/else): we need to support an open-ended set of
 * Korean church CMSes (교회사랑넷, 365church, Asia Church Network, …) plus
 * generic builders (WordPress, Wix, Squarespace, Webflow, Imweb, Modoo,
 * Cafe24, Tistory, …). See [[project_migration_source_platforms]].
 */

export interface PlatformDetection {
  platform: string;
  confidence: number;
}

type Detector = (input: { html: string; url: string; headers: Headers }) => number;

interface PlatformEntry {
  id: string;
  detect: Detector;
}

const PLATFORMS: PlatformEntry[] = [
  // ── WordPress (often + Yoast SEO). Very high-signal detection. ──
  {
    id: 'wordpress',
    detect: ({ html }) => {
      let score = 0;
      if (/<link[^>]+rel=["']https:\/\/api\.w\.org\/["']/i.test(html)) score += 0.6;
      if (/<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*WordPress/i.test(html)) score += 0.4;
      if (/\/wp-content\//i.test(html)) score += 0.3;
      if (/\/wp-includes\//i.test(html)) score += 0.2;
      return Math.min(score, 1);
    },
  },

  // ── Wix ──
  {
    id: 'wix',
    detect: ({ html, url }) => {
      let score = 0;
      if (/<meta[^>]+name=["']generator["'][^>]+content=["']Wix[^"']*/i.test(html)) score += 0.6;
      if (/<meta[^>]+name=["']application-name["'][^>]+content=["']Wix/i.test(html)) score += 0.3;
      if (/static\.wixstatic\.com/i.test(html)) score += 0.3;
      if (/X-Wix-/i.test(html)) score += 0.1;
      if (/wixsite\.com/i.test(url)) score += 0.5;
      return Math.min(score, 1);
    },
  },

  // ── 교회사랑넷 / GnuBoard / Korean church CMS family ──
  // Many Korean church sites run on derivatives of GnuBoard (gnu5/gnu6)
  // with 교회사랑넷 templates. Identifiable by /bbs/board.php paths and
  // footer attribution.
  {
    id: 'churchlovenet',
    detect: ({ html, url }) => {
      let score = 0;
      if (/교회사랑넷/.test(html)) score += 0.6;
      if (/onmam\.com|kts114\.com|kchurch\.org/i.test(url)) score += 0.4;
      if (/\/bbs\/board\.php\?bo_table=/i.test(html)) score += 0.3;
      if (/gnuboard/i.test(html)) score += 0.2;
      return Math.min(score, 1);
    },
  },

  // ── Squarespace ──
  {
    id: 'squarespace',
    detect: ({ html, url }) => {
      let score = 0;
      if (/<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*Squarespace/i.test(html)) score += 0.6;
      if (/static1\.squarespace\.com/i.test(html)) score += 0.3;
      if (/squarespace\.com/i.test(url)) score += 0.4;
      return Math.min(score, 1);
    },
  },

  // ── Webflow ──
  {
    id: 'webflow',
    detect: ({ html, url }) => {
      let score = 0;
      if (/<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*Webflow/i.test(html)) score += 0.6;
      if (/data-wf-(page|site)=/i.test(html)) score += 0.3;
      if (/webflow\.io/i.test(url)) score += 0.4;
      return Math.min(score, 1);
    },
  },

  // ── Imweb (Korean DIY builder) ──
  {
    id: 'imweb',
    detect: ({ html, url }) => {
      let score = 0;
      if (/<meta[^>]+name=["']generator["'][^>]+content=["']imweb/i.test(html)) score += 0.6;
      if (/imweb\.me/i.test(url)) score += 0.4;
      if (/cdn\.imweb\.me/i.test(html)) score += 0.3;
      return Math.min(score, 1);
    },
  },

  // ── Naver Modoo ──
  {
    id: 'modoo',
    detect: ({ html, url }) => {
      let score = 0;
      if (/modoo\.at/i.test(url)) score += 0.7;
      if (/modoo\.naver\.com/i.test(html)) score += 0.3;
      return Math.min(score, 1);
    },
  },

  // ── Tistory blog ──
  {
    id: 'tistory',
    detect: ({ html, url }) => {
      let score = 0;
      if (/tistory\.com/i.test(url)) score += 0.6;
      if (/<meta[^>]+name=["']generator["'][^>]+content=["'][^"']*Tistory/i.test(html)) score += 0.4;
      return Math.min(score, 1);
    },
  },

  // ── Cafe24 hosting (often runs GnuBoard / XpressEngine variants) ──
  {
    id: 'cafe24',
    detect: ({ html, url }) => {
      let score = 0;
      if (/cafe24\.com/i.test(url)) score += 0.5;
      if (/x-cafe24/i.test(html)) score += 0.3;
      return Math.min(score, 1);
    },
  },

  // ── Generic GnuBoard (any host, not just 교회사랑넷) ──
  // Runs after churchlovenet so the more specific signal wins ties.
  {
    id: 'gnuboard',
    detect: ({ html }) => {
      let score = 0;
      if (/g5_url|gnu(?:5|6|board)/i.test(html)) score += 0.4;
      if (/\/bbs\/board\.php\?bo_table=/i.test(html)) score += 0.3;
      return Math.min(score, 1);
    },
  },
];

/**
 * Run every detector against the page and pick the highest-scoring
 * platform. Confidence threshold: anything below 0.3 falls through to
 * 'unknown' — too risky to apply a platform-specific extractor on a
 * coincidental match.
 */
export function detectPlatform(input: {
  html: string;
  url: string;
  headers: Headers;
}): PlatformDetection {
  let best: PlatformDetection = { platform: 'unknown', confidence: 0 };
  for (const entry of PLATFORMS) {
    const score = entry.detect(input);
    if (score > best.confidence) {
      best = { platform: entry.id, confidence: score };
    }
  }
  if (best.confidence < 0.3) return { platform: 'unknown', confidence: best.confidence };
  return best;
}
