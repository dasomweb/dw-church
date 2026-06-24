import Link from 'next/link';
import { getCaseStudies } from '../../lib/api';
import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';

export const metadata = {
  title: '포트폴리오 — TRUE LIGHT',
  description: 'TRUE LIGHT로 만든 교회 홈페이지를 만나보세요.',
};

interface CaseStudy {
  id: string;
  churchName: string;
  tagline: string | null;
  screenshotUrl: string | null;
  liveUrl: string | null;
  tags: string[];
}

export default async function PortfolioPage() {
  const cases = (await getCaseStudies()) as CaseStudy[];

  return (
    <main className="min-h-screen bg-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Portfolio</p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">TRUE LIGHT로 만든 교회들</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
            실제 교회들이 TRUE LIGHT로 온라인 사역을 시작했습니다. 카드를 눌러 직접 둘러보세요.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {cases.length === 0 ? (
          <p className="py-20 text-center text-gray-400">곧 사례가 공개됩니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => {
              const Card = (
                <div className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                    {c.screenshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.screenshotUrl} alt={c.churchName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">⛪</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900">{c.churchName}</h3>
                    {c.tagline && <p className="mt-1.5 line-clamp-2 text-sm text-gray-500">{c.tagline}</p>}
                    {c.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.tags.map((t) => (
                          <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">{t}</span>
                        ))}
                      </div>
                    )}
                    {c.liveUrl && (
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                        사이트 보기
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </span>
                    )}
                  </div>
                </div>
              );
              return c.liveUrl ? (
                <a key={c.id} href={c.liveUrl} target="_blank" rel="noreferrer" className="block h-full">{Card}</a>
              ) : (
                <div key={c.id} className="h-full">{Card}</div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900">우리 교회도 시작할까요?</h2>
          <p className="mt-3 text-gray-600">신청하시면 전문가가 교회에 맞춰 홈페이지를 만들어 드립니다.</p>
          <Link href="/apply" className="mt-6 inline-block rounded-lg bg-blue-600 px-7 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            시작하기
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
