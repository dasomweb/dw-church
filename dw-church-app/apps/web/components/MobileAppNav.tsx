'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { iconPathByKey } from './webAppIcons';

interface MobileAppNavItem {
  label: string;
  href: string;
  icon?: string; // operator-chosen icon key (see webAppIcons)
}

interface MobileAppNavProps {
  items: MobileAppNavItem[];
}

function TabIcon({ iconKey, active }: { iconKey?: string; active: boolean }) {
  return (
    <svg
      className={`h-6 w-6 ${active ? 'text-[var(--dw-primary)]' : 'text-gray-500'}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={iconPathByKey(iconKey)} />
    </svg>
  );
}

/**
 * App-style bottom tab bar — shown ONLY when launched as the installed web app
 * (display-mode: standalone). Up to 5 tabs; with >5 menu items the first 4 show
 * plus a "메뉴" (More) tab that opens a full-menu sheet. Icons are operator-chosen
 * (webAppIcons) — no keyword guessing. Active tab matched by pathname.
 */
export default function MobileAppNav({ items }: MobileAppNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const check = () =>
      setStandalone(
        window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
        (window.navigator as { standalone?: boolean }).standalone === true,
      );
    check();
    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', check);
    return () => mq?.removeEventListener?.('change', check);
  }, []);

  if (items.length === 0 || !standalone) return null;

  const hasOverflow = items.length > 5;
  const primary = hasOverflow ? items.slice(0, 4) : items.slice(0, 5);

  const activeHref = items
    .filter((it) => {
      if (!pathname) return false;
      if (it.href === '/' || it.href.endsWith('/')) {
        return pathname === it.href || pathname === it.href.replace(/\/$/, '');
      }
      return pathname === it.href || pathname.startsWith(`${it.href}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const labelClass = (active: boolean) =>
    `max-w-[64px] truncate text-[10px] font-medium leading-tight ${active ? 'text-[var(--dw-primary)]' : 'text-gray-500'}`;

  return (
    <>
      {/* Reserve space so the fixed bar doesn't cover content (standalone only). */}
      <div aria-hidden className="h-[64px] sm:hidden" />

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
                    <Link href={item.href} onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1 rounded-lg py-2">
                      <TabIcon iconKey={item.icon} active={active} />
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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-4 py-1.5">
          {primary.map((item, idx) => {
            const isActive = activeHref != null && item.href === activeHref;
            return (
              <li key={`${item.href}-${idx}`} className="flex-1">
                <Link href={item.href} aria-current={isActive ? 'page' : undefined} className="flex flex-col items-center gap-1 px-1 py-1">
                  <TabIcon iconKey={item.icon} active={isActive} />
                  <span className={labelClass(isActive)}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          {hasOverflow && (
            <li className="flex-1">
              <button onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className="flex w-full flex-col items-center gap-1 px-1 py-1">
                <svg className={`h-6 w-6 ${moreOpen ? 'text-[var(--dw-primary)]' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                <span className={labelClass(moreOpen)}>메뉴</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
