import MarketingHeader from '../../../components/MarketingHeader';
import MarketingFooter from '../../../components/MarketingFooter';

// /help/sermon — 도움센터 문서 상세(시안 상세 §4, 예시 1건). 서버 컴포넌트.
// 2열: 좌측 사이드바(문서 목록) + 우측 본문. 색·타입은 랜딩 v2 디자인 시스템.

const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

// 이미지 슬롯 — 실제 캡처가 들어갈 자리. 회색 라운드 패널 + 국문 라벨(외부 핫링크 금지).
function ImgSlot({ label }: { label: string }) {
  return (
    <div
      className="mt-4 flex items-center justify-center overflow-hidden rounded-xl"
      style={{ aspectRatio: '16 / 9', background: '#f2f3f6' }}
      role="img"
      aria-label={label}
    >
      <span className="px-6 text-center text-[13px] font-medium text-[#8b93a3]" style={{ letterSpacing: '-0.01em' }}>
        {label}
      </span>
    </div>
  );
}

// 좌측 사이드바 — 그룹별 문서 목록. 현재 문서(설교 등록하기)만 활성.
const SIDEBAR: { group: string; items: { label: string; href: string; active?: boolean }[] }[] = [
  {
    group: '주중 소식 올리기',
    items: [
      { label: '설교 등록하기', href: '/help/sermon', active: true },
      { label: '주보 올리기', href: '/help' },
      { label: '사진 앨범 만들기', href: '/help' },
      { label: '공지 쓰기', href: '/help' },
    ],
  },
  {
    group: '교적관리',
    items: [
      { label: '엑셀 명부 불러오기', href: '/help' },
      { label: '세대·가족 묶기', href: '/help' },
      { label: '목장 편성', href: '/help' },
    ],
  },
];

export default function HelpSermonPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main className="bg-white">
        <div className={`${CONTAINER} py-12 sm:py-16`}>
          <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
            {/* ── 좌측 사이드바 ── */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <nav className="flex flex-col gap-6">
                {SIDEBAR.map((sec) => (
                  <div key={sec.group}>
                    <h2 className="text-[13px] font-bold tracking-[0.04em] text-[#61697a]">{sec.group}</h2>
                    <ul className="mt-3 space-y-1">
                      {sec.items.map((it) => (
                        <li key={it.label}>
                          <a
                            href={it.href}
                            aria-current={it.active ? 'page' : undefined}
                            className={`block rounded-lg px-3 py-2 text-[15px] ${
                              it.active
                                ? 'bg-[#f4f8ff] font-semibold text-[#1466d6]'
                                : 'text-[#4b5464] hover:bg-[#f5f6f8]'
                            }`}
                          >
                            {it.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </aside>

            {/* ── 우측 본문 ── */}
            <article>
              <nav aria-label="브레드크럼" className="text-[13.5px] text-[#61697a]">
                <a href="/help" className="hover:text-[#1466d6]">도움센터</a>
                <span aria-hidden className="mx-2 text-[#c9cfda]">·</span>
                <span>주중 소식 올리기</span>
              </nav>

              <h1 className="mt-3 text-[28px] text-[#16181d] sm:text-[36px]" style={{ fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.25 }}>
                설교 등록하기
              </h1>
              <p className="mt-4 max-w-2xl text-[16px] text-[#4b5464] sm:text-[17px]" style={{ lineHeight: 1.85 }}>
                주일 오후에 한 편 올리는 데 보통 2~3분 걸립니다. 유튜브에 올린 영상이 있으면 주소만 붙여 넣으시면 됩니다.
              </p>

              {/* 4스텝 */}
              <div className="mt-10 flex flex-col gap-10">
                {/* 1 */}
                <section>
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#1466d6] text-[15px] font-bold text-white">1</span>
                    <div>
                      <h2 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
                        관리자 화면에서 설교 › 새 설교를 누릅니다
                      </h2>
                    </div>
                  </div>
                  <div className="lg:pl-12">
                    <ImgSlot label="[IMG] 관리자 — 설교 목록 화면" />
                  </div>
                </section>

                {/* 2 */}
                <section>
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#1466d6] text-[15px] font-bold text-white">2</span>
                    <div>
                      <h2 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
                        영상 주소를 붙여 넣습니다
                      </h2>
                    </div>
                  </div>
                  <div className="lg:pl-12">
                    {/* 팁 박스 (연블루) */}
                    <div className="mt-4 rounded-xl border border-[#c9dcff] bg-[#f4f8ff] p-5">
                      <p className="text-[13px] font-extrabold tracking-[0.04em] text-[#1466d6]">팁</p>
                      <p className="mt-1.5 text-[15px] text-[#233043]" style={{ lineHeight: 1.8 }}>
                        영상 파일을 직접 올리면 저장공간을 쓰게 됩니다. 유튜브에 올려 두고 주소만 연결하시는 편을 권합니다.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 3 */}
                <section>
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#1466d6] text-[15px] font-bold text-white">3</span>
                    <div>
                      <h2 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
                        설교자와 본문을 고릅니다
                      </h2>
                    </div>
                  </div>
                  <div className="lg:pl-12">
                    <ImgSlot label="[IMG] 관리자 — 설교 등록 입력 화면" />
                  </div>
                </section>

                {/* 4 */}
                <section>
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#1466d6] text-[15px] font-bold text-white">4</span>
                    <div>
                      <h2 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
                        저장하면 홈페이지에 바로 올라갑니다
                      </h2>
                    </div>
                  </div>
                </section>
              </div>

              {/* 이런 것도 함께 보십니다 */}
              <div className="mt-12 border-t border-[#eceef2] pt-8">
                <h2 className="text-[17px] font-bold text-[#16181d]">이런 것도 함께 보십니다</h2>
                <ul className="mt-4 space-y-2.5 text-[15px]">
                  {[
                    { label: '주보 올리기', href: '/help' },
                    { label: '사진 앨범 만들기', href: '/help' },
                    { label: '공지 쓰기', href: '/help' },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="flex items-center gap-1.5 font-medium text-[#1466d6] hover:underline">
                        {l.label}
                        <span aria-hidden>→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 웜 박스 */}
              <div className="mt-8 rounded-xl border border-[#e7e4de] bg-[#fbfaf8] p-6">
                <p className="text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
                  해 보시다가 막히면 알려 주십시오. 지원 시간은 ○○○입니다.
                </p>
              </div>
            </article>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
