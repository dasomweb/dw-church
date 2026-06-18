'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Bilingual copy (Korean is the primary/default language) ──────────────
// truelight.app marketing site. Korean renders by default (SSR + first paint);
// a KO/EN toggle in the header switches the client copy and persists the
// choice in localStorage. Add a key here and reference it as t.<key> below.
type Lang = 'ko' | 'en';

const SLIDE_IMAGES = [
  'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1680&h=720&fit=crop',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1680&h=720&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1680&h=720&fit=crop',
];

interface Copy {
  nav: { features: string; how: string; plans: string; signIn: string; getStarted: string };
  hero: { getStarted: string; seePlans: string; slides: { headline: string; subline: string }[] };
  trust: string[];
  value: { headlineTop: string; headlineAccent: string; body: string };
  featuresSection: { title: string; subtitle: string };
  features: { title: string; desc: string; icon: string }[];
  howSection: { title: string; subtitle: string };
  steps: { step: string; title: string; desc: string }[];
  plansSection: {
    title: string; subtitle: string;
    monthly: string; yearly: string; save: string;
    perMonth: string; billedYearly: string; setupOnce: string;
    includedTitle: string; included: string[];
    setupTitle: string; setupItems: string[];
    note: string; contact: string;
  };
  plans: {
    name: string; subtitle: string;
    monthly: number; yearly: number; setupFee: number;
    features: string[]; cta: string; highlighted: boolean; badge?: string;
  }[];
  custom: { eyebrow: string; title: string; description: string; features: string[]; oneTime: string; anyPlan: string; quote: string };
  cta: { title: string; body: string; primary: string; secondary: string };
  footer: { tagline: string; platform: string; pricing: string; embed: string; support: string; contact: string; adminLogin: string; company: string; terms: string; privacy: string; featuresLink: string };
}

const COPY: Record<Lang, Copy> = {
  ko: {
    nav: { features: '기능', how: '이용 방법', plans: '요금제', signIn: '로그인', getStarted: '시작하기' },
    hero: {
      getStarted: '시작하기',
      seePlans: '요금제 보기',
      slides: [
        { headline: '교회 웹사역을 쉽고 편리하게', subline: '복잡한 준비 없이 교회의 온라인 사역을 시작할 수 있습니다.' },
        { headline: '누구나 손쉽게 관리할 수 있습니다', subline: '어려운 설정이나 기술 없이 교회가 직접 콘텐츠를 올리고 관리합니다.' },
        { headline: '교회는 사역에만 집중할 수 있습니다', subline: '복잡한 기술과 관리는 솔루션이 처리하므로 교회는 본연의 사역에 전념할 수 있습니다.' },
      ],
    },
    trust: ['교회 전용 기능', '휴대폰에서도 완벽하게', '교회 전용 주소', '전문적인 관리', '든든한 지원'],
    value: {
      headlineTop: '교회의 온라인 사역,',
      headlineAccent: '전문 솔루션으로.',
      body: 'TRUE LIGHT는 교회의 온라인 사역을 위한 전문 솔루션입니다. 설교·주보부터 새가족·목장까지, 교회 운영에 필요한 기능을 한 곳에 담았습니다. 어려운 기술은 솔루션 안에 갖춰져 있어, 교회는 본연의 사역에 집중할 수 있습니다.',
    },
    featuresSection: { title: '교회에 필요한 모든 것', subtitle: '교회의 온라인 사역을 위해 만든 전문 기능들.' },
    features: [
      { title: '설교 관리', desc: '유튜브 연동, 카테고리, 설교자 필터, 썸네일 자동 추출.', icon: '🎙️' },
      { title: '주보', desc: '주보 PDF를 올리면 이미지로 표시. 성도들이 언제든 열람.', icon: '📄' },
      { title: '사진 앨범', desc: '교회의 순간을 아름다운 갤러리로. 라이트박스 뷰 지원.', icon: '📸' },
      { title: '교역자 소개', desc: '담임목사·교역자를 사진·약력·연락처와 함께 소개.', icon: '👥' },
      { title: '행사 안내', desc: '예배·수련회·특별행사를 카드와 위치 정보로 안내.', icon: '📅' },
      { title: '교회 전용 주소', desc: '교회만의 인터넷 주소(예: yourchurch.com)를 보안 인증과 함께.', icon: '🌐' },
      { title: '전문가 수준 디자인', desc: '교회에 어울리는 전문 디자인이 처음부터 갖춰진 채로 시작합니다.', icon: '🎨' },
      { title: '휴대폰에서도 완벽하게', desc: '휴대폰·태블릿·컴퓨터 어디서나 깔끔하게. 추가 작업이 필요 없습니다.', icon: '📱' },
      { title: '한국어·영어', desc: '한국어와 영어를 함께. 성도의 언어로 다가갑니다.', icon: '🌍' },
    ],
    howSection: { title: '이용 방법', subtitle: '신청부터 오픈까지, 네 단계.' },
    steps: [
      { step: '01', title: '신청 & 플랜 선택', desc: '교회에 맞는 플랜을 정하고 개발 신청서를 작성합니다.' },
      { step: '02', title: '전문 셋업', desc: '교회에 맞는 디자인이 적용되고, 기존 사이트가 있다면 구조와 디자인을 참고해 홈페이지가 완성됩니다.' },
      { step: '03', title: '콘텐츠 입력', desc: '설교·주보·사진·교역자 정보를 간편한 관리자에서 글과 사진만 등록합니다.' },
      { step: '04', title: '오픈', desc: '도메인을 연결하고 성도들에게 홈페이지를 공개합니다.' },
    ],
    plansSection: {
      title: '간단하고 투명한 요금제',
      subtitle: '교회 규모에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.',
      monthly: '월 결제', yearly: '연 결제', save: '연간 할인',
      perMonth: '/월', billedYearly: '연 1회 청구', setupOnce: '셋업비 1회',
      includedTitle: '모든 플랜 공통 포함',
      included: [
        '교회 전용 주소 + 보안 인증',
        '안정적인 관리·자동 백업',
        '휴대폰에서도 완벽하게',
        '고객지원',
      ],
      setupTitle: '셋업비(1회)에 포함되는 것',
      setupItems: [
        '교회에 맞는 전문 디자인 적용 및 초기 구성',
        '선택하신 플랜의 페이지·메뉴·기능 셋업',
        '기존 웹사이트가 있으면 디자인·구조 분석 후 사이트 구성에 반영',
        '예배 시간·오시는 길·교역자 등 기본 정보 입력',
        '도메인 연결 설정 (도메인은 교회에서 직접 구입)',
        '오픈 전 점검 후 사이트 공개',
      ],
      note: '셋업비는 초기 구축에 한 번만 발생하며, 이후에는 매달(또는 매년) 이용료만 부담합니다.\n더 큰 규모의 교회이신가요? 맞춤 플랜을',
      contact: '문의하세요',
    },
    plans: [
      {
        name: '라이트', subtitle: '소형 교회 시작용',
        monthly: 59, yearly: 49, setupFee: 300,
        features: ['프론트페이지', '담임목사 인사말', '교회 소개', '교역자 소개', '예배 안내', '오시는 길', '교육부 소개', '설교·주보 게시판', '온라인 헌금 안내', '소셜 버튼', '관리자 계정 2개'],
        cta: '시작하기', highlighted: false,
      },
      {
        name: '기본', subtitle: '성장하는 교회',
        monthly: 99, yearly: 79, setupFee: 500,
        features: ['라이트의 모든 기능', '사진 앨범', '교회 연혁', '목회 칼럼', '영상 게시판', '공지 게시판', '행사 게시판', '선교 게시판', '배너 슬라이더(메인페이지)', '콘텐츠 내보내기', '관리자 계정 3개'],
        cta: '시작하기', highlighted: true, badge: '가장 인기',
      },
      {
        name: '플러스', subtitle: '체계적인 교회 관리',
        monthly: 149, yearly: 119, setupFee: 700,
        features: ['기본의 모든 기능', '한국학교 소개', '한국학교 게시판', '새가족 안내', '새가족 등록 폼', '목장 사역·목자 소개', '관리자 계정 5개'],
        cta: '시작하기', highlighted: false,
      },
      {
        name: '프로', subtitle: '완성형 교회 플랫폼',
        monthly: 199, yearly: 159, setupFee: 1000,
        features: ['플러스의 모든 기능', '별도 추가 페이지(최대 25페이지)', '부서별·사역별 게시판', '중보기도 게시판', '관리자 계정 10개'],
        cta: '시작하기', highlighted: false,
      },
    ],
    custom: {
      eyebrow: '맞춤 디자인 서비스',
      title: '맞춤 디자인이 필요하세요?',
      description: '템플릿을 넘어선 고유한 디자인이 필요한 교회를 위해, 브랜드와 정체성에 맞춘 맞춤형 디자인을 함께 만들어 갑니다.',
      features: ['맞춤 홈·페이지 레이아웃', '브랜드 맞춤 색상·타이포그래피', '맞춤 로고·그래픽 요소', '교회 전용 디자인 템플릿'],
      oneTime: '1회성 디자인 비용', anyPlan: '모든 플랜과 호환', quote: '견적 받기 →',
    },
    cta: {
      title: '지금 시작할 준비 되셨나요?',
      body: '미국 전역의 교회들이 TRUE LIGHT로 온라인에서 성도들과 연결되고 있습니다.',
      primary: '지금 시작하기', secondary: '문의하기',
    },
    footer: {
      tagline: '현대 교회를 위한 전문 홈페이지 플랫폼.',
      platform: '플랫폼', featuresLink: '기능', pricing: '요금제', embed: '위젯 임베드',
      support: '지원', contact: '문의하기', adminLogin: '관리자 로그인',
      company: '회사', terms: '이용약관', privacy: '개인정보처리방침',
    },
  },
  en: {
    nav: { features: 'Features', how: 'How It Works', plans: 'Plans', signIn: 'Sign In', getStarted: 'Get Started' },
    hero: {
      getStarted: 'Get Started',
      seePlans: 'See Plans',
      slides: [
        { headline: 'Church web ministry made simple', subline: 'Start your church’s online ministry without the complicated setup.' },
        { headline: 'Easy for anyone to manage', subline: 'Your church adds and manages content directly — no technical skills needed.' },
        { headline: 'Focus on what matters most', subline: 'The platform handles the technical side, so your church can focus on its ministry.' },
      ],
    },
    trust: ['Church-specific tools', 'Great on phones', 'Your own church address', 'Professionally managed', 'Real support'],
    value: {
      headlineTop: 'Your Church Online,',
      headlineAccent: 'In One Solution.',
      body: 'TRUE LIGHT is a complete solution for your church’s online ministry — from sermons and bulletins to newcomers and small groups, all in one place. The technical work is built into the solution, so your church can focus on what matters most: ministry.',
    },
    featuresSection: { title: 'Everything Your Church Needs', subtitle: 'A complete platform built specifically for church ministry.' },
    features: [
      { title: 'Sermon Management', desc: 'YouTube integration, categories, speaker filtering, and automatic thumbnail extraction.', icon: '🎙️' },
      { title: 'Weekly Bulletin', desc: 'Upload PDF bulletins and display as image pages. Members access them anytime.', icon: '📄' },
      { title: 'Photo Albums', desc: 'Share church moments in beautiful gallery grids with lightbox viewing.', icon: '📸' },
      { title: 'Staff Directory', desc: 'Showcase pastors and staff with featured layouts, bios, and contact info.', icon: '👥' },
      { title: 'Event Calendar', desc: 'Promote services, retreats, and special events with rich cards and locations.', icon: '📅' },
      { title: 'Your Church Address', desc: 'Use your own church address (e.g., yourchurch.com) with a secure certificate.', icon: '🌐' },
      { title: 'Professional Design', desc: 'A polished, church-fitting design is ready from the very start.', icon: '🎨' },
      { title: 'Great on Phones', desc: 'Looks great on phones, tablets, and computers — with no extra work.', icon: '📱' },
      { title: 'Korean & English', desc: 'Both Korean and English. Reach your congregation in their language.', icon: '🌍' },
    ],
    howSection: { title: 'How It Works', subtitle: 'From sign-up to launch, in four steps.' },
    steps: [
      { step: '01', title: 'Apply & Choose a Plan', desc: 'Pick the plan that fits your church and fill out a short build request.' },
      { step: '02', title: 'Professional Setup', desc: 'Your church gets a fitting design, and if you have an existing site, your content is migrated — your site comes ready.' },
      { step: '03', title: 'Add Your Content', desc: 'Upload sermons, bulletins, photos, and staff info through the simple admin panel.' },
      { step: '04', title: 'Go Live', desc: 'Connect your domain and share your website with your congregation.' },
    ],
    plansSection: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'Choose the plan that fits your church. Upgrade anytime.',
      monthly: 'Monthly', yearly: 'Yearly', save: 'Yearly discount',
      perMonth: '/mo', billedYearly: 'billed annually', setupOnce: 'setup, one-time',
      includedTitle: 'Included in Every Plan',
      included: [
        'Professional church design themes',
        'Your own church address + secure cert',
        'Reliably managed + automatic backups',
        'Online giving info',
        'Great on phones',
        'Korean & English',
        'Email support',
      ],
      setupTitle: 'What the one-time setup includes',
      setupItems: [
        'A professional design applied and configured for your church',
        'Your plan’s pages, menu, and features set up',
        'Migration of your existing site’s content (sermons, bulletins, photos, …)',
        'Initial entry of worship times, directions, staff, and key info',
        'Domain connection setup (you purchase the domain)',
        'A pre-launch review, then your site goes live',
      ],
      note: 'The setup fee is charged once for the initial build; after that you pay only the monthly (or yearly) plan.\nA larger congregation?',
      contact: 'Contact us',
    },
    plans: [
      {
        name: 'Light', subtitle: 'For small churches',
        monthly: 59, yearly: 49, setupFee: 300,
        features: ['Home page', 'Pastor’s greeting', 'About the church', 'Staff directory', 'Worship info', 'Directions', 'Education ministry', 'Sermon & bulletin board', 'Social links', '2 admin accounts'],
        cta: 'Get Started', highlighted: false,
      },
      {
        name: 'Basic', subtitle: 'For growing churches',
        monthly: 99, yearly: 79, setupFee: 500,
        features: ['Everything in Light', 'Photo albums', 'Church history', 'Pastoral columns', 'Video board', 'Notice board', 'Event board', 'Mission board', 'Banner slider (home)', 'Content export', '3 admin accounts'],
        cta: 'Get Started', highlighted: true, badge: 'Most Popular',
      },
      {
        name: 'Plus', subtitle: 'Organized church care',
        monthly: 149, yearly: 119, setupFee: 700,
        features: ['Everything in Basic', 'Korean school page', 'Korean school board', 'Newcomer info', 'Newcomer form', 'Cell ministry & leaders', '5 admin accounts'],
        cta: 'Get Started', highlighted: false,
      },
      {
        name: 'Pro', subtitle: 'The complete platform',
        monthly: 199, yearly: 159, setupFee: 1000,
        features: ['Everything in Plus', 'Custom pages (up to 25)', 'Department & ministry boards', 'Prayer-request board', '10 admin accounts'],
        cta: 'Get Started', highlighted: false,
      },
    ],
    custom: {
      eyebrow: 'Custom Design Service',
      title: 'Need a Custom Design?',
      description: "For churches that need a unique look beyond our designs, we craft a custom design tailored to your church's brand and identity — together.",
      features: ['Custom homepage & page layouts', 'Brand-matched color scheme & typography', 'Custom logo & graphic elements', 'Exclusive design template built for your church'],
      oneTime: 'One-time design fee', anyPlan: 'Works with any plan', quote: 'Get a Quote →',
    },
    cta: {
      title: 'Ready to Get Started?',
      body: 'Join churches across the U.S. using TRUE LIGHT to connect with their communities online.',
      primary: 'Get Started Now', secondary: 'Contact Us',
    },
    footer: {
      tagline: 'Professional church website platform for modern ministries.',
      platform: 'Platform', featuresLink: 'Features', pricing: 'Pricing', embed: 'Widget Embed',
      support: 'Support', contact: 'Contact Us', adminLogin: 'Admin Login',
      company: 'Company', terms: 'Terms of Service', privacy: 'Privacy Policy',
    },
  },
};

function HeroSlider({ slides, getStarted, seePlans }: { slides: { headline: string; subline: string }[]; getStarted: string; seePlans: string }) {
  const [current, setCurrent] = useState(0);
  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative w-full overflow-hidden bg-gray-900" style={{ aspectRatio: '21/9' }}>
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={SLIDE_IMAGES[i]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/45 to-black/60" />
          <div className="relative flex h-full items-center justify-center px-6 sm:px-12 lg:px-20">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl xl:text-5xl" style={{ whiteSpace: 'pre-line', letterSpacing: '-0.5px' }}>
                {slide.headline}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-gray-200 sm:mt-6 sm:text-base lg:text-lg" style={{ whiteSpace: 'pre-line' }}>
                {slide.subline}
              </p>
              <div className="mt-6 flex justify-center gap-3 sm:mt-8">
                <a href="/apply" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 sm:px-8 sm:text-base">
                  {getStarted}
                </a>
                <a href="#plans" className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:px-8 sm:text-base">
                  {seePlans}
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Page Component ──────────────────────────────────────────
export default function LandingPage() {
  // Korean is the primary language — default state + SSR render is 'ko'.
  const [lang, setLang] = useState<Lang>('ko');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tl_lang');
      if (saved === 'ko' || saved === 'en') setLang(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch { /* ignore */ }
  }, [lang]);

  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('tl_lang', l); } catch { /* ignore */ }
  };

  const t = COPY[lang];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">{t.nav.features}</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">{t.nav.how}</a>
            <a href="#plans" className="text-sm text-gray-600 hover:text-gray-900">{t.nav.plans}</a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Language toggle — Korean is primary */}
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5 text-xs font-medium">
              <button
                onClick={() => switchLang('ko')}
                className={`rounded-md px-2 py-1 transition-colors ${lang === 'ko' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                aria-pressed={lang === 'ko'}
              >
                한국어
              </button>
              <button
                onClick={() => switchLang('en')}
                className={`rounded-md px-2 py-1 transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                aria-pressed={lang === 'en'}
              >
                EN
              </button>
            </div>
            <a href="https://admin.truelight.app" className="text-sm text-gray-600 hover:text-gray-900">
              {t.nav.signIn}
            </a>
            <a href="/apply" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {t.nav.getStarted}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Slider */}
      <HeroSlider slides={t.hero.slides} getStarted={t.hero.getStarted} seePlans={t.hero.seePlans} />

      {/* Trust Bar */}
      <section className="border-b border-gray-100 bg-gray-50 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          {t.trust.map((item) => (
            <span key={item} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</span>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900 sm:text-4xl" style={{ letterSpacing: '-0.5px' }}>
            {t.value.headlineTop}<br />
            <span className="text-blue-600">{t.value.headlineAccent}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            {t.value.body}
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">{t.featuresSection.title}</h2>
            <p className="text-gray-600">{t.featuresSection.subtitle}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">{t.howSection.title}</h2>
            <p className="text-gray-600">{t.howSection.subtitle}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                  {s.step}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">{t.plansSection.title}</h2>
            <p className="text-gray-600">{t.plansSection.subtitle}</p>
          </div>
          {/* Monthly / Yearly toggle */}
          <div className="mb-12 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                  billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={billing === 'monthly'}
              >
                {t.plansSection.monthly}
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                  billing === 'yearly' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={billing === 'yearly'}
              >
                {t.plansSection.yearly}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  billing === 'yearly' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                }`}>
                  {t.plansSection.save}
                </span>
              </button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.plans.map((plan, idx) => {
              const price = billing === 'monthly' ? plan.monthly : plan.yearly;
              const planId = (['light', 'basic', 'plus', 'pro'] as const)[idx] ?? 'basic';
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border-2 bg-white p-7 transition-shadow hover:shadow-lg ${
                    plan.highlighted ? 'border-blue-600 shadow-xl' : 'border-gray-200'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-1 text-sm font-medium text-blue-600">{plan.subtitle}</div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">${price}</span>
                    <span className="text-gray-500">{t.plansSection.perMonth}</span>
                  </div>
                  <p className="mt-1 h-4 text-xs text-gray-400">
                    {billing === 'yearly' ? t.plansSection.billedYearly : ' '}
                  </p>
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    + ${plan.setupFee} <span className="text-gray-400">{t.plansSection.setupOnce}</span>
                  </p>
                  <ul className="my-6 space-y-3 border-t border-gray-100 pt-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`/apply?plan=${planId}&period=${billing}`}
                    className={`mt-auto block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              );
            })}
          </div>
          {/* Included in every plan */}
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8">
            <h3 className="mb-5 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
              {t.plansSection.includedTitle}
            </h3>
            <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {t.plansSection.included.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
          {/* What the one-time setup fee includes */}
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-8">
            <h3 className="mb-5 text-center text-sm font-bold uppercase tracking-wide text-blue-700">
              {t.plansSection.setupTitle}
            </h3>
            <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
              {t.plansSection.setupItems.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-gray-500" style={{ whiteSpace: 'pre-line' }}>
            {t.plansSection.note} <a href="mailto:info@truelight.app" className="text-blue-600 hover:underline">{t.plansSection.contact}</a>
          </p>
        </div>
      </section>

      {/* Custom Design */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 sm:p-16">
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-16">
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-blue-400">{t.custom.eyebrow}</p>
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl" style={{ letterSpacing: '-0.5px' }}>{t.custom.title}</h2>
              <p className="mb-8 text-base leading-relaxed text-gray-300">{t.custom.description}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {t.custom.features.map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                      <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-200">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-5 shrink-0 text-center md:items-start md:text-left">
              <div>
                <p className="text-sm text-gray-400">{t.custom.oneTime}</p>
                <p className="mt-1 text-sm text-gray-400">{t.custom.anyPlan}</p>
              </div>
              <a href="mailto:info@truelight.app" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-gray-900 shadow-lg hover:bg-gray-100 transition-colors">
                {t.custom.quote}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-16 text-center shadow-2xl sm:px-16">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">{t.cta.title}</h2>
          <p className="mb-8 text-base text-blue-100">
            {t.cta.body}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="/apply" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 shadow-lg hover:bg-gray-50">
              {t.cta.primary}
            </a>
            <a href="mailto:info@truelight.app" className="rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <span className="text-lg font-bold text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
              <p className="mt-3 text-sm text-gray-500">{t.footer.tagline}</p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-900">{t.footer.platform}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-700">{t.footer.featuresLink}</a></li>
                <li><a href="#plans" className="hover:text-gray-700">{t.footer.pricing}</a></li>
                <li><Link href="/embed" className="hover:text-gray-700">{t.footer.embed}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-900">{t.footer.support}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="mailto:info@truelight.app" className="hover:text-gray-700">{t.footer.contact}</a></li>
                <li><a href="mailto:support@truelight.app" className="hover:text-gray-700">{lang === 'ko' ? '고객지원' : 'Customer Support'}</a></li>
                <li><a href="https://admin.truelight.app" className="hover:text-gray-700">{t.footer.adminLogin}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-900">{t.footer.company}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/terms" className="hover:text-gray-700">{t.footer.terms}</a></li>
                <li><a href="/privacy" className="hover:text-gray-700">{t.footer.privacy}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} TRUE LIGHT by DASOMWEB. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
