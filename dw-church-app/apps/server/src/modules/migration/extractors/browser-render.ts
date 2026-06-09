/**
 * browser-render — fetch a page's HTML via a REAL headless browser (Playwright
 * chromium) instead of a plain HTTP fetch.
 *
 * Why: the migration crawler's `fetch()` (and the Cloudflare-Worker proxy) are
 * bare HTTP requests — no JS execution, bot-shaped TLS/HTTP fingerprint. Modern
 * church-site WAFs (SiteGround / Sucuri / Cloudflare) serve a JS challenge or an
 * empty body to those, so the crawl came back blocked regardless of which IP it
 * came from. A real headless browser executes the page like an actual visitor
 * (runs the JS challenge, real fingerprint, cookies), which most of those WAFs
 * let through — without needing a paid residential proxy.
 *
 * Graceful: if chromium isn't available at runtime (image without the browser)
 * or a page errors, renderHtml returns null so the caller falls back to the
 * existing fetch / proxy path. So this never hard-breaks the crawl.
 *
 * One lazily-launched browser is reused across a migration's pages (launching
 * per page is slow); call closeBrowser() when the migration run finishes.
 */
import { chromium, type Browser } from 'playwright';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise.catch(() => null);
    if (existing && existing.isConnected()) return existing;
    browserPromise = null;
  }
  browserPromise = chromium.launch({
    headless: true,
    // --no-sandbox / --disable-dev-shm-usage are required to run chromium as
    // root inside a slim container with a small /dev/shm (Railway).
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return browserPromise;
}

/**
 * Render `url` in headless chromium and return the final (post-JS) HTML.
 * Returns null on any failure so the caller can fall back to plain fetch.
 */
export async function renderHtml(url: string, timeoutMs = 25_000): Promise<string | null> {
  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent: BROWSER_UA,
      locale: 'ko-KR',
      viewport: { width: 1366, height: 900 },
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // Give SPA hydration + a WAF JS-challenge a moment to settle, then read the
    // rendered DOM (not the initial response).
    await page.waitForTimeout(1_500);
    const html = await page.content();
    // A WAF challenge interstitial is short + has no real content; treat a
    // suspiciously tiny body as a miss so the caller falls back.
    if (!html || html.length < 500) return null;
    return html;
  } catch {
    return null;
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

/** Close the shared browser — call when a migration run finishes so chromium
 *  doesn't linger in memory. */
export async function closeBrowser(): Promise<void> {
  const p = browserPromise;
  browserPromise = null;
  if (!p) return;
  const b = await p.catch(() => null);
  if (b) await b.close().catch(() => {});
}
