import '@dw-church/blocks/styles.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getChurchSettings, getMenuItems, getTheme, getThemeTokens } from '@/lib/api';
import MobileMenu from '@/components/MobileMenu';
import { BrandTokensStyle } from '@/components/BrandTokensStyle';
import { PreviewBridge } from '@/components/PreviewBridge';
import { DEFAULT_DESIGN_TOKENS, type DesignTokens } from '@dw-church/design-tokens';
// Types inlined to avoid importing @dw-church/api-client in server components
type ChurchSettings = Record<string, string>;
type MenuItem = { id: string; label: string; pageId?: string; pageSlug?: string; externalUrl?: string; parentId?: string; sortOrder: number; isVisible: boolean; children?: MenuItem[] };
type Theme = {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  templateName?: string;
  layout?: {
    headerStyle: string;
    heroStyle: string;
    contentWidth: string;
    cardStyle: string;
    footerStyle: string;
    borderRadius: string;
    sermonGrid: number;
  };
};

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

// ─── Layout helpers ──────────────────────────────────────────

const BORDER_RADIUS_MAP: Record<string, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
};

const CONTENT_WIDTH_MAP: Record<string, string> = {
  narrow: '768px',
  default: '1024px',
  wide: '1280px',
  full: '100%',
};

// Fonts already available without a Google Fonts request (Pretendard via CDN,
// generic system stacks). Everything else is loaded from Google Fonts.
const PRELOADED_FONTS = new Set([
  'Pretendard', 'system-ui', 'sans-serif', 'serif', 'monospace',
  'Noto Sans KR', '-apple-system', 'BlinkMacSystemFont',
]);

/** Extract the primary family name from a font-family stack string. */
function firstFamily(stack: string | undefined): string | null {
  if (!stack) return null;
  const first = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  return first || null;
}

// Build a Google Fonts stylesheet URL for the operator-selected heading/body
// fonts. Without this the layout only sets the font-family NAME in a CSS var
// but the webfont file is never loaded, so the browser falls back to a system
// font and the chosen font never visually applies.
function googleFontsHref(stacks: (string | undefined)[]): string | null {
  const names = stacks
    .map(firstFamily)
    .filter((f): f is string => f != null && !PRELOADED_FONTS.has(f))
    .filter((f, i, arr) => arr.indexOf(f) === i);
  if (names.length === 0) return null;
  const q = names
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const CARD_SHADOW_MAP: Record<string, string> = {
  shadow: '0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)',
  border: 'none',
  flat: 'none',
  elevated: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)',
};

function getHeaderClasses(style: string | undefined): string {
  switch (style) {
    case 'centered':
      return 'sticky top-0 z-50 border-b border-gray-200 bg-[var(--dw-background)]';
    case 'transparent':
      return 'sticky top-0 z-50 bg-transparent';
    case 'dark':
      return 'sticky top-0 z-50 border-b border-gray-700';
    default:
      return 'sticky top-0 z-50 border-b bg-[var(--dw-background)] border-gray-200';
  }
}

function getHeaderStyle(style: string | undefined): React.CSSProperties {
  switch (style) {
    case 'dark':
      return { backgroundColor: 'var(--dw-text)', color: 'var(--dw-background)' };
    case 'transparent':
      return {};
    default:
      return {};
  }
}

function getFooterClasses(style: string | undefined): string {
  switch (style) {
    case 'minimal':
      return 'border-t border-gray-200';
    case 'centered':
      return 'border-t border-gray-200';
    case 'dark':
      return 'border-t border-gray-700';
    default:
      return 'border-t border-gray-200';
  }
}

function getFooterStyle(style: string | undefined): React.CSSProperties {
  switch (style) {
    case 'dark':
      return { backgroundColor: 'var(--dw-text)', color: 'var(--dw-background)' };
    default:
      return { backgroundColor: 'var(--dw-surface)' };
  }
}

// ─── Metadata ────────────────────────────────────────────────

export async function generateMetadata({ params }: TenantLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  let settings: ChurchSettings | null = null;
  try {
    settings = await getChurchSettings(slug);
  } catch { /* fallback */ }

  const churchName = settings?.churchName ?? settings?.name ?? slug;
  const seoTitle = settings?.seoTitle ?? settings?.seo_title ?? churchName;
  const seoDescription = settings?.seoDescription ?? settings?.seo_description ?? `${churchName} - 교회 웹사이트`;
  const seoKeywords = settings?.seoKeywords ?? settings?.seo_keywords ?? '';
  const ogImageUrl = settings?.ogImageUrl ?? settings?.og_image_url ?? null;
  const faviconUrl = settings?.faviconUrl ?? settings?.favicon_url ?? null;

  return {
    title: { default: seoTitle, template: `%s | ${churchName}` },
    description: seoDescription,
    keywords: seoKeywords ? seoKeywords.split(',').map((k: string) => k.trim()) : undefined,
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: 'website',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
    icons: faviconUrl ? { icon: faviconUrl, apple: faviconUrl } : undefined,
  };
}

// ─── Component ───────────────────────────────────────────────

// Bare platform hosts serve the storefront at `/tenant/{slug}/...` WITHOUT a
// middleware rewrite, so nav links must carry the `/tenant/{slug}` prefix.
// Custom domains + `{slug}.truelight.app` subdomains are rewritten to that
// path internally, so on those the public URL is the domain root and links
// must stay root-relative. Mirrors middleware.ts PLATFORM_HOSTS.
const PLATFORM_HOSTS = new Set([
  'truelight.app',
  'www.truelight.app',
  'customers.truelight.app',
  'localhost:3002',
]);

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { slug } = await params;

  // Determine the public base path for nav links. On the bare platform host
  // (truelight.app/tenant/{slug}) links need the prefix or they 404; on a
  // proxied custom domain / subdomain the URL is already the tenant root.
  const hdrs = await headers();
  const host = (hdrs.get('host') || '').toLowerCase();
  const proxiedCustomDomain = !!hdrs.get('x-tenant-host');
  const basePath = !proxiedCustomDomain && PLATFORM_HOSTS.has(host) ? `/tenant/${slug}` : '';
  // Resolve a menu item to its href, scoped to the right base path. 'home' (or
  // no slug) → the tenant root.
  const navHref = (item: { pageSlug?: string; externalUrl?: string }): string => {
    if (item.externalUrl) return item.externalUrl;
    if (!item.pageSlug || item.pageSlug === 'home') return basePath || '/';
    return `${basePath}/${item.pageSlug}`;
  };
  const homeHref = basePath || '/';

  let settings: ChurchSettings | null = null;
  let menuItems: MenuItem[] = [];
  let theme: Theme | null = null;
  let tokens: DesignTokens = DEFAULT_DESIGN_TOKENS;

  try {
    // Tokens are the new source of truth; the legacy `getTheme` blob
    // still feeds the layout switches (header/footer/cardStyle) until
    // those move under `tokens.layout` in a follow-up phase.
    const [s, m, t, tk] = await Promise.all([
      getChurchSettings(slug),
      getMenuItems(slug),
      getTheme(slug),
      getThemeTokens(slug),
    ]);
    settings = s;
    menuItems = m;
    theme = t;
    if (tk) tokens = tk as DesignTokens;
  } catch {
    // Fallback: render with defaults if API unavailable
  }

  // Menu items from admin panel — no hardcoded defaults.
  // If no menus configured, show nothing (admin should set up menus).
  const navItems = menuItems;

  const colors = theme?.colors;
  const fonts = theme?.fonts;
  const layout = theme?.layout;

  const headerStyle = layout?.headerStyle ?? 'default';
  const footerStyle = layout?.footerStyle ?? 'default';

  // The super-admin theme editor saves to the DESIGN TOKENS (--brand-*), but
  // dw-church block components read the legacy --dw-* vars. Bridge them so
  // theme edits actually reflect: take colors/fonts from tokens first, falling
  // back to the legacy /theme blob, then hardcoded defaults.
  const sys = (tokens?.colors?.system ?? {}) as Record<string, string>;
  const fam = (tokens?.typography?.families ?? {}) as Record<string, string>;
  const headingFamily = fam.heading || fonts?.heading || "'Pretendard', sans-serif";
  const bodyFamily = fam.body || fonts?.body || "'Pretendard', sans-serif";

  const cssVars: Record<string, string> = {
    '--dw-primary': sys.primary || colors?.primary || '#2563eb',
    '--dw-secondary': sys.secondary || colors?.secondary || '#64748b',
    '--dw-accent': sys.accent || colors?.accent || '#f59e0b',
    '--dw-background': sys.background || colors?.background || '#ffffff',
    '--dw-surface': sys.surface || colors?.surface || '#f8fafc',
    '--dw-text': sys.text || colors?.text || '#0f172a',
    '--dw-font-heading': headingFamily,
    '--dw-font-body': bodyFamily,
    // Layout-derived variables
    '--dw-radius': BORDER_RADIUS_MAP[layout?.borderRadius ?? 'lg'] ?? '12px',
    '--dw-content-width': CONTENT_WIDTH_MAP[layout?.contentWidth ?? 'default'] ?? '1024px',
    '--dw-card-shadow': CARD_SHADOW_MAP[layout?.cardStyle ?? 'shadow'] ?? CARD_SHADOW_MAP.shadow,
    '--dw-card-border': layout?.cardStyle === 'border' ? '1px solid #e5e7eb' : 'none',
    '--dw-sermon-grid': String(layout?.sermonGrid ?? 4),
  };

  // Determine text colors for dark header/footer
  const isDarkHeader = headerStyle === 'dark';
  const isDarkFooter = footerStyle === 'dark';

  const navLinkColor = isDarkHeader ? 'var(--dw-background)' : 'var(--dw-text)';

  // Branding (SEO/favicon handled in generateMetadata above)
  const logoUrl = settings?.logoUrl ?? settings?.logo_url ?? null;
  // church_name is now populated server-side from tenants.name when the admin
  // hasn't set it explicitly — so churchName almost always resolves to the
  // human-readable name, and we only fall back to slug as a last resort.
  const churchName = settings?.churchName ?? settings?.church_name ?? settings?.name ?? slug;

  // Build tree: top-level items with children
  const topLevelItems = navItems
    .filter((item) => item.isVisible && !item.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: navItems
        .filter((child) => child.isVisible && child.parentId === item.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  // Flat list for backward compat (only top-level shown in header)
  const sortedVisibleItems = topLevelItems;

  return (
    <div
      // data-tenant scopes BrandTokensStyle's `--brand-*` CSS so multiple
      // tenants SSR'd in the same request don't bleed into each other.
      // Legacy `--dw-*` vars remain via cssVars as a fallback for storefront
      // chunks not yet migrated to `--brand-*`.
      data-tenant={slug}
      style={cssVars as React.CSSProperties}
      data-template={theme?.templateName ?? 'modern'}
    >
      <BrandTokensStyle tenantSlug={slug} tokens={tokens} />
      {/* Load the actual webfont files so the operator-selected fonts render
          (CSS vars only set the family NAME). Pretendard = Korean default. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      {googleFontsHref([headingFamily, bodyFamily]) && (
        <link rel="stylesheet" href={googleFontsHref([headingFamily, bodyFamily])!} />
      )}
      <PreviewBridge />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--dw-primary)]"
      >
        본문으로 건너뛰기
      </a>

      {/* Header */}
      <header
        role="banner"
        className={getHeaderClasses(headerStyle)}
        style={getHeaderStyle(headerStyle)}
      >
        {headerStyle === 'centered' ? (
          /* Centered header: logo above, nav below, both centered */
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-col items-center gap-3">
              <Link href={homeHref} className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={churchName} className="h-10 w-auto object-contain" />
                ) : (
                  <span className="text-xl font-bold font-heading" style={{ color: isDarkHeader ? 'var(--dw-background)' : 'var(--dw-primary)' }}>
                    {churchName}
                  </span>
                )}
              </Link>
              <nav aria-label="주 메뉴" className="hidden gap-5 md:flex items-center">
                {sortedVisibleItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <Link
                      href={navHref(item)}
                      className="text-sm font-medium transition-colors hover:opacity-80 py-2 inline-flex items-center gap-0.5"
                      style={{ color: navLinkColor }}
                    >
                      {item.label}
                      {item.children && item.children.length > 0 && (
                        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
                      )}
                    </Link>
                    {item.children && item.children.length > 0 && (
                      <div className="absolute left-0 top-full pt-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                          {item.children.map((child) => (
                            <Link
                              key={child.id}
                              href={navHref(child)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--dw-primary)] transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
            <div className="absolute right-4 top-4 sm:right-6 md:hidden">
              <MobileMenu navItems={navItems} basePath={basePath} />
            </div>
          </div>
        ) : (
          /* Default / transparent / dark header: left logo, right nav */
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href={homeHref} className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={churchName} className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-xl font-bold font-heading" style={{ color: isDarkHeader ? 'var(--dw-background)' : 'var(--dw-primary)' }}>
                  {churchName}
                </span>
              )}
            </Link>
            <nav aria-label="주 메뉴" className="hidden gap-5 md:flex items-center">
              {sortedVisibleItems.map((item) => (
                <div key={item.id} className="relative group">
                  <Link
                    href={item.externalUrl ?? (item.pageSlug ? `/${item.pageSlug}` : '#')}
                    className="text-sm font-medium transition-colors hover:opacity-80 py-2 inline-flex items-center gap-0.5"
                    style={{ color: navLinkColor }}
                  >
                    {item.label}
                    {item.children && item.children.length > 0 && (
                      <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </Link>
                  {item.children && item.children.length > 0 && (
                    <div className="absolute left-0 top-full pt-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.externalUrl ?? (child.pageSlug ? `/${child.pageSlug}` : '/')}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--dw-primary)] transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <MobileMenu navItems={navItems} basePath={basePath} />
          </div>
        )}
      </header>

      {/* Main */}
      <main id="main-content" className="min-h-[60vh]" style={{ backgroundColor: 'var(--dw-background)', color: 'var(--dw-text)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer
        role="contentinfo"
        className={getFooterClasses(footerStyle)}
        style={getFooterStyle(footerStyle)}
      >
        {footerStyle === 'minimal' ? (
          /* Minimal footer: just copyright */
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-gray-400 sm:px-6">
            {settings?.name ? `\u00A9 ${settings.name}. ` : ''}Powered by True Light
          </div>
        ) : footerStyle === 'centered' ? (
          /* Centered footer: all content centered */
          <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
            <h3 className="mb-3 text-lg font-bold font-heading" style={{ color: 'var(--dw-primary)' }}>
              {churchName}
            </h3>
            {settings?.address && (
              <p className="text-sm text-gray-600">{settings.address}</p>
            )}
            <div className="mt-3 space-y-1">
              {settings?.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">전화:</span> {settings.phone}
                </p>
              )}
              {settings?.email && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">이메일:</span> {settings.email}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-4">
              {settings?.socialYoutube && (
                <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">YouTube</a>
              )}
              {settings?.socialInstagram && (
                <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Instagram</a>
              )}
              {settings?.socialFacebook && (
                <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700">Facebook</a>
              )}
            </div>
            <div className="mt-8 border-t border-gray-200 pt-6 text-xs text-gray-400">
              Powered by True Light
            </div>
          </div>
        ) : (
          /* Default / dark footer: 3-column grid */
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h3
                  className="mb-3 text-lg font-bold font-heading"
                  style={{ color: isDarkFooter ? 'var(--dw-accent)' : 'var(--dw-primary)' }}
                >
                  {churchName}
                </h3>
                {settings?.address && (
                  <p className={`text-sm ${isDarkFooter ? 'text-gray-300' : 'text-gray-600'}`}>{settings.address}</p>
                )}
              </div>
              <div>
                {settings?.phone && (
                  <p className={`text-sm ${isDarkFooter ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">전화:</span> {settings.phone}
                  </p>
                )}
                {settings?.email && (
                  <p className={`text-sm ${isDarkFooter ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">이메일:</span> {settings.email}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                {settings?.socialYoutube && (
                  <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer" className={`text-sm ${isDarkFooter ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>YouTube</a>
                )}
                {settings?.socialInstagram && (
                  <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className={`text-sm ${isDarkFooter ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Instagram</a>
                )}
                {settings?.socialFacebook && (
                  <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className={`text-sm ${isDarkFooter ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Facebook</a>
                )}
              </div>
            </div>
            <div className={`mt-8 border-t pt-6 text-center text-xs ${isDarkFooter ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              Powered by True Light
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
