'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MarketingHeader from '../../../components/MarketingHeader';
import MarketingFooter from '../../../components/MarketingFooter';

// /apply/done — 상담 신청 완료(시안 상세 §2). 신청 이메일이 ?email= 로 넘어오면
// 본문에 표시하고, 없으면 일반 문구로 대체한다. 색·타입은 랜딩 v2 디자인 시스템.

const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

function DoneBody() {
  const email = (useSearchParams().get('email') || '').trim();

  return (
    <div className="mx-auto max-w-2xl text-center">
      {/* ✓ 원형 아이콘 (연블루) */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f8ff]">
        <svg className="h-8 w-8 text-[#1466d6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h1 className="mt-6 text-[30px] text-[#16181d] sm:text-[38px]" style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.25 }}>
        잘 받았습니다.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-[16px] text-[#4b5464] sm:text-[17px]" style={{ lineHeight: 1.85 }}>
        교회의 이야기를 읽어 보고{' '}
        {email ? <b className="font-semibold text-[#16181d]">{email}</b> : '남겨 주신 이메일'}
        로 연락드리겠습니다. 그 사이에 궁금한 것이 생기시면 확인 메일에 답장만 주셔도 됩니다.
      </p>

      {/* 연락드릴 때 이런 것을 여쭙습니다 (웜) */}
      <div className="mt-10 rounded-2xl border border-[#e7e4de] bg-[#fbfaf8] p-6 text-left sm:p-8">
        <h2 className="text-[17px] font-bold text-[#16181d]">연락드릴 때 이런 것을 여쭙습니다</h2>
        <ul className="mt-4 space-y-3 text-[15px] text-[#4b5464]">
          {[
            '예배 시간과 오시는 길처럼 홈페이지에 꼭 들어가야 하는 정보',
            '지금 쓰시는 사이트에서 옮기고 싶은 내용',
            '교적·목장·새가족을 지금 어떻게 관리하고 계신지',
            '언제까지 오픈하고 싶으신지',
          ].map((line) => (
            <li key={line} className="flex gap-2.5" style={{ lineHeight: 1.7 }}>
              <span aria-hidden className="mt-[2px] text-[#1466d6]">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-[#e7e4de] pt-4 text-[14px] text-[#61697a]" style={{ lineHeight: 1.7 }}>
          미리 준비하지 않으셔도 됩니다. 통화하면서 함께 정리하겠습니다.
        </p>
      </div>

      {/* 버튼 2 (outline) */}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <a
          href="/churches"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#d5dae2] bg-white px-7 text-[16px] font-semibold text-[#16181d] transition-colors hover:bg-[#f5f6f8]"
        >
          함께한 교회 보기
        </a>
        <a
          href="/help"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#d5dae2] bg-white px-7 text-[16px] font-semibold text-[#16181d] transition-colors hover:bg-[#f5f6f8]"
        >
          도움센터
        </a>
      </div>
    </div>
  );
}

export default function ApplyDonePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <section className="bg-white">
          <div className={`${CONTAINER} py-16 sm:py-24`}>
            <Suspense
              fallback={<div className="mx-auto max-w-2xl text-center text-[15px] text-[#61697a]">불러오는 중…</div>}
            >
              <DoneBody />
            </Suspense>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
