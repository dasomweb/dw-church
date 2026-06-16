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
  plansSection: { title: string; subtitle: string; note: string; contact: string };
  plans: {
    name: string; price: string; period: string; subtitle: string; description: string;
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
        { headline: '당신의 교회,\n온라인으로 손쉽게.', subline: '설교, 주보, 행사, 교역자 — 한 플랫폼에서 모두 관리.\n코딩도 번거로움도 없이, 사역에만 집중하세요.' },
        { headline: '교회를 위해 만들고,\n직접 운영하세요.', subline: '10가지 디자인 템플릿과 드래그앤드롭 편집기로\n전문적인 교회 홈페이지를 손쉽게 만드세요.' },
        { headline: '사역에 집중하세요.\n기술은 저희가 맡습니다.', subline: '맞춤 도메인, 모바일 최적화, 유튜브 연동,\n간편한 콘텐츠 관리까지 — 몇 분이면 시작합니다.' },
      ],
    },
    trust: ['코딩 불필요', '모바일 최적화', '맞춤 도메인 지원', '관리형 호스팅', '전담 지원'],
    value: {
      headlineTop: '교회 홈페이지 관리,',
      headlineAccent: '간단하게.',
      body: 'TRUE LIGHT는 전문적으로 디자인되고, 관리가 쉬우며, 완전 호스팅되는 교회 홈페이지 플랫폼입니다. 기술은 저희가 맡을 테니, 여러분의 팀은 가장 중요한 사역에 집중하세요.',
    },
    featuresSection: { title: '교회에 필요한 모든 것', subtitle: '교회 사역을 위해 만든 올인원 플랫폼.' },
    features: [
      { title: '설교 관리', desc: '유튜브 연동, 카테고리, 설교자 필터, 썸네일 자동 추출.', icon: '🎙️' },
      { title: '주보', desc: '주보 PDF를 올리면 이미지로 표시. 성도들이 언제든 열람.', icon: '📄' },
      { title: '사진 앨범', desc: '교회의 순간을 아름다운 갤러리로. 라이트박스 뷰 지원.', icon: '📸' },
      { title: '교역자 소개', desc: '담임목사·교역자를 사진·약력·연락처와 함께 소개.', icon: '👥' },
      { title: '행사 안내', desc: '예배·수련회·특별행사를 카드와 위치 정보로 안내.', icon: '📅' },
      { title: '맞춤 도메인', desc: '교회 고유 도메인(예: yourbethel.com)을 무료 SSL과 함께.', icon: '🌐' },
      { title: '페이지 빌더', desc: '드래그앤드롭 블록 편집기 — 20여 종 블록과 8가지 템플릿.', icon: '🧱' },
      { title: '모바일 최적화', desc: '폰·태블릿·데스크톱 어디서나 완벽하게. 추가 작업 불필요.', icon: '📱' },
      { title: '다국어 지원', desc: '한국어·영어 인터페이스. 성도의 언어로 섬기세요.', icon: '🌍' },
    ],
    howSection: { title: '이용 방법', subtitle: '네 단계면 교회가 온라인에.' },
    steps: [
      { step: '01', title: '가입 후 플랜 선택', desc: '교회에 맞는 플랜을 선택하면 관리자 페이지에 즉시 접속.' },
      { step: '02', title: '템플릿 선택', desc: '전문 디자인 10종 중 선택. 색상·폰트·레이아웃 커스터마이즈.' },
      { step: '03', title: '콘텐츠 추가', desc: '설교·주보·사진·교역자 정보를 간편한 관리자 페이지에서 등록.' },
      { step: '04', title: '오픈', desc: '도메인을 연결하고 성도들에게 홈페이지를 공유하세요.' },
    ],
    plansSection: {
      title: '간단하고 투명한 요금제',
      subtitle: '교회에 맞는 플랜을 선택하세요. 언제든 변경 가능합니다.',
      note: '모든 플랜에 호스팅·SSL·백업·플랫폼 업데이트 포함. 숨은 비용 없음.\n교인이 더 필요하신가요? 50명당 월 $10 추가. 1,000명 이상이면 맞춤 플랜을',
      contact: '문의하세요',
    },
    plans: [
      {
        name: 'Essential', price: '$99', period: '/월', subtitle: '교회 홈페이지',
        description: '템플릿 기반 디자인, 콘텐츠 관리, 자체 도메인까지 갖춘 완성형 교회 홈페이지.',
        features: ['전문 디자인 템플릿 10종', '설교·주보 관리', '사진 앨범·행사 안내', '교역자 소개·교회 연혁', '드래그앤드롭 페이지 빌더', '최대 5개 페이지', '부서 사이트(최대 3개)', '맞춤 도메인 + SSL', '관리형 호스팅·백업', '이메일 지원'],
        cta: '시작하기', highlighted: false,
      },
      {
        name: 'Ministry', price: '$199', period: '/월', subtitle: '홈페이지 + 교인 명부',
        description: '에센셜의 모든 기능에 더해, 성도와 연결되는 비공개 교인 명부까지.',
        features: ['에센셜의 모든 기능', '고급 테마 편집기', '교인 명부(최대 200명)', '연락처 그룹·분류', '교인 검색·필터', '최대 15개 페이지', '우선 이메일 지원'],
        cta: '미니스트리 시작하기', highlighted: true, badge: '가장 인기',
      },
      {
        name: 'Outreach', price: '$399', period: '/월', subtitle: '홈페이지 + 교인 + 성장',
        description: '성장하는 교회를 위한 완성형 플랫폼 — 확장된 용량, 부서 사이트, 분석까지.',
        features: ['미니스트리의 모든 기능', '교인 명부(최대 1,000명)', '분석·참여 대시보드', '최대 30개 페이지', '우선 이메일 지원'],
        cta: '아웃리치 시작하기', highlighted: false,
      },
    ],
    custom: {
      eyebrow: '맞춤 디자인 서비스',
      title: '맞춤 디자인이 필요하세요?',
      description: '템플릿을 넘어선 고유한 디자인을 원하시나요? 디자인팀이 교회의 브랜드와 정체성에 맞춘 완전 맞춤형 홈페이지를 제작해 드립니다.',
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
        { headline: 'Your Church.\nOnline. Effortlessly.', subline: 'Sermons, bulletins, events, staff — all managed in one platform.\nNo coding. No hassle. Just your ministry, amplified.' },
        { headline: 'Built for Churches.\nManaged by You.', subline: 'Professional church websites with 10 design templates,\ndrag-and-drop editor, and everything your congregation needs.' },
        { headline: 'Focus on Ministry.\nWe Handle the Tech.', subline: 'Custom domain, mobile-ready design, YouTube integration,\nand seamless content management — all included. Start in minutes.' },
      ],
    },
    trust: ['No coding required', 'Mobile responsive', 'Custom domain support', 'Managed hosting', 'Dedicated support'],
    value: {
      headlineTop: 'Church Website Management,',
      headlineAccent: 'Simplified.',
      body: 'TRUE LIGHT provides a complete church website platform — professionally designed, easy to manage, and fully hosted. We handle the technology so your team can focus on what matters most: ministry.',
    },
    featuresSection: { title: 'Everything Your Church Needs', subtitle: 'A complete platform built specifically for church ministry.' },
    features: [
      { title: 'Sermon Management', desc: 'YouTube integration, categories, speaker filtering, and automatic thumbnail extraction.', icon: '🎙️' },
      { title: 'Weekly Bulletin', desc: 'Upload PDF bulletins and display as image pages. Members access them anytime.', icon: '📄' },
      { title: 'Photo Albums', desc: 'Share church moments in beautiful gallery grids with lightbox viewing.', icon: '📸' },
      { title: 'Staff Directory', desc: 'Showcase pastors and staff with featured layouts, bios, and contact info.', icon: '👥' },
      { title: 'Event Calendar', desc: 'Promote services, retreats, and special events with rich cards and locations.', icon: '📅' },
      { title: 'Custom Domain', desc: 'Use your own domain (e.g., yourbethel.com) with free SSL certificate.', icon: '🌐' },
      { title: 'Page Builder', desc: 'Drag-and-drop block editor with 20+ block types and 8 page templates.', icon: '🧱' },
      { title: 'Mobile Ready', desc: 'Every site looks great on phones, tablets, and desktops. No extra work.', icon: '📱' },
      { title: 'Multi-language', desc: 'Korean and English interface. Serve your congregation in their language.', icon: '🌍' },
    ],
    howSection: { title: 'How It Works', subtitle: 'Get your church online in four simple steps.' },
    steps: [
      { step: '01', title: 'Sign Up & Choose a Plan', desc: 'Pick the plan that fits your church. Get instant access to the admin panel.' },
      { step: '02', title: 'Pick a Template', desc: 'Choose from 10 professional designs. Customize colors, fonts, and layout.' },
      { step: '03', title: 'Add Your Content', desc: 'Upload sermons, bulletins, photos, and staff info through the easy admin panel.' },
      { step: '04', title: 'Go Live', desc: 'Connect your domain and share your website with your congregation.' },
    ],
    plansSection: {
      title: 'Simple, Transparent Pricing',
      subtitle: 'Choose the plan that fits your church. Upgrade or downgrade anytime.',
      note: 'All plans include hosting, SSL, backups, and platform updates. No hidden fees.\nNeed more members? Add 50 members for $10/mo. Over 1,000 members?',
      contact: 'Contact us',
    },
    plans: [
      {
        name: 'Essential', price: '$99', period: '/mo', subtitle: 'Church Website',
        description: 'A complete church website with template-based design, content management, and your own domain.',
        features: ['10 professional design templates', 'Sermon & bulletin management', 'Photo albums & event calendar', 'Staff directory & church history', 'Page builder with drag & drop', 'Up to 5 pages', 'Department sites (up to 3)', 'Custom domain + SSL', 'Managed hosting & backups', 'Email support'],
        cta: 'Get Started', highlighted: false,
      },
      {
        name: 'Ministry', price: '$199', period: '/mo', subtitle: 'Website + Member Directory',
        description: 'Everything in Essential, plus a private member directory to stay connected with your congregation.',
        features: ['Everything in Essential', 'Advanced theme editor', 'Member directory (up to 200)', 'Contact groups & categories', 'Member search & filtering', 'Up to 15 pages', 'Priority email support'],
        cta: 'Start Ministry Plan', highlighted: true, badge: 'Most Popular',
      },
      {
        name: 'Outreach', price: '$399', period: '/mo', subtitle: 'Website + Members + Growth',
        description: 'The complete platform for growing churches — expanded capacity, department sites, and analytics.',
        features: ['Everything in Ministry', 'Member directory (up to 1,000)', 'Analytics & engagement dashboard', 'Up to 30 pages', 'Priority email support'],
        cta: 'Get Outreach Plan', highlighted: false,
      },
    ],
    custom: {
      eyebrow: 'Custom Design Service',
      title: 'Need a Custom Design?',
      description: "Want a unique look beyond our templates? Our design team will create a fully custom website tailored to your church's brand and identity.",
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative flex h-full items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl" style={{ whiteSpace: 'pre-line', letterSpacing: '-0.5px' }}>
                {slide.headline}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-gray-200 sm:mt-6 sm:text-base lg:text-lg" style={{ whiteSpace: 'pre-line' }}>
                {slide.subline}
              </p>
              <div className="mt-6 flex gap-3 sm:mt-8">
                <a href="https://admin.truelight.app/register" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 sm:px-8 sm:text-base">
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
            <a href="https://admin.truelight.app/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
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
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">{t.plansSection.title}</h2>
            <p className="text-gray-600">{t.plansSection.subtitle}</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {t.plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 bg-white p-8 transition-shadow hover:shadow-lg ${
                  plan.highlighted ? 'border-blue-600 shadow-xl' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-1 text-sm font-medium text-blue-600">{plan.subtitle}</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-gray-600">{plan.description}</p>
                <ul className="mb-8 space-y-3">
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
                  href="https://admin.truelight.app/register"
                  className={`block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500" style={{ whiteSpace: 'pre-line' }}>
            {t.plansSection.note} <a href="mailto:hello@truelight.app" className="text-blue-600 hover:underline">{t.plansSection.contact}</a>
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
              <a href="mailto:hello@truelight.app" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-gray-900 shadow-lg hover:bg-gray-100 transition-colors">
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
            <a href="https://admin.truelight.app/register" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-700 shadow-lg hover:bg-gray-50">
              {t.cta.primary}
            </a>
            <a href="mailto:hello@truelight.app" className="rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
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
                <li><a href="mailto:hello@truelight.app" className="hover:text-gray-700">{t.footer.contact}</a></li>
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
