'use client';

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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6"
        style={{ paddingTop: padY, paddingBottom: padY }}
      >
        <SiteLogo />
        <nav className="hidden gap-6 md:flex">
          <FeaturesNavMenu lang={lang} label={t.features} />
          <a href="/#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">{t.how}</a>
          <a href="/#plans" className="text-sm text-gray-600 hover:text-gray-900">{t.plans}</a>
          <a href="/portfolio" className="text-sm text-gray-600 hover:text-gray-900">{t.portfolio}</a>
        </nav>
        <div className="flex items-center gap-3">
          {/* Language toggle — Korean is primary */}
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
          <a href="https://admin.truelight.app" className="text-sm text-gray-600 hover:text-gray-900">{t.signIn}</a>
          <a href="/apply" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{t.getStarted}</a>
        </div>
      </div>
    </header>
  );
}
