import Link from 'next/link';
import { getChurchSettings, getMenuItems, getTheme } from '@/lib/api';
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-[var(--dw-background)] border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/tenant/${slug}`} className="text-xl font-bold font-heading" style={{ color: 'var(--dw-primary)' }}>
            {settings?.name ?? slug}
          </Link>
          <nav className="hidden gap-6 md:flex">
            {menuItems
              .filter((item) => item.isVisible)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.externalUrl ?? `/tenant/${slug}/${item.pageId ? item.label : ''}`}
                  className="text-sm font-medium text-[var(--dw-text)] hover:text-[var(--dw-primary)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="min-h-[60vh]" style={{ backgroundColor: 'var(--dw-background)', color: 'var(--dw-text)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200" style={{ backgroundColor: 'var(--dw-surface)' }}>
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
