import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import MarketingHero from '../components/MarketingHero';
import MarketingCTA from '../components/MarketingCTA';
import KakaoInquiryButton from '../components/KakaoInquiryButton';
import FaviconSetter from '../components/FaviconSetter';

// ─────────────────────────────────────────────────────────────────────────────
// truelight.app 마케팅 — Front 페이지 (/). "웹사이트 전체 시안" 기준, 멀티페이지.
// 서버 컴포넌트. Hero는 기존 배너 시스템(MarketingHero → BannerSlider) 재사용.
// 색·타입: 브랜드 #1466d6 / #2b7fff, 딥 #0f1b2d, 웜 #fbfaf8, Pretendard.
// ─────────────────────────────────────────────────────────────────────────────

const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-[#1466d6]">{children}</span>;
}

export default function FrontPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingHero />

      {/* 3 intro cards — overlap the hero on desktop */}
      <section className="bg-white">
        <div className={`${CONTAINER} relative z-30 -mt-8 sm:-mt-14`}>
          <div className="grid overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-[#e5e7eb] shadow-[0_12px_32px_rgba(16,24,40,.1)] sm:grid-cols-3 sm:gap-px">
            {[
              { n: '01 · 홈페이지', t: '성도와 방문자가 보는 페이지', d: '설교·주보·목회칼럼·앨범·영상·예배 안내·교역자·연혁·게시판 등 12개 페이지. 휴대폰에서도 그대로 열립니다.' },
              { n: '02 · 교회 행정', t: '교적관리 모듈', d: '교적·세대·직분·출석·심방·성례·이동, 목장 조직과 보고, 새가족 등록, 교회 양식 접수를 관리합니다.' },
              { n: '03 · 구축과 운영', t: '셋업 대행', d: '디자인과 구축, 기존 사이트 자료 이관을 대행합니다. 교회에 전산 담당자가 없어도 운영됩니다.' },
            ].map((c) => (
              <div key={c.n} className="bg-white p-7 sm:p-8">
                <Eyebrow>{c.n}</Eyebrow>
                <b className="mt-3 block text-[20px] tracking-[-0.035em]">{c.t}</b>
                <p className="mt-2 text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 시스템 구성 — admin ↔ homepage */}
      <section id="system" className="scroll-mt-24 bg-white">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[740px]">
              <Eyebrow>시스템 구성</Eyebrow>
              <h2 className="mt-4 text-[30px] font-extrabold leading-[1.28] tracking-[-0.05em] sm:text-[40px]">관리자 화면과 홈페이지가<br className="hidden sm:block" /> 따로 있지 않습니다</h2>
              <p className="mt-4 text-[16px] leading-[1.85] text-[#4a5262] sm:text-[17.5px]">홈페이지 빌더는 홈페이지만 만듭니다. 교적 프로그램은 교적만 관리합니다. 두 개를 따로 쓰면 같은 자료를 두 번 입력해야 합니다. TRUE LIGHT는 관리자 화면에 등록한 자료가 홈페이지에 그대로 반영됩니다.</p>
            </div>
            <a href="/system" className="shrink-0 text-[14.5px] font-bold text-[#1466d6] hover:underline">시스템 소개 자세히 →</a>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#e5e7eb]">
            <div className="grid gap-px bg-[#e5e7eb] md:grid-cols-2">
              {[
                { badge: '관', title: '관리자 화면 — 교역자·행정간사', items: ['교적관리', '출석·심방 기록', '목장 조직·보고', '새가족 관리', '설교·주보 등록', '양식 접수함'] },
                { badge: '공', title: '공개 홈페이지 — 성도와 방문자', items: ['설교 목록', '주보 보관함', '목장 안내', '새가족 등록 폼', '예배 안내·오시는 길', '행사 신청 폼'] },
              ].map((col) => (
                <div key={col.badge} className="bg-white p-7 sm:p-9">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[#eaf1fd] text-[12px] font-extrabold text-[#1466d6]">{col.badge}</span>
                    <b className="text-[17px] tracking-[-0.03em]">{col.title}</b>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[14px] text-[#41495a]">
                    {col.items.map((it) => (
                      <div key={it} className="rounded-lg border border-[#e5e7eb] px-3 py-2.5">{it}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#dbe6f7] bg-[#f4f8ff] px-7 py-6 sm:px-9">
              <p className="text-[15px] leading-[1.8] text-[#41495a] sm:text-[15.5px]">주보를 등록하면 홈페이지 주보 보관함에 올라갑니다. 목장을 편성하면 홈페이지 목장 안내에 반영됩니다. 새가족이 홈페이지에서 등록하면 관리자 화면에서 바로 확인하고 정착 과정을 이어 갑니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 비교 */}
      <section className="bg-white">
        <div className={`${CONTAINER} pb-16 sm:pb-24`}>
          <div className="mb-9 max-w-[760px]">
            <Eyebrow>비교</Eyebrow>
            <h2 className="mt-4 text-[30px] font-extrabold leading-[1.28] tracking-[-0.05em] sm:text-[40px]">홈페이지 빌더와<br className="hidden sm:block" /> 무엇이 다른가</h2>
            <p className="mt-4 text-[16px] leading-[1.85] text-[#4a5262] sm:text-[17.5px]">홈페이지만 필요하다면 일반 빌더로도 만들 수 있습니다. 교적과 목장, 새가족까지 함께 관리하려면 시스템이 달라야 합니다.</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] overflow-hidden rounded-[16px] border border-[#e5e7eb]">
              <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-[#0f1b2d] text-[14px] font-bold text-white">
                <div className="px-6 py-[18px]" />
                <div className="border-l border-[#25344f] px-6 py-[18px]">일반 홈페이지 빌더</div>
                <div className="border-l border-[#25344f] bg-[#14243a] px-6 py-[18px] text-[#8fc0ff]">TRUE LIGHT</div>
              </div>
              {[
                { k: '교적·출석·심방', a: '기능 없음. 엑셀이나 별도 프로그램으로 관리', b: '시스템에 포함' },
                { k: '목장·구역 조직과 보고', a: '개념 없음. 게시판으로 대체', b: '교적을 기준으로 편성하고 보고를 받습니다' },
                { k: '새가족 등록', a: '문의 폼으로 메일만 받습니다', b: '온라인 접수 후 교인으로 등록, 정착 과정 관리' },
                { k: '설교·주보 등록', a: '매주 페이지를 새로 만들고 목록에 링크', b: '영상 주소를 넣으면 제목·썸네일이 따라 들어옵니다' },
                { k: '초기 구축', a: '교회가 직접 제작', b: '디자인·구축·자료 이관을 대행' },
              ].map((r, i, arr) => (
                <div key={r.k} className={`grid grid-cols-[1.1fr_1fr_1fr] text-[14.5px] ${i < arr.length - 1 ? 'border-b border-[#e5e7eb]' : ''}`}>
                  <div className="bg-[#fbfaf8] px-6 py-[18px] font-bold">{r.k}</div>
                  <div className="border-l border-[#e5e7eb] px-6 py-[18px] text-[#61697a]">{r.a}</div>
                  <div className="border-l border-[#e5e7eb] bg-[#f8fbff] px-6 py-[18px] text-[#41495a]">{r.b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 홈페이지에 들어가는 12 페이지 */}
      <section id="website" className="scroll-mt-24 border-y border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[26px] font-extrabold tracking-[-0.048em] sm:text-[34px]">홈페이지에 들어가는 페이지</h2>
              <p className="mt-2.5 text-[15px] text-[#61697a] sm:text-[16px]">아래 12개는 모든 교회에 기본으로 제공됩니다.</p>
            </div>
            <a href="/website" className="shrink-0 text-[14.5px] font-bold text-[#1466d6] hover:underline">홈페이지 기능 전체 보기 →</a>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-[#e5e7eb] sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 1 }}>
            {[
              ['설교', '영상·설교자·본문'], ['주보', '날짜별 보관'], ['목회칼럼', '담임·교역자 글'], ['오늘의 말씀', '홈 대표 구절'], ['앨범', '카테고리별 사진'], ['영상', '찬양·교육 영상'],
              ['예배 및 모임', '시간표'], ['행사', '일정과 안내'], ['배너', '메인 슬라이드'], ['교역자', '직분·부서·사진'], ['연혁', '교회 연혁'], ['게시판', '공지·선교·소식'],
            ].map(([t, d]) => (
              <div key={t} className="bg-white px-4 py-5">
                <b className="block text-[15px]">{t}</b>
                <span className="text-[13px] text-[#61697a]">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 요금 / 개척교회 지원 teasers */}
      <section id="pricing" className="scroll-mt-24 bg-white">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="overflow-hidden rounded-[18px] border border-[#e5e7eb]">
              <div className="flex h-[180px] items-center justify-center bg-gradient-to-br from-[#1466d6] to-[#2b7fff]">
                <span className="text-[44px] font-extrabold tracking-[-0.03em] text-white">$99<span className="ml-1 text-[16px] font-bold opacity-80">/월</span></span>
              </div>
              <div className="p-7 sm:p-8">
                <Eyebrow>요금</Eyebrow>
                <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.042em] sm:text-[24px]">홈페이지 구독은 하나의 값</h3>
                <p className="mt-3 text-[15.5px] leading-[1.8] text-[#4a5262]">교회 규모와 무관하게 월 $99입니다. 초기 구축은 만드는 범위에 따라, 교적관리는 신청하신 경우에만 더해집니다.</p>
                <a href="/pricing" className="mt-5 inline-block text-[14.5px] font-bold text-[#1466d6] hover:underline">요금 자세히 보기 →</a>
              </div>
            </div>
            <div className="overflow-hidden rounded-[18px] border border-[#dbe6f7] bg-[#f4f8ff]">
              <div className="flex h-[180px] items-center justify-center bg-gradient-to-br from-[#0f1b2d] to-[#1a3358]">
                <span className="px-6 text-center text-[19px] font-extrabold leading-[1.4] tracking-[-0.03em] text-white">개척·미자립교회<br />첫 1년 월 $39</span>
              </div>
              <div className="p-7 sm:p-8">
                <Eyebrow>지원 프로그램</Eyebrow>
                <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.042em] sm:text-[24px]">개척 및 미자립교회를 돕습니다</h3>
                <p className="mt-3 text-[15.5px] leading-[1.8] text-[#4a5262]">돕는 교회가 함께 세울 때, 개척·미자립교회는 첫 1년 월 $39·초기 구축 $200으로 시작하고, 돕는 교회는 1년간 구독료 월 $20을 감면받으십니다.</p>
                <a href="/support-program" className="mt-5 inline-block text-[14.5px] font-bold text-[#1466d6] hover:underline">지원 프로그램 보기 →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingCTA />
      <MarketingFooter />

      {/* 모바일 하단 고정 CTA — 상담 + 카카오톡 반반. 데스크톱 숨김. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[#eceef2] bg-white/95 px-3 py-3 backdrop-blur-sm lg:hidden">
        <a href="/apply" className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#2b7fff] px-4 text-[16px] font-semibold text-white hover:bg-[#1466d6]">도입 상담</a>
        <KakaoInquiryButton className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 text-[16px] font-bold text-[#191600] hover:brightness-95" />
      </div>
      <div className="h-20 bg-[#0b1420] lg:hidden" aria-hidden />

      <KakaoInquiryButton />
      <FaviconSetter />
    </div>
  );
}
