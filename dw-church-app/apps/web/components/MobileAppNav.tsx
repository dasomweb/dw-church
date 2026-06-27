'use client';

import { useState } from 'react';
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
  return '⛪';
}

/**
 * App-style bottom tab bar, mobile only (sm:hidden). Shown for tenants with the
 * Web App add-on. Up to 5 menu items render as tabs; when there are MORE than 5,
 * the first 4 are shown plus a "메뉴" (More) tab that opens a sheet listing every
 * menu item — so nothing is unreachable. Active tab matched by pathname.
 */
export default function MobileAppNav({ items }: MobileAppNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (items.length === 0) return null;

  const hasOverflow = items.length > 5;
  const primary = hasOverflow ? items.slice(0, 4) : items.slice(0, 5);

  // Longest matching href wins so "/about" doesn't light up for "/" root.
  const activeHref = items
    .filter((it) => {
      if (!pathname) return false;
      if (it.href === '/' || it.href.endsWith('/')) {
        return pathname === it.href || pathname === it.href.replace(/\/$/, '');
      }
      return pathname === it.href || pathname.startsWith(`${it.href}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const tileClass = (active: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
      active ? 'bg-[var(--dw-primary)] text-white shadow' : 'bg-gray-100 text-gray-700'
    }`;
  const labelClass = (active: boolean) =>
    `max-w-[64px] truncate text-[10px] font-medium leading-tight ${
      active ? 'text-[var(--dw-primary)]' : 'text-gray-600'
    }`;

  return (
    <>
      {/* "메뉴" (More) sheet — full menu list */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] max-h-[70vh] overflow-y-auto">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">전체 메뉴</h2>
              <button onClick={() => setMoreOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            <ul className="grid grid-cols-4 gap-2">
              {items.map((item, idx) => {
                const active = activeHref != null && item.href === activeHref;
                return (
                  <li key={`more-${item.href}-${idx}`}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1 rounded-lg py-2"
                    >
                      <span className={tileClass(active)} aria-hidden="true">{iconFor(item.label)}</span>
                      <span className={labelClass(active)}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="앱 하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/90 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {primary.map((item, idx) => {
            const isActive = activeHref != null && item.href === activeHref;
            return (
              <li key={`${item.href}-${idx}`} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors"
                >
                  <span className={tileClass(isActive)} aria-hidden="true">{iconFor(item.label)}</span>
                  <span className={labelClass(isActive)}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          {hasOverflow && (
            <li className="flex-1">
              <button
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors"
              >
                <span className={tileClass(moreOpen)} aria-hidden="true">☰</span>
                <span className={labelClass(moreOpen)}>메뉴</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
