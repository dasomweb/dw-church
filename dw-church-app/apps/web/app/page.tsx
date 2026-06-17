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
        { headline: '당신의 교회,\n온라인으로 손쉽게.', subline: '설교, 주보, 행사, 교역자 — 한 플랫폼에서 모두 관리.\n코딩도 번거로움도 없이, 사역에만 집중하세요.' },
        { headline: '디자인은 저희가,\n운영은 사장님이.', subline: '교회에 맞는 전문 디자인으로 사이트를 만들어 드립니다.\n사장님은 설교·주보·사진만 채우시면 됩니다.' },
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
      { title: '맞춤 디자인 셋업', desc: '교회 전용 디자인 테마로 저희가 사이트를 구성해 드립니다.', icon: '🎨' },
      { title: '모바일 최적화', desc: '폰·태블릿·데스크톱 어디서나 완벽하게. 추가 작업 불필요.', icon: '📱' },
      { title: '다국어 지원', desc: '한국어·영어 인터페이스. 성도의 언어로 섬기세요.', icon: '🌍' },
    ],
    howSection: { title: '이용 방법', subtitle: '신청하면 저희가 만들어 드립니다 — 네 단계.' },
    steps: [
      { step: '01', title: '신청 & 플랜 선택', desc: '교회에 맞는 플랜을 정하고 개발 신청서를 작성합니다.' },
      { step: '02', title: '저희가 셋업', desc: '교회 전용 디자인을 적용하고, 기존 사이트가 있다면 콘텐츠까지 옮겨 사이트를 만들어 드립니다.' },
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
        '교회 전용 전문 디자인 테마',
        '맞춤 도메인 + 무료 SSL',
        '관리형 호스팅·자동 백업',
        '온라인 헌금 안내 페이지',
        '콘텐츠 내보내기(Export)',
        '모바일 최적화',
        '한국어·영어 인터페이스',
        '이메일 지원',
      ],
      note: '셋업비는 1회성이며, AI 빌더와 기존 사이트 마이그레이션을 포함한 초기 구축 비용입니다.\n더 큰 규모의 교회이신가요? 맞춤 플랜을',
      contact: '문의하세요',
    },
    plans: [
      {
        name: '라이트', subtitle: '소형 교회 시작용',
        monthly: 59, yearly: 49, setupFee: 300,
        features: ['설교·주보 관리', '교역자 소개·교회 연혁', '예배 안내·오시는 길', '담임목사 인사말', '사진 앨범', '교육부 소개 페이지', '관리자 계정 2개'],
        cta: '시작하기', highlighted: false,
      },
      {
        name: '기본', subtitle: '성장하는 교회',
        monthly: 99, yearly: 79, setupFee: 400,
        features: ['라이트의 모든 기능', '행사 안내', '목회 칼럼', '영상 게시판', '공지·선교 게시판', '배너 슬라이더', '관리자 계정 3개'],
        cta: '시작하기', highlighted: true, badge: '가장 인기',
      },
      {
        name: '플러스', subtitle: '체계적인 교회 관리',
        monthly: 149, yearly: 119, setupFee: 600,
        features: ['기본의 모든 기능', '새가족 안내', '목장(셀) 관리', '관리자 계정 5개'],
        cta: '시작하기', highlighted: false,
      },
      {
        name: '프로', subtitle: '완성형 교회 플랫폼',
        monthly: 199, yearly: 159, setupFee: 800,
        features: ['플러스의 모든 기능', '새가족 온라인 등록 폼', '등록 교인 관리', '관리자 계정 10개'],
        cta: '시작하기', highlighted: false,
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
        { headline: 'A Home for Your Church\non the Web.', subline: 'Sermons, bulletins, events, and your staff — all in one place.\nNo code, no agency. Just the tools your ministry needs.' },
        { headline: 'Built for Churches.\nRun by Your Team.', subline: 'We design and build your site; you keep it current.\nProfessional church themes — the setup is on us.' },
        { headline: 'You Tend the Flock.\nWe’ll Tend the Tech.', subline: 'Your own domain, mobile-ready pages, YouTube sermons, easy updates.\nManaged hosting and real support — go live in minutes.' },
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
      { title: 'Done-for-You Design', desc: 'We set up your site with a professional church theme — no building required.', icon: '🎨' },
      { title: 'Mobile Ready', desc: 'Every site looks great on phones, tablets, and desktops. No extra work.', icon: '📱' },
      { title: 'Multi-language', desc: 'Korean and English interface. Serve your congregation in their language.', icon: '🌍' },
    ],
    howSection: { title: 'How It Works', subtitle: 'You apply, we build it — in four steps.' },
    steps: [
      { step: '01', title: 'Apply & Choose a Plan', desc: 'Pick the plan that fits your church and fill out a short build request.' },
      { step: '02', title: 'We Build It', desc: 'We apply a professional church design and, if you have an existing site, migrate your content over.' },
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
        'Custom domain + free SSL',
        'Managed hosting & automatic backups',
        'Online giving info page',
        'Content export',
        'Mobile responsive',
        'Korean & English interface',
        'Email support',
      ],
      note: 'The setup fee is a one-time charge covering initial build with the AI builder and migration from your existing site.\nA larger congregation?',
      contact: 'Contact us',
    },
    plans: [
      {
        name: 'Light', subtitle: 'For small churches',
        monthly: 59, yearly: 49, setupFee: 300,
        features: ['Sermons & bulletins', 'Staff directory & history', 'Worship info & directions', 'Pastor’s message', 'Photo albums', 'Education ministry page', '2 admin accounts'],
        cta: 'Get Started', highlighted: false,
      },
      {
        name: 'Basic', subtitle: 'For growing churches',
        monthly: 99, yearly: 79, setupFee: 400,
        features: ['Everything in Light', 'Event calendar', 'Pastoral columns', 'Video board', 'Notice & mission boards', 'Banner slider', '3 admin accounts'],
        cta: 'Get Started', highlighted: true, badge: 'Most Popular',
      },
      {
        name: 'Plus', subtitle: 'Organized church care',
        monthly: 149, yearly: 119, setupFee: 600,
        features: ['Everything in Basic', 'Newcomer info', 'Small-group (cell) management', '5 admin accounts'],
        cta: 'Get Started', highlighted: false,
      },
      {
        name: 'Pro', subtitle: 'The complete platform',
        monthly: 199, yearly: 159, setupFee: 800,
        features: ['Everything in Plus', 'Online newcomer registration form', 'Member management', '10 admin accounts'],
        cta: 'Get Started', highlighted: false,
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
            {t.plans.map((plan) => {
              const price = billing === 'monthly' ? plan.monthly : plan.yearly;
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
                    href="https://admin.truelight.app/register"
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
