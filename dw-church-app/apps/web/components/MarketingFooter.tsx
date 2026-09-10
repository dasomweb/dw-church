'use client';

import { useSiteBrand } from './useSiteBrand';

// truelight.app 마케팅 푸터 — "웹사이트 전체 시안" 기준. 딥 밴드(#0b1420), 5단.
// 연락처는 실제값(info@dasomweb.com · Suwanee, GA) — 시안의 hello@truelight.app 플레이스홀더 대체.
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: '시스템',
    links: [
      { label: '시스템 소개', href: '/system' },
      { label: '홈페이지', href: '/website' },
      { label: '교적관리', href: '/membership' },
      { label: '맞춤 제작', href: '/apply' },
    ],
  },
  {
    title: '요금',
    links: [
      { label: '요금 안내', href: '/pricing' },
      { label: '초기 구축', href: '/pricing' },
      { label: '부가기능', href: '/pricing' },
      { label: '결제 조건', href: '/terms' },
    ],
  },
  {
    title: '지원',
    links: [
      { label: '도움센터', href: '/help' },
      { label: '도입 상담', href: '/apply' },
      { label: '개척교회 지원', href: '/support-program' },
      // 로그인 입구는 공개 마케팅 사이트에 노출하지 않는다(각 교회 자기 사이트에서만 진입).
    ],
  },
  {
    title: '회사',
    links: [
      { label: '회사 소개', href: '/company' },
      { label: '도입 사례', href: '/churches' },
      { label: '이용약관', href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
];

export default function MarketingFooter() {
  const brand = useSiteBrand();
  const padY = brand?.footerPaddingY ?? 56;

  return (
    <footer className="bg-[#0b1420] px-5 text-[#8497b3] sm:px-6" style={{ paddingTop: padY, paddingBottom: 28 }}>
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 border-b border-[#1d2b40] pb-9 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2b7fff] text-[11.5px] font-extrabold text-white">TL</div>
              <b className="text-[16px] tracking-[-0.03em] text-white">TRUE LIGHT</b>
            </div>
            <p className="mb-3.5 max-w-xs text-[13.5px] leading-[1.85]">미주 한인교회를 위한 교회 행정 통합 시스템.</p>
            <div className="text-[13.5px] leading-[1.95]">
              <a href="mailto:info@dasomweb.com" className="text-[#c3d3ea] hover:text-white">info@dasomweb.com</a><br />
              <a href="tel:+14708395151" className="text-[#c3d3ea] hover:text-white">1-470-839-5151</a><br />
              <span className="text-[#7f8da3]">1172 Satellite Blvd NW Ste 110, Suwanee, GA 30024</span>
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <b className="mb-3.5 block text-[13px] text-white">{col.title}</b>
              <ul className="space-y-2 text-[13.5px]">
                {col.links.map((l) => (
                  <li key={l.label + l.href}><a href={l.href} className="transition-colors hover:text-white">{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-[22px] text-[12.5px] text-[#7f8da3]">© {new Date().getFullYear()} TRUE LIGHT · Suwanee, GA · info@dasomweb.com</div>
      </div>
    </footer>
  );
}
