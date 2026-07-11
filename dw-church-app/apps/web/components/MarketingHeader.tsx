'use client';

import { useEffect, useState } from 'react';
import SiteLogo from './SiteLogo';
import FeaturesNavMenu from './FeaturesNavMenu';
import { useMarketingLang } from './useMarketingLang';
import { useSiteBrand } from './useSiteBrand';

// Global truelight.app marketing header — one component shared by every marketing
// page (home, features, portfolio, apply, …) so they stay consistent. Vertical
// padding is operator-configurable via marketing-config (super-admin 사이트 설정).
const NAV = {
  ko: { features: '기능', how: '이용 방법', plans: '요금제', portfolio: '포트폴리오', signIn: '로그인', getStarted: '시작하기' },
  en: { features: 'Features', how: 'How It Works', plans: 'Plans', portfolio: 'Portfolio', signIn: 'Sign In', getStarted: 'Get Started' },
} as const;

export default function MarketingHeader() {
  const { lang, setLang } = useMarketingLang();
  const brand = useSiteBrand();
  const t = NAV[lang];
  const padY = brand?.headerPaddingY ?? 12;
  const [menuOpen, setMenuOpen] = useState(false);

  // Base font size — Tailwind text sizes are rem-based, so setting the root
  // font-size scales all marketing-site text proportionally. Reset on unmount so
  // it never bleeds into tenant routes. MarketingHeader is on every marketing page.
  const baseFontPx = brand?.baseFontPx ?? null;
  useEffect(() => {
    if (!baseFontPx) return;
    const el = document.documentElement;
    const prev = el.style.fontSize;
    el.style.fontSize = `${baseFontPx}px`;
    return () => { el.style.fontSize = prev; };
  }, [baseFontPx]);

  const langToggle = (
    <div className="flex items-center rounded-lg border border-gray-200 p-0.5 text-xs font-medium">
      <button
        onClick={() => setLang('ko')}
        className={`rounded-md px-2 py-1 transition-colors ${lang === 'ko' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
        aria-pressed={lang === 'ko'}
      >
        한국어
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-md px-2 py-1 transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );

  const mobileLinkClass = 'rounded-lg px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6"
        style={{ paddingTop: padY, paddingBottom: padY }}
      >
        <SiteLogo />
        {/* Desktop nav */}
        <nav className="hidden gap-6 md:flex">
          <FeaturesNavMenu lang={lang} label={t.features} />
          <a href="/#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">{t.how}</a>
          <a href="/#plans" className="text-sm text-gray-600 hover:text-gray-900">{t.plans}</a>
          <a href="/portfolio" className="text-sm text-gray-600 hover:text-gray-900">{t.portfolio}</a>
        </nav>
        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          {langToggle}
          <a href="https://admin.truelight.app" className="whitespace-nowrap text-sm text-gray-600 hover:text-gray-900">{t.signIn}</a>
          <a href="/apply" className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{t.getStarted}</a>
        </div>
        {/* Mobile: compact language toggle + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {langToggle}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="메뉴"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>
      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
            <a href="/#features" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>{t.features}</a>
            <a href="/#how-it-works" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>{t.how}</a>
            <a href="/#plans" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>{t.plans}</a>
            <a href="/portfolio" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>{t.portfolio}</a>
            <a href="https://admin.truelight.app" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>{t.signIn}</a>
            <a href="/apply" onClick={() => setMenuOpen(false)} className="mb-1 mt-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700">{t.getStarted}</a>
          </div>
        </nav>
      )}
    </header>
  );
}
