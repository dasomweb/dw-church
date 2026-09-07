'use client';

import { useEffect, useState } from 'react';
import SiteLogo from './SiteLogo';
import { useSiteBrand } from './useSiteBrand';

// truelight.app 마케팅 헤더 — 시안 v2. 국문 단일(언어 토글 없음), 스티키.
// 모든 마케팅 페이지가 공유하는 단일 헤더. 세로 패딩은 super-admin(사이트 설정)에서 조정.
// nav 앵커는 "/#..." 형식 — 랜딩이 아닌 페이지에서도 홈으로 이동 후 해당 섹션으로 스크롤된다.
const NAV = [
  { label: '맡기는 방식', href: '/#approach' },
  { label: '교회 행정', href: '/#admin' },
  { label: '함께한 교회', href: '/#churches' },
  { label: '요금', href: '/#pricing' },
  // 전용 도움센터 라우트 신설 전까지 상담 섹션(#contact)으로 연결 — 죽은 링크 방지.
  { label: '도움센터', href: '/#contact' },
];

export default function MarketingHeader() {
  const brand = useSiteBrand();
  const padY = brand?.headerPaddingY ?? 14;
  const [menuOpen, setMenuOpen] = useState(false);

  // Base font size — Tailwind 크기는 rem 기반이므로 루트 font-size 를 바꾸면 마케팅
  // 텍스트 전체가 비례 확대된다. 언마운트 시 원복하여 테넌트 라우트로 새지 않게 한다.
  const baseFontPx = brand?.baseFontPx ?? null;
  useEffect(() => {
    if (!baseFontPx) return;
    const el = document.documentElement;
    const prev = el.style.fontSize;
    el.style.fontSize = `${baseFontPx}px`;
    return () => { el.style.fontSize = prev; };
  }, [baseFontPx]);

  const mobileLinkClass = 'rounded-lg px-2 py-3 text-[15px] text-[#4b5464] hover:bg-[#f5f6f8]';

  return (
    <header className="sticky top-0 z-50 border-b border-[#eceef2] bg-white/95 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-5 sm:px-10"
        style={{ paddingTop: padY, paddingBottom: padY }}
      >
        <SiteLogo />
        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[15px] text-[#4b5464] transition-colors hover:text-[#16181d]">
              {n.label}
            </a>
          ))}
        </nav>
        {/* Desktop actions */}
        <div className="hidden items-center gap-4 lg:flex">
          <a href="https://admin.truelight.app" className="whitespace-nowrap text-[15px] text-[#4b5464] transition-colors hover:text-[#16181d]">
            로그인
          </a>
          <a
            href="/apply"
            className="whitespace-nowrap rounded-lg bg-[#2b7fff] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#1466d6]"
          >
            상담 신청
          </a>
        </div>
        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="메뉴"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#16181d] hover:bg-[#f5f6f8] lg:hidden"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>
      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="border-t border-[#eceef2] bg-white lg:hidden">
          <div className="mx-auto flex max-w-[1080px] flex-col px-5 py-2">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className={mobileLinkClass}>
                {n.label}
              </a>
            ))}
            <a href="https://admin.truelight.app" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>
              로그인
            </a>
            <a
              href="/apply"
              onClick={() => setMenuOpen(false)}
              className="mb-1 mt-2 rounded-lg bg-[#2b7fff] px-4 py-3 text-center text-[15px] font-semibold text-white hover:bg-[#1466d6]"
            >
              상담 신청
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
