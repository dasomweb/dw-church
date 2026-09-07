'use client';

import { useSiteBrand } from './useSiteBrand';

// truelight.app 마케팅 푸터 — 시안 v2. 딥 밴드(#0f1b2d), 국문 단일.
// 모든 마케팅 페이지가 공유. 세로 패딩은 super-admin(사이트 설정)에서 조정.
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: '서비스',
    links: [
      { label: '맡기는 방식', href: '/#approach' },
      { label: '교회 행정', href: '/#admin' },
      { label: '요금', href: '/#pricing' },
      { label: '함께한 교회', href: '/#churches' },
    ],
  },
  {
    title: '지원',
    links: [
      { label: '도움센터', href: '/#contact' }, // 전용 도움센터 라우트 신설 전까지 상담 섹션으로
      { label: '상담 신청', href: '/apply' },
      { label: '결제 조건', href: '/terms' },
      { label: '관리자 로그인', href: 'https://admin.truelight.app' },
    ],
  },
  {
    title: '회사',
    links: [
      { label: 'DASOMWEB 소개', href: '/#contact' }, // 전용 회사소개 페이지 신설 전까지 상담 섹션으로
      { label: '이용약관', href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
];

export default function MarketingFooter() {
  const brand = useSiteBrand();
  const padY = brand?.footerPaddingY ?? 56;

  return (
    <footer className="bg-[#0f1b2d] px-5 text-white sm:px-10" style={{ paddingTop: padY, paddingBottom: padY }}>
      <div className="mx-auto max-w-[1080px]">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="text-lg font-bold tracking-tight text-white">TRUE <span className="text-[#4d93ff]">LIGHT</span></span>
            <p className="mt-3 max-w-xs text-[14px] leading-[1.75] text-[#aab6c7]">
              미주 한인 이민교회의 온라인 사역과 교회 행정을 함께 맡는 시스템.
            </p>
            <p className="mt-4 text-[14px] text-[#aab6c7]">
              <a href="mailto:info@dasomweb.com" className="text-[#dbe3ee] hover:text-white">info@dasomweb.com</a>
              <span className="text-[#7f8da3]"> · </span>
              <a href="tel:+14708395151" className="text-[#dbe3ee] hover:text-white">1-470-839-5151</a>
            </p>
            <p className="mt-2 text-[13px]" style={{ color: '#7f8da3', lineHeight: 1.6 }}>
              1172 Satellite Blvd NW Ste 110, Suwanee, GA 30024<br />
              상담 시간 · 월–금 오전 9시–오후 5시 (EST)
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-[13px] font-bold tracking-[0.04em] text-white">{col.title}</h4>
              <ul className="space-y-2.5 text-[14px] text-[#aab6c7]">
                {col.links.map((l) => (
                  <li key={l.label}><a href={l.href} className="transition-colors hover:text-white">{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-[12.5px] text-[#7f8da3]">
          © 2026 TRUE LIGHT. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
