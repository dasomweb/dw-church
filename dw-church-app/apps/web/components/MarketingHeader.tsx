'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SiteLogo from './SiteLogo';
import { useSiteBrand } from './useSiteBrand';

// truelight.app 마케팅 헤더 — "웹사이트 전체 시안" 기준. 멀티페이지: 각 메뉴가
// 독립 라우트로 이동한다(원페이지 #앵커 폐기). 다크 유틸바 + 화이트 헤더(스티키).
const NAV = [
  { label: '시스템 소개', href: '/system' },
  { label: '홈페이지', href: '/website' },
  { label: '교적관리', href: '/membership' },
  { label: '요금', href: '/pricing' },
  { label: '도입 사례', href: '/churches' },
  { label: '개척교회 지원', href: '/support-program' },
  { label: '회사 소개', href: '/company' },
];

const UTILITY = [
  { label: '도입 문의', href: '/apply' },
  { label: '도움센터', href: '/help' },
  // /login = 테넌트 관리자 진입점(슈퍼어드민 문이 아님). 로그인하면 각 교회 관리자는
  // 자기 도메인으로, 일반회원은 권한없음, 슈퍼어드민은 슈퍼어드민 콘솔로 라우팅된다.
  { label: '로그인', href: '/login' },
];

export default function MarketingHeader() {
  const brand = useSiteBrand();
  const padY = brand?.headerPaddingY ?? 16;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const baseFontPx = brand?.baseFontPx ?? null;
  useEffect(() => {
    if (!baseFontPx) return;
    const el = document.documentElement;
    const prev = el.style.fontSize;
    el.style.fontSize = `${baseFontPx}px`;
    return () => { el.style.fontSize = prev; };
  }, [baseFontPx]);

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Utility bar */}
      <div className="hidden bg-[#0b1420] text-[#8497b3] lg:block">
        <div className="mx-auto flex h-[42px] max-w-[1200px] items-center gap-6 px-6 text-[12.5px] font-medium">
          <span className="text-[#c3d3ea]">미주 한인교회를 위한 교회 행정 통합 시스템</span>
          <div className="ml-auto flex items-center gap-6">
            {UTILITY.map((u) => (
              <a key={u.href} href={u.href} className="transition-colors hover:text-white">{u.label}</a>
            ))}
            <span className="text-white">KO<span className="text-[#3c5273]"> / </span><span className="text-[#5b6d8a]">EN</span></span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-[#e5e7eb]">
        <div
          className="mx-auto flex max-w-[1200px] items-center gap-4 px-5 sm:px-6"
          style={{ paddingTop: padY, paddingBottom: padY }}
        >
          <SiteLogo />
          {/* Desktop nav */}
          <nav className="ml-2 hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`text-[15px] font-[650] transition-colors ${
                  isActive(n.href)
                    ? 'text-[#1466d6] [border-bottom:2px_solid_#1466d6] pb-[3px]'
                    : 'text-[#3c4353] hover:text-[#16181d]'
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          {/* Desktop actions */}
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <a href="/login" className="whitespace-nowrap px-3 py-[11px] text-[14px] font-bold text-[#3c4353] transition-colors hover:text-[#1466d6]">
              로그인
            </a>
            <a href="/apply" className="whitespace-nowrap rounded-[9px] border border-[#cdd3de] px-5 py-[11px] text-[14px] font-bold text-[#16181d] transition-colors hover:bg-[#f5f6f8]">
              데모 신청
            </a>
            <a href="/apply" className="whitespace-nowrap rounded-[9px] bg-[#2b7fff] px-[22px] py-[11px] text-[14px] font-bold text-white transition-colors hover:bg-[#1466d6]">
              도입 상담
            </a>
          </div>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="메뉴"
            aria-expanded={menuOpen}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#16181d] hover:bg-[#f5f6f8] lg:hidden"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <nav className="absolute left-0 right-0 top-full h-[100dvh] overflow-y-auto border-t border-[#eceef2] bg-white lg:hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col px-5 py-3">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-2 py-3 text-[16px] ${isActive(n.href) ? 'font-bold text-[#1466d6]' : 'text-[#3c4353]'}`}>
                {n.label}
              </a>
            ))}
            <div className="my-2 h-px bg-[#eceef2]" />
            {UTILITY.map((u) => (
              <a key={u.href} href={u.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-[15px] text-[#61697a]">{u.label}</a>
            ))}
            <a href="/apply" onClick={() => setMenuOpen(false)} className="mb-1 mt-3 rounded-[10px] bg-[#2b7fff] px-4 py-3 text-center text-[16px] font-bold text-white hover:bg-[#1466d6]">
              도입 상담 신청
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
