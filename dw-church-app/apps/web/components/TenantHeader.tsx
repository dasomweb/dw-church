import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

// TenantHeader — storefront header, 12 layout variants faithful to Claude Design
// "Header 모음 — 시안 헤더 12종" (12a–12l). Server Component: colors from CSS vars
// (--dw-*/--brand-*), client bits (mobile menu, utility bar, install button) are
// passed in as ReactNodes so this file stays presentational. The desktop sidebar
// aside + main padding for variant 'sidebar' live in the tenant layout; here the
// sidebar variant renders only the mobile top bar.

export type HeaderVariant =
  | 'standard'      // 12a 표준 1단
  | 'live'          // 12b 생중계 배너 + 유틸 바
  | 'transparent'   // 12c 사진 위 투명 헤더
  | 'center-split'  // 12d 중앙 로고 분할
  | 'dark'          // 12e 다크
  | 'search-account'// 12f 검색 + 계정
  | 'sidebar'       // 12g 좌측 사이드바 (desktop aside in layout)
  | 'bilingual'     // 12h 한·영 병기
  | 'english'       // 12i 영어 우선
  | 'large'         // 12j 큰 글씨
  | 'mega'          // 12k 메가메뉴
  | 'mobile';       // 12l 모바일 (desktop = standard)

export interface HeaderNavChild { id: string; label: string; labelEn?: string; href: string }
export interface HeaderNavItem { id: string; label: string; labelEn?: string; href: string; children?: HeaderNavChild[] }

export interface TenantHeaderProps {
  variant: HeaderVariant;
  homeHref: string;
  logoUrl: string | null;
  churchName: string;
  brandTextEn: string;
  navItems: HeaderNavItem[];
  navLinkColor: string;
  giving: { enabled: boolean; url: string; label: string };
  live: { text: string; buttonLabel: string; url: string };
  search: { url: string };
  account: { label: string; url: string };
  /** Client-component slots rendered by the tenant layout. */
  utilityBar: ReactNode;   // <HeaderTopBar/> or null
  mobileMenu: ReactNode;   // <MobileMenu/>
  installButton: ReactNode; // <InstallAppButton/> or null
}

const LOGO_H = 'var(--brand-logo-height, 40px)';
const NAV_FS = 'var(--brand-nav-font-size, 14px)';
const NAV_FW = 'var(--brand-nav-font-weight, 500)';

function headerClasses(base: 'centered' | 'transparent' | 'dark' | 'default'): string {
  switch (base) {
    case 'centered': return 'sticky top-0 z-50 border-b border-gray-200 bg-[var(--dw-background)]';
    case 'transparent': return 'sticky top-0 z-50 bg-transparent';
    case 'dark': return 'sticky top-0 z-50 border-b border-gray-700';
    default: return 'sticky top-0 z-50 border-b bg-[var(--dw-background)] border-gray-200';
  }
}
function headerInlineStyle(base: string): CSSProperties {
  return base === 'dark' ? { backgroundColor: 'var(--dw-text)', color: 'var(--dw-background)' } : {};
}

export function TenantHeader(props: TenantHeaderProps) {
  const {
    variant, homeHref, logoUrl, churchName, brandTextEn, navItems, navLinkColor,
    giving, live, search, account, utilityBar, mobileMenu, installButton,
  } = props;

  const isCentered = variant === 'center-split';
  const isDark = variant === 'dark';
  const isTransparent = variant === 'transparent';
  const isSidebar = variant === 'sidebar';
  const isLive = variant === 'live';
  const isSearchAccount = variant === 'search-account';
  const isEnglish = variant === 'english';
  const isLarge = variant === 'large';
  const isMega = variant === 'mega';
  const isBilingual = variant === 'bilingual';

  const base: 'centered' | 'transparent' | 'dark' | 'default' =
    isCentered ? 'centered' : isDark ? 'dark' : isTransparent ? 'transparent' : 'default';
  const brandColor = isDark ? 'var(--dw-background)' : 'var(--dw-primary)';
  const subColor = isDark ? 'var(--dw-background)' : 'var(--dw-muted, #6b7280)';
  const navFontSize = isLarge ? '16px' : NAV_FS;

  // ── Brand block (logo or name + optional EN line). ────────────────────────
  const brand = (
    <Link href={homeHref} className="flex items-center gap-2.5">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={churchName} className="w-auto object-contain" style={{ height: isLarge ? 'calc(' + LOGO_H + ' * 1.25)' : LOGO_H }} />
      )}
      {(!logoUrl || brandTextEn) && (
        <span className="flex flex-col leading-tight">
          {/* english/bilingual: EN 우선 노출, KO 보조. 그 외: KO 우선. */}
          {isEnglish && brandTextEn ? (
            <>
              <span className={`font-bold font-heading ${isLarge ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`} style={{ color: brandColor }}>{brandTextEn}</span>
              <span className="text-[11px] font-medium opacity-60" style={{ color: subColor }}>{churchName}</span>
            </>
          ) : (
            <>
              {!logoUrl && (
                <span className={`font-bold font-heading ${isLarge ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}`} style={{ color: brandColor }}>{churchName}</span>
              )}
              {brandTextEn && (
                <span className="text-[11px] font-medium uppercase tracking-wide opacity-60" style={{ color: subColor }}>{brandTextEn}</span>
              )}
            </>
          )}
        </span>
      )}
    </Link>
  );

  // ── One desktop nav link (+ dropdown / mega panel). ───────────────────────
  const navLink = (item: HeaderNavItem) => {
    const hasChildren = !!(item.children && item.children.length > 0);
    return (
      <div key={item.id} className="relative group">
        <Link
          href={item.href}
          className="font-medium transition-colors hover:opacity-80 py-2 inline-flex items-center gap-0.5"
          style={{ color: navLinkColor, fontSize: navFontSize, fontWeight: NAV_FW }}
        >
          {item.label}
          {(isBilingual || isEnglish) && item.labelEn ? (
            <span className="ml-1.5 text-[0.8em] font-normal opacity-60">{item.labelEn}</span>
          ) : item.labelEn ? (
            <span className="ml-1.5 text-[0.8em] font-normal opacity-60">{item.labelEn}</span>
          ) : null}
          {hasChildren && (
            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
          )}
        </Link>
        {hasChildren && (
          <div className="absolute left-0 top-full pt-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
            {isMega ? (
              // 메가메뉴 — 넓은 패널, 자식을 다열 그리드로.
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg" style={{ minWidth: 460 }}>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {item.children!.map((child) => (
                    <Link key={child.id} href={child.href} className="block rounded px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-[var(--dw-primary)]">
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {item.children!.map((child) => (
                  <Link key={child.id} href={child.href} className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-[var(--dw-primary)]">
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const desktopNav = (
    <nav aria-label="주 메뉴" className="hidden items-center gap-5 md:flex">
      {navItems.map(navLink)}
    </nav>
  );

  const givingBtn = giving.enabled && (
    <Link
      href={giving.url}
      className="hidden items-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 md:inline-flex"
      style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}
    >
      {giving.label}
    </Link>
  );

  // 12f 검색 + 계정.
  const searchAccount = isSearchAccount && (
    <div className="hidden items-center gap-3 md:flex">
      <form action={search.url} method="get" className="relative">
        <input
          type="search"
          name="q"
          placeholder="무엇을 찾으세요?"
          aria-label="검색"
          className="w-44 rounded-full border border-gray-300 bg-[var(--dw-surface,#f7f8fa)] py-1.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--dw-primary)]"
        />
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      </form>
      <Link href={account.url || '#'} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: navLinkColor }}>
        <svg className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
        {account.label}
      </Link>
    </div>
  );

  const mobileCluster = (
    <div className="flex items-center gap-2 md:hidden">
      {installButton}
      {mobileMenu}
    </div>
  );

  // ── 12g sidebar: 모바일 상단 바만(데스크탑 aside 는 layout 에서). ──────────
  if (isSidebar) {
    return (
      <header role="banner" className="sticky top-0 z-50 border-b border-gray-200 bg-[var(--dw-background)] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {brand}
          {mobileCluster}
        </div>
      </header>
    );
  }

  // ── 12b 생중계 배너 (variant 'live'). ─────────────────────────────────────
  const liveBanner = isLive && (
    <div className="text-white" style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1.5 px-4 py-2 text-sm sm:flex-row sm:gap-3 sm:px-6">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
        </span>
        <span className="opacity-95">{live.text}</span>
        {live.url && (
          <Link href={live.url} className="rounded-full bg-white/20 px-3 py-0.5 font-semibold transition-colors hover:bg-white/30">
            {live.buttonLabel} →
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {liveBanner}
      {utilityBar}
      <header role="banner" className={headerClasses(base)} style={headerInlineStyle(base)}>
        {isCentered ? (
          /* 12d 중앙 로고 분할 — 로고 위, 네비 아래(중앙). */
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-col items-center gap-3">
              {brand}
              {desktopNav}
              {givingBtn}
            </div>
            <div className="absolute right-4 top-4 sm:right-6 md:hidden">{mobileCluster}</div>
          </div>
        ) : (
          /* 12a/기타 — 좌 로고 · 우 네비/검색/계정/헌금. */
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            {brand}
            <div className="flex items-center gap-4">
              {desktopNav}
              {searchAccount}
              {givingBtn}
            </div>
            {mobileCluster}
          </div>
        )}
      </header>
    </>
  );
}
