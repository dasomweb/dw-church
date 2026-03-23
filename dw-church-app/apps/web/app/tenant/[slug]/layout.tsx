import Link from 'next/link';
import { getChurchSettings, getMenuItems, getTheme } from '@/lib/api';
import MobileMenu from '@/components/MobileMenu';
// Types inlined to avoid importing @dw-church/api-client in server components
type ChurchSettings = Record<string, string>;
type MenuItem = { id: string; label: string; pageId?: string; externalUrl?: string; parentId?: string; sortOrder: number; isVisible: boolean; children?: MenuItem[] };
type Theme = { colors: Record<string, string>; fonts: Record<string, string> };

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

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

  const cssVars: Record<string, string> = {
    '--dw-primary': colors?.primary ?? '#2563eb',
    '--dw-secondary': colors?.secondary ?? '#64748b',
    '--dw-accent': colors?.accent ?? '#f59e0b',
    '--dw-background': colors?.background ?? '#ffffff',
    '--dw-surface': colors?.surface ?? '#f8fafc',
    '--dw-text': colors?.text ?? '#0f172a',
    '--dw-font-heading': fonts?.heading ?? 'Pretendard',
    '--dw-font-body': fonts?.body ?? 'Pretendard',
  };

  return (
    <div style={cssVars as React.CSSProperties}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--dw-primary)]"
      >
        본문으로 건너뛰기
      </a>

      {/* Header */}
      <header role="banner" className="sticky top-0 z-50 border-b bg-[var(--dw-background)] border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold font-heading" style={{ color: 'var(--dw-primary)' }}>
            {settings?.name ?? slug}
          </Link>
          <nav aria-label="주 메뉴" className="hidden gap-6 md:flex">
            {navItems
              .filter((item) => item.isVisible)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.externalUrl ?? `/${item.pageId ? item.label : ''}`}
                  className="text-sm font-medium text-[var(--dw-text)] hover:text-[var(--dw-primary)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
          <MobileMenu navItems={navItems} />
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="min-h-[60vh]" style={{ backgroundColor: 'var(--dw-background)', color: 'var(--dw-text)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="border-t border-gray-200" style={{ backgroundColor: 'var(--dw-surface)' }}>
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-3 text-lg font-bold font-heading" style={{ color: 'var(--dw-primary)' }}>
                {settings?.name ?? slug}
              </h3>
              {settings?.address && (
                <p className="text-sm text-gray-600">{settings.address}</p>
              )}
            </div>
            <div>
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
            <div className="flex gap-4">
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
          </div>
          <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            Powered by DW Church
          </div>
        </div>
      </footer>
    </div>
  );
}
