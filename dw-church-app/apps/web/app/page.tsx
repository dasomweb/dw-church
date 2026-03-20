import Link from 'next/link';

const features = [
  { title: '설교관리', desc: '유튜브 영상 연동, 카테고리 분류, 설교자별 검색까지 한번에', icon: '🎙️' },
  { title: '주보관리', desc: 'PDF 주보 업로드 및 이미지 뷰어로 간편하게 확인', icon: '📄' },
  { title: '앨범관리', desc: '교회 행사 사진을 아름다운 갤러리로 공유', icon: '📸' },
  { title: '교역자 소개', desc: '목회자와 교역자 프로필을 부서별로 깔끔하게 정리', icon: '👥' },
  { title: '교회연혁', desc: '교회 역사를 타임라인으로 한눈에 보여주세요', icon: '📅' },
  { title: '이벤트', desc: '교회 행사와 특별 집회를 카드형 레이아웃으로 홍보', icon: '🎉' },
];

const plans = [
  {
    name: 'Free',
    price: '무료',
    period: '',
    features: ['기본 템플릿 1개', '설교/주보 관리', '최대 100건 콘텐츠', '커뮤니티 지원'],
    cta: '무료 시작',
    highlighted: false,
  },
  {
    name: 'Basic',
    price: '₩29,000',
    period: '/월',
    features: ['템플릿 5개', '모든 CPT 관리', '무제한 콘텐츠', '커스텀 도메인', '이메일 지원'],
    cta: 'Basic 시작',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '₩59,000',
    period: '/월',
    features: ['전체 템플릿', '모든 기능', '무제한 콘텐츠', '커스텀 도메인', 'CSS 커스터마이징', '우선 지원'],
    cta: 'Pro 시작',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-blue-600">DW Church</span>
          <nav className="hidden gap-6 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">기능</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">요금</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              로그인
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            교회 웹사이트를
            <br />
            <span className="text-blue-600">5분 만에</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
            설교, 주보, 앨범, 교역자 소개까지 — 코딩 없이 교회에 꼭 맞는 웹사이트를 만들어 보세요.
            10가지 디자인 템플릿과 드래그 앤 드롭 편집기로 누구나 쉽게 시작할 수 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-700"
            >
              무료 시작
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              기능 보기
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
            교회에 필요한 모든 기능
          </h2>
          <p className="mb-16 text-center text-gray-600">
            별도의 개발 없이 교회 운영에 필요한 핵심 기능을 바로 사용하세요.
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">합리적인 요금제</h2>
          <p className="mb-16 text-center text-gray-600">
            교회 규모와 필요에 맞는 플랜을 선택하세요.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 p-8 ${
                  plan.highlighted
                    ? 'border-blue-600 shadow-xl'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <span className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    인기
                  </span>
                )}
                <h3 className="mb-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-500">{plan.period}</span>
                  )}
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full rounded-lg py-3 text-center text-sm font-semibold ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} DW Church. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="/terms" className="text-sm text-gray-500 hover:text-gray-700">이용약관</a>
            <a href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">개인정보처리방침</a>
            <a href="mailto:support@dw-church.app" className="text-sm text-gray-500 hover:text-gray-700">문의</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
