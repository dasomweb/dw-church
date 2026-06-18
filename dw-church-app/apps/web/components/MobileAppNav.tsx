'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileAppNavItem {
  label: string;
  href: string;
}

interface MobileAppNavProps {
  items: MobileAppNavItem[];
}

// Keyword → emoji icon map for app-style tiles. Matched against the menu label
// so operator-named menus ("설교 말씀", "오시는 길") still resolve sensibly.
const ICON_KEYWORDS: { match: string; icon: string }[] = [
  { match: '설교', icon: '🎙️' },
  { match: '말씀', icon: '🎙️' },
  { match: '주보', icon: '📄' },
  { match: '앨범', icon: '📸' },
  { match: '사진', icon: '📸' },
  { match: '교역자', icon: '👥' },
  { match: '섬기는', icon: '👥' },
  { match: '예배', icon: '🙏' },
  { match: '오시는', icon: '📍' },
  { match: '오시는길', icon: '📍' },
  { match: '위치', icon: '📍' },
  { match: '소개', icon: 'ℹ️' },
  { match: '행사', icon: '📅' },
  { match: '일정', icon: '📅' },
  { match: '게시판', icon: '📋' },
  { match: '공지', icon: '📋' },
  { match: '칼럼', icon: '✍️' },
];

function iconFor(label: string): string {
  for (const { match, icon } of ICON_KEYWORDS) {
    if (label.includes(match)) return icon;
  }
  // Default: a church glyph (no good keyword match).
  return '⛪';
}

// Fixed app-style bottom navigation, mobile only (sm:hidden). Up to 5 menu
// items render as vertical icon-tile + label buttons; the active one is
// highlighted by matching the current pathname. Rendered by the tenant layout
// for Pro-plan tenants only. Links reuse the layout's resolved hrefs so they
// stay consistent with the desktop header + slide-out menu.
export default function MobileAppNav({ items }: MobileAppNavProps) {
  const pathname = usePathname();
  const navItems = items.slice(0, 5);
  if (navItems.length === 0) return null;

  // Longest matching href wins so "/about" doesn't light up for "/" root.
  const activeHref = navItems
    .filter((it) => {
      if (!pathname) return false;
      if (it.href === '/' || it.href.endsWith('/')) {
        return pathname === it.href || pathname === it.href.replace(/\/$/, '');
      }
      return pathname === it.href || pathname.startsWith(`${it.href}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="앱 하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/90 backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
        {navItems.map((item, idx) => {
          const isActive = activeHref != null && item.href === activeHref;
          return (
            <li key={`${item.href}-${idx}`} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
                    isActive
                      ? 'bg-[var(--dw-primary)] text-white shadow'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  aria-hidden="true"
                >
                  {iconFor(item.label)}
                </span>
                <span
                  className={`max-w-[64px] truncate text-[10px] font-medium leading-tight ${
                    isActive ? 'text-[var(--dw-primary)]' : 'text-gray-600'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
