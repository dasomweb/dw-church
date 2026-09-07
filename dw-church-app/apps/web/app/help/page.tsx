import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';

// /help — 도움센터(시안 상세 §3, 기존 /features 대체). 서버 컴포넌트:
// 검색 입력은 시각 요소(동작 최소), FAQ 아코디언은 native <details>로 처리하므로
// 클라이언트 상태가 필요 없다. 색·타입은 랜딩 v2 디자인 시스템(경고색 없음).

const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

// 6 카테고리 — 각 항목은 텍스트 목록. 링크는 첫 예시 문서(설교 등록)만 /help/sermon 로 연결.
const CATEGORIES: { title: string; items: { label: string; href?: string }[] }[] = [
  {
    title: '시작하기',
    items: [
      { label: '신청부터 오픈까지의 흐름' },
      { label: '온보딩 준비 — 무엇을 모아 두면 좋은지' },
      { label: '오픈까지 걸리는 기간' },
    ],
  },
  {
    title: '주중 소식 올리기',
    items: [
      { label: '설교 등록 · 영상 연결', href: '/help/sermon' },
      { label: '주보 올리기' },
      { label: '사진 앨범 · 이미지 규격' },
      { label: '공지 · 행사 등록' },
    ],
  },
  {
    title: '교회 안내 정보',
    items: [
      { label: '예배 · 모임 시간 수정' },
      { label: '오시는 길' },
      { label: '교역자 소개' },
    ],
  },
  {
    title: '교적관리',
    items: [
      { label: '엑셀 명부 불러오기' },
      { label: '세대 · 가족 묶기' },
      { label: '직분 · 출석' },
      { label: '목장 편성 · 보고' },
    ],
  },
  {
    title: '새가족과 양식',
    items: [
      { label: '새가족 등록 폼' },
      { label: '접수 확인 · 처리' },
      { label: '수련회 · 차량 양식' },
    ],
  },
  {
    title: '계정 · 결제 · 해지',
    items: [
      { label: '관리자 계정 추가' },
      { label: '부가기능 신청' },
      { label: '청구서 · 영수증' },
      { label: '내려받기 · 해지' },
    ],
  },
];

// 자주 묻는 질문 — 첫 항목만 펼침.
const FAQ: { q: string; a: string; open?: boolean }[] = [
  {
    q: '매주 콘텐츠는 누가 올리나요?',
    a: '설교·주보·사진 같은 주중 소식은 교회에서 관리자 화면에 직접 올리십니다. 글과 사진만 등록하면 되고, 사용법은 도움센터에 정리해 두었습니다. 사이트 구성 변경이나 오류는 저희에게 알려 주시면 처리합니다.',
    open: true,
  },
  {
    q: '기존 사이트 내용은 어디까지 옮겨 주시나요?',
    a: '지금 쓰시는 사이트의 지난 설교·주보·게시물·사진을 옮겨 담아 드립니다. 분량과 정리 상태에 따라 작업량이 달라져, 사이트를 먼저 보고 상담에서 범위를 정합니다.',
  },
  {
    q: '오픈까지 얼마나 걸리나요?',
    a: '교회 사정과 자료 준비 상태에 따라 다릅니다. 보통 상담 후 ○주 안에 오픈합니다.',
  },
  {
    q: '교적을 엑셀로 관리하고 있는데 그대로 옮길 수 있나요?',
    a: '네. 엑셀 명부를 불러와 세대·가족으로 묶고 직분·출석까지 정리해 드립니다. 파일 형식은 상담에서 함께 맞춥니다.',
  },
  {
    q: '도메인은 교회 소유인가요?',
    a: '도메인은 교회 명의로 둡니다. 연결과 보안은 저희가 맡고, 구입·갱신 비용은 교회가 부담하시며, 해지 후에도 교회 소유로 유지됩니다.',
  },
  {
    q: '부가기능은 언제든 끄고 켤 수 있나요?',
    a: '네. 교적관리·목장·새가족·교회 양식 같은 부가기능은 필요할 때 신청해 켜고, 끄면 다음 청구 주기부터 제외됩니다.',
  },
  {
    q: '해지하면 그동안 올린 내용은 어떻게 되나요?',
    a: '이용 중에는 언제든 내려받으실 수 있습니다. 해지 전에 받아 두시길 권합니다. 해지 후 데이터 보관 기간은 약속하지 않습니다(약관 §10).',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        {/* 헤더 + 검색 */}
        <section className="bg-white">
          <div className={`${CONTAINER} py-12 sm:py-20`}>
            <h1 className="text-[32px] text-[#16181d] sm:text-[44px]" style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.2 }}>
              도움센터
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] text-[#4b5464] sm:text-[17.5px]" style={{ lineHeight: 1.85 }}>
              신청 전에 궁금한 것과, 오픈 후 관리자 화면에서 필요한 것을 한 곳에 모았습니다.
            </p>
            <div className="mt-7 max-w-xl">
              <div className="flex items-center gap-3 rounded-xl border border-[#d5dae2] bg-white px-4">
                <svg className="h-5 w-5 flex-none text-[#a3aab8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  aria-label="도움말 검색"
                  placeholder="무엇을 찾으시나요 — 예: 설교 올리기, 도메인 연결, 교적 불러오기"
                  className="min-h-[48px] w-full bg-transparent text-[16px] text-[#16181d] outline-none placeholder:text-[#a3aab8]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 6 카테고리 (3열) */}
        <section className="bg-[#fbfaf8]">
          <div className={`${CONTAINER} py-14 sm:py-20`}>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.title} className="rounded-xl border border-[#e7e9ee] bg-white p-6">
                  <h2 className="text-[18px] font-bold text-[#16181d]">{cat.title}</h2>
                  <ul className="mt-4 space-y-2.5 text-[15px]">
                    {cat.items.map((it) =>
                      it.href ? (
                        <li key={it.label}>
                          <a href={it.href} className="flex items-center gap-1.5 font-medium text-[#1466d6] hover:underline">
                            {it.label}
                            <span aria-hidden>→</span>
                          </a>
                        </li>
                      ) : (
                        <li key={it.label} className="text-[#4b5464]" style={{ lineHeight: 1.6 }}>
                          {it.label}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 자주 묻는 질문 */}
        <section className="bg-white">
          <div className={`${CONTAINER} py-14 sm:py-20`}>
            <h2 className="text-[26px] text-[#16181d] sm:text-[34px]" style={{ fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.35 }}>
              자주 묻는 질문
            </h2>
            <div className="mt-8 divide-y divide-[#e7e9ee] overflow-hidden rounded-xl border border-[#e7e9ee] bg-white">
              {FAQ.map((row) => (
                <details key={row.q} open={row.open} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="text-[17px] font-bold text-[#16181d]">{row.q}</span>
                    <span aria-hidden className="text-[20px] leading-none text-[#1466d6] transition-transform group-[[open]]:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
                    {row.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
