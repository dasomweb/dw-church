'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DemoRequestButton from '../../components/DemoRequestButton';
import KakaoInquiryButton from '../../components/KakaoInquiryButton';
import SiteLogo from '../../components/SiteLogo';
import FaviconSetter from '../../components/FaviconSetter';

type Lang = 'ko' | 'en';

interface Group {
  title: string;
  intro: string;
  items: { name: string; desc: string }[];
}

// 실제 TrueLight에 구현된 기능만 — 콘텐츠 모듈 + 요금제에 포함된 항목 기준.
const COPY: Record<Lang, {
  back: string; nav: string;
  title: string; subtitle: string;
  groups: Group[];
  ctaTitle: string; ctaDesc: string; demo: string; apply: string;
  note: string;
}> = {
  ko: {
    back: '← 홈으로',
    nav: '기능',
    title: '교회에 필요한 기능, 실제로 다 있습니다',
    subtitle: 'TrueLight에 구현되어 바로 사용할 수 있는 기능들입니다. 관리자에서 등록하면 홈페이지에 바로 반영됩니다.',
    groups: [
      {
        title: '매주 올리는 콘텐츠',
        intro: '주중에 교회가 직접 등록하는 콘텐츠입니다.',
        items: [
          { name: '설교', desc: '유튜브 영상을 연동하고 설교자·카테고리로 분류합니다. 설교자 필터와 검색, 유튜브 썸네일 자동 표시(직접 업로드도 가능)를 지원합니다.' },
          { name: '주보', desc: '매주 주보를 PDF 또는 이미지로 등록하면 날짜별 목록으로 정리되어, 성도들이 언제든 열람할 수 있습니다.' },
          { name: '사진 앨범', desc: '교회 행사 사진을 갤러리로 모아 보여 줍니다. 카테고리로 나누고, 클릭하면 큰 화면(라이트박스)으로 확대해 봅니다.' },
          { name: '목회 칼럼', desc: '담임목사·교역자의 글을 칼럼으로 연재합니다. 성도들이 목회 메시지를 꾸준히 읽을 수 있습니다.' },
          { name: '교회 연혁', desc: '교회의 발자취를 연도별 타임라인으로 정리해 보여 줍니다.' },
          { name: '영상', desc: '예배·찬양·교육 영상을 게시판으로 모아 카테고리별로 안내합니다.' },
        ],
      },
      {
        title: '교회 안내',
        intro: '한 번 정해 두면 교회의 얼굴이 되는 소개 페이지입니다.',
        items: [
          { name: '담임목사 인사말', desc: '담임목사의 인사말과 사진으로 방문자를 맞이합니다.' },
          { name: '교회 소개', desc: '교회의 비전·신앙고백·예배 철학 등을 정리해 소개합니다.' },
          { name: '교역자 소개', desc: '담임목사와 교역자를 사진·약력·연락처와 함께 소개합니다.' },
          { name: '예배 안내', desc: '주일예배·새벽기도·구역모임 등 예배 시간표를 한눈에 안내합니다.' },
          { name: '오시는 길', desc: '교회 주소와 지도, 주차 안내를 함께 제공합니다.' },
          { name: '교육부·부서 소개', desc: '교육부, 부서·사역 페이지로 각 사역을 자세히 안내합니다.' },
        ],
      },
      {
        title: '소통과 참여',
        intro: '성도와 새가족이 교회와 연결되는 통로입니다.',
        items: [
          { name: '게시판', desc: '공지·행사·선교·자유 게시판 등 필요한 만큼 게시판을 두고 교회 소식을 나눕니다.' },
          { name: '새가족 등록', desc: '새가족 안내 페이지와 등록 폼을 제공합니다. 제출된 내용은 관리자에서 확인·관리합니다.' },
          { name: '목장 사역', desc: '목장(구역)과 목자를 소개하고, 목장 사역을 안내합니다.' },
          { name: '온라인 헌금 안내', desc: '헌금 계좌·방법을 안내하는 페이지를 제공합니다.' },
          { name: '소셜 버튼', desc: '교회 유튜브·인스타그램·카카오 등 채널로 바로 연결되는 버튼을 둡니다.' },
        ],
      },
      {
        title: '사이트 운영',
        intro: '교회가 직접 운영하되, 시작과 기반은 전문가가 갖춰 드립니다.',
        items: [
          { name: '전문 디자인 셋업', desc: '처음 시작할 때 교회에 어울리는 디자인을 전문가가 구축해 드립니다. 이후 콘텐츠는 교회가 직접 관리합니다.' },
          { name: '디자인 테마', desc: '교회 분위기에 맞는 여러 디자인 테마 중에서 선택할 수 있습니다.' },
          { name: '교회 전용 주소', desc: '교회만의 인터넷 주소(예: yourchurch.com)를 보안 인증서와 함께 연결합니다.' },
          { name: '모바일 대응', desc: '휴대폰·태블릿·컴퓨터 어디서나 깔끔하게 보입니다. 추가 작업이 필요 없습니다.' },
          { name: '배너 슬라이더', desc: '메인 페이지 상단에 주요 소식을 배너 슬라이드로 강조합니다.' },
          { name: '콘텐츠 내보내기', desc: '등록한 콘텐츠를 내보내 백업할 수 있습니다.' },
          { name: '관리자 계정', desc: '여러 명이 함께 관리할 수 있도록 요금제에 따라 관리자 계정을 제공합니다.' },
        ],
      },
    ],
    ctaTitle: '우리 교회 홈페이지, 직접 둘러보세요',
    ctaDesc: '실제 관리자 화면을 데모로 체험하거나, 바로 신청해 시작할 수 있습니다.',
    demo: '데모 체험 신청',
    apply: '신청하고 시작하기',
    note: '표시된 기능은 요금제에 따라 제공 범위가 다를 수 있습니다.',
  },
  en: {
    back: '← Home',
    nav: 'Features',
    title: 'Everything your church needs — actually built in',
    subtitle: 'Features that are implemented and ready in TrueLight. Add content in the admin and it appears on your site right away.',
    groups: [
      {
        title: 'Weekly content',
        intro: 'Content your church adds during the week.',
        items: [
          { name: 'Sermons', desc: 'Embed YouTube videos and organize by speaker and category. Speaker filtering, search, and automatic YouTube thumbnails (custom upload too).' },
          { name: 'Bulletins', desc: 'Add each weekly bulletin as a PDF or image; they are listed by date for members to read anytime.' },
          { name: 'Photo albums', desc: 'Collect event photos into galleries, organized by category, with a full-screen lightbox view.' },
          { name: 'Pastoral columns', desc: 'Publish writings from your pastors as an ongoing column.' },
          { name: 'Church history', desc: 'Present your church’s journey as a year-by-year timeline.' },
          { name: 'Videos', desc: 'Gather worship, praise, and teaching videos into categorized boards.' },
        ],
      },
      {
        title: 'Church info',
        intro: 'Set once — these become the face of your church.',
        items: [
          { name: 'Pastor’s greeting', desc: 'Welcome visitors with your pastor’s greeting and photo.' },
          { name: 'About the church', desc: 'Share your vision, confession of faith, and worship philosophy.' },
          { name: 'Staff directory', desc: 'Introduce pastors and staff with photos, bios, and contact info.' },
          { name: 'Worship info', desc: 'Show your worship schedule at a glance.' },
          { name: 'Directions', desc: 'Provide your address, a map, and parking guidance.' },
          { name: 'Ministries', desc: 'Detail education and ministry departments on dedicated pages.' },
        ],
      },
      {
        title: 'Community',
        intro: 'How members and newcomers connect with your church.',
        items: [
          { name: 'Boards', desc: 'Notice, event, mission, and open boards — as many as you need to share news.' },
          { name: 'Newcomer registration', desc: 'A newcomer info page and registration form; submissions are managed in the admin.' },
          { name: 'Cell ministry', desc: 'Introduce cells (small groups) and their leaders.' },
          { name: 'Online giving info', desc: 'A page explaining giving accounts and methods.' },
          { name: 'Social buttons', desc: 'Quick links to your church’s YouTube, Instagram, KakaoTalk, and more.' },
        ],
      },
      {
        title: 'Running your site',
        intro: 'Your church operates it — we set up the foundation.',
        items: [
          { name: 'Professional setup', desc: 'We build a church-fitting design at the start; your church manages content afterward.' },
          { name: 'Design themes', desc: 'Choose from several designs that fit your church’s feel.' },
          { name: 'Your own address', desc: 'Connect your own domain (e.g., yourchurch.com) with a secure certificate.' },
          { name: 'Mobile-ready', desc: 'Looks clean on phones, tablets, and computers — no extra work.' },
          { name: 'Banner slider', desc: 'Highlight key news in a banner slider on the home page.' },
          { name: 'Content export', desc: 'Export your content for backup.' },
          { name: 'Admin accounts', desc: 'Multiple admin accounts so a team can manage together (by plan).' },
        ],
      },
    ],
    ctaTitle: 'See your church website for yourself',
    ctaDesc: 'Try the real admin in a demo, or apply to get started right away.',
    demo: 'Request a demo',
    apply: 'Apply to start',
    note: 'Available features may vary by plan.',
  },
};

export default function FeaturesPage() {
  const [lang, setLang] = useState<Lang>('ko');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tl_lang');
      if (saved === 'ko' || saved === 'en') setLang(saved);
    } catch { /* ignore */ }
  }, []);
  const t = COPY[lang];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <SiteLogo />
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5 text-xs font-medium">
              <button onClick={() => { setLang('ko'); try { localStorage.setItem('tl_lang', 'ko'); } catch { /* ignore */ } }}
                className={`rounded-md px-2 py-1 ${lang === 'ko' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>KO</button>
              <button onClick={() => { setLang('en'); try { localStorage.setItem('tl_lang', 'en'); } catch { /* ignore */ } }}
                className={`rounded-md px-2 py-1 ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>EN</button>
            </div>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">{t.back}</Link>
            <a href="/apply" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{t.apply}</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-4xl" style={{ letterSpacing: '-0.5px' }}>{t.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">{t.subtitle}</p>
      </section>

      {/* Groups */}
      <div className="mx-auto max-w-6xl space-y-14 px-4 pb-16 sm:px-6">
        {t.groups.map((g) => (
          <section key={g.title}>
            <h2 className="text-xl font-bold text-gray-900">{g.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{g.intro}</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <div key={it.name} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
                  <h3 className="text-base font-semibold text-gray-900">{it.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{it.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <p className="text-center text-xs text-gray-400">{t.note}</p>
      </div>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 text-center sm:px-6">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{t.ctaTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">{t.ctaDesc}</p>
        <div className="mt-7 flex justify-center gap-3">
          <DemoRequestButton lang={lang} className="rounded-lg bg-white border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100" />
          <a href="/apply" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700">{t.apply}</a>
        </div>
      </section>

      <KakaoInquiryButton />
      <FaviconSetter />
    </div>
  );
}
