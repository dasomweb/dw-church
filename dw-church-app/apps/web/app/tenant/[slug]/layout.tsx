import Link from 'next/link';
import { getChurchSettings, getMenuItems, getTheme } from '@/lib/api';
import MobileMenu from '@/components/MobileMenu';
// Types inlined to avoid importing @dw-church/api-client in server components
type ChurchSettings = Record<string, string>;
type MenuItem = { id: string; label: string; pageId?: string; externalUrl?: string; parentId?: string; sortOrder: number; isVisible: boolean; children?: MenuItem[] };
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

// ─── Component ───────────────────────────────────────────────

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { slug } = await params;

  let settings: ChurchSettings | null = null;
  let menuItems: MenuItem[] = [];
  let theme: Theme | null = null;

  try {
    [settings, menuItems, theme] = await Promise.all([
      getChurchSettings(slug),
      getMenuItems(slug),
      getTheme(slug),
    ]);
  } catch {
    // Fallback: render with defaults if API unavailable
  }

  // Default navigation when no menu items are configured
  const DEFAULT_NAV: MenuItem[] = [
    { id: 'nav-sermons', label: '설교', externalUrl: '/sermons', sortOrder: 1, isVisible: true },
    { id: 'nav-bulletins', label: '주보', externalUrl: '/bulletins', sortOrder: 2, isVisible: true },
    { id: 'nav-albums', label: '앨범', externalUrl: '/albums', sortOrder: 3, isVisible: true },
    { id: 'nav-events', label: '행사', externalUrl: '/events', sortOrder: 4, isVisible: true },
    { id: 'nav-staff', label: '교역자', externalUrl: '/staff', sortOrder: 5, isVisible: true },
    { id: 'nav-columns', label: '칼럼', externalUrl: '/columns', sortOrder: 6, isVisible: true },
    { id: 'nav-history', label: '연혁', externalUrl: '/history', sortOrder: 7, isVisible: true },
  ];

  const navItems = menuItems.length > 0 ? menuItems : DEFAULT_NAV;

  const colors = theme?.colors;
  const fonts = theme?.fonts;
  const layout = theme?.layout;

  const headerStyle = layout?.headerStyle ?? 'default';
  const footerStyle = layout?.footerStyle ?? 'default';

  const cssVars: Record<string, string> = {
    '--dw-primary': colors?.primary ?? '#2563eb',
    '--dw-secondary': colors?.secondary ?? '#64748b',
    '--dw-accent': colors?.accent ?? '#f59e0b',
    '--dw-background': colors?.background ?? '#ffffff',
    '--dw-surface': colors?.surface ?? '#f8fafc',
    '--dw-text': colors?.text ?? '#0f172a',
    '--dw-font-heading': fonts?.heading ?? 'Pretendard',
    '--dw-font-body': fonts?.body ?? 'Pretendard',
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

  // Logo: settings.logoUrl or settings.logo_url, fallback to church name
  const logoUrl = settings?.logoUrl ?? settings?.logo_url ?? null;
  const churchName = settings?.name ?? settings?.churchName ?? slug;

  const sortedVisibleItems = navItems
    .filter((item) => item.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      style={cssVars as React.CSSProperties}
      data-template={theme?.templateName ?? 'modern'}
    >
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
              <Link href="/" className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={churchName} className="h-10 w-auto object-contain" />
                ) : (
                  <span className="text-xl font-bold font-heading" style={{ color: isDarkHeader ? 'var(--dw-background)' : 'var(--dw-primary)' }}>
                    {churchName}
                  </span>
                )}
              </Link>
              <nav aria-label="주 메뉴" className="hidden gap-6 md:flex">
                {sortedVisibleItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.externalUrl ?? `/${item.pageId ? item.label : ''}`}
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: navLinkColor }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="absolute right-4 top-4 sm:right-6 md:hidden">
              <MobileMenu navItems={navItems} />
            </div>
          </div>
        ) : (
          /* Default / transparent / dark header: left logo, right nav */
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={churchName} className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-xl font-bold font-heading" style={{ color: isDarkHeader ? 'var(--dw-background)' : 'var(--dw-primary)' }}>
                  {churchName}
                </span>
              )}
            </Link>
            <nav aria-label="주 메뉴" className="hidden gap-6 md:flex">
              {sortedVisibleItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.externalUrl ?? `/${item.pageId ? item.label : ''}`}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: navLinkColor }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <MobileMenu navItems={navItems} />
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
            {settings?.name ? `\u00A9 ${settings.name}. ` : ''}Powered by DW Church
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
              Powered by DW Church
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
              Powered by DW Church
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
