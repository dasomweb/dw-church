'use client';

import type { Banner } from '@dw-church/api-client';
import { HeroBannerClient } from './blocks/HeroBannerClient';

// Front Hero — reuses the existing banner system (BannerSlider via HeroBannerClient)
// as the rotating photo backdrop, with the 시안 hero copy + 2 CTAs overlaid on a
// left-dark gradient. Photos are self-hosted on R2 (대표님 확정 hero-worship). Add
// more slides here to make it rotate; a single slide renders with no dots/arrows.
const R2 = 'https://pub-674328f08783498389f7857dc6e1ab00.r2.dev';

const SLIDES = [
  {
    id: 'hero-worship',
    pcImageUrl: `${R2}/_samples/frontpage/hero-worship.jpg`,
    mobileImageUrl: `${R2}/_samples/frontpage/hero-worship.jpg`,
    title: '주일 예배',
    linkUrl: null,
    linkTarget: '_self',
    // no per-slide tint — the hero paints its own left gradient below
    textOverlay: { overlayEnabled: false },
  },
] as unknown as Banner[];

export default function MarketingHero() {
  return (
    <section className="relative isolate bg-[#0f1b2d]">
      {/* rotating photo backdrop (existing banner slider) */}
      <HeroBannerClient banners={SLIDES} overlayOpacity={0} desktopHeight="620px" tabletHeight="500px" mobileHeight="600px" />

      {/* left-dark gradient for legibility */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'linear-gradient(100deg,rgba(9,16,29,.93) 0%,rgba(9,16,29,.7) 46%,rgba(9,16,29,.18) 100%)' }}
      />

      {/* hero copy + CTAs */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-6">
          <div className="max-w-[720px] text-white">
            <span className="inline-flex rounded-full border border-[rgba(143,192,255,.32)] bg-[rgba(43,127,255,.16)] px-3.5 py-2 text-[11.5px] font-extrabold tracking-[0.1em] text-[#8fc0ff]">
              CHURCH ADMINISTRATION SYSTEM
            </span>
            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.2] tracking-[-0.045em] sm:text-[48px] lg:text-[56px]">
              교회 홈페이지와 교적관리를<br className="hidden sm:block" /> 하나의 시스템에서
            </h1>
            <p className="mt-5 max-w-[600px] text-[16px] leading-[1.75] text-[#e6eefb] sm:text-[19px]">
              홈페이지 빌더가 아닙니다. 교적·목장·새가족·출석을 관리하고, 등록한 자료가 홈페이지에 그대로 반영되는 교회 행정 시스템입니다.
            </p>
            <div className="pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/apply" className="inline-flex min-h-[52px] items-center justify-center rounded-[11px] bg-[#2b7fff] px-8 text-[16px] font-extrabold text-white transition-colors hover:bg-[#1466d6]">
                도입 상담 신청
              </a>
              <a href="https://dasom.truelight.app" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[52px] items-center justify-center rounded-[11px] border border-[rgba(255,255,255,.5)] px-8 text-[16px] font-bold text-white transition-colors hover:bg-[rgba(255,255,255,.1)]">
                관리자 화면 데모
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
