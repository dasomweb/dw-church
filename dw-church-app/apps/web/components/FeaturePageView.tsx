'use client';

import Link from 'next/link';
import DemoRequestButton from './DemoRequestButton';
import KakaoInquiryButton from './KakaoInquiryButton';
import FaviconSetter from './FaviconSetter';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';
import { useMarketingLang } from './useMarketingLang';
import { FEATURE_GROUPS, FEATURE_CHROME, type FeatureSlug } from '../app/features/featuresData';

export default function FeaturePageView({ slug }: { slug: FeatureSlug }) {
  const { lang } = useMarketingLang();

  const group = FEATURE_GROUPS.find((g) => g.slug === slug)!;
  const side = group[lang];
  const c = FEATURE_CHROME[lang];

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* Hero banner */}
      <section className={`bg-gradient-to-br ${group.accent}`}>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d={group.icon} />
            </svg>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">{c.sectionLabel}</p>
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-4xl" style={{ letterSpacing: '-0.5px' }}>{side.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">{side.heroSubtitle}</p>
        </div>
      </section>

      {/* Tab nav across the 4 feature pages */}
      <nav className="sticky top-[57px] z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
          {FEATURE_GROUPS.map((g) => {
            const active = g.slug === slug;
            return (
              <Link key={g.slug} href={`/features/${g.slug}`}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                {g[lang].tab}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Items */}
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {side.items.map((it) => (
            <div key={it.name} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <h3 className="text-base font-semibold text-gray-900">{it.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{it.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-gray-400">{c.note}</p>
      </div>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 text-center sm:px-6">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{c.ctaTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">{c.ctaDesc}</p>
        <div className="mt-7 flex justify-center gap-3">
          <DemoRequestButton lang={lang} className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100" />
          <a href="/apply" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700">{c.apply}</a>
        </div>
      </section>

      <MarketingFooter />
      <KakaoInquiryButton />
      <FaviconSetter />
    </div>
  );
}
