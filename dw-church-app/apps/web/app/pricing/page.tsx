import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 요금 (/pricing). 나브 항목(별도 시안 없음) — 홈 요금 티저 +
// /billing 요금 구조를 디자인 시스템으로 정리. 미확정 값은 상담 문구로 처리.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-[#1466d6]">{children}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="요금"
        title={<>홈페이지 구독은 교회 규모와<br className="hidden sm:block" /> 무관하게 하나의 값입니다</>}
        desc="처음 구축하는 범위, 교회 행정 시스템, 사용량 세 가지가 교회마다 달라지는 부분입니다."
      />

      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <p className="mb-8 text-[14px] text-[#61697a]">상기 요금은 사전 안내용 예시입니다. 최종 금액은 상담에서 확정됩니다.</p>

          {/* A. 매달 — 홈페이지 구독 */}
          <div className="rounded-[18px] border-2 border-[#1466d6] bg-[#eef4ff] p-7 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <Eyebrow>매달 · 홈페이지 구독</Eyebrow>
                <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">모든 교회 같은 값</h2>
                <p className="mt-2 text-[15.5px] leading-[1.8] text-[#4a5262]">성도가 보는 지면 12가지가 전부 포함됩니다. 등급을 나눠 기능을 잠가 두지 않습니다.</p>
              </div>
              <div className="shrink-0">
                <span className="text-[44px] font-extrabold tracking-[-0.03em]">$99</span>
                <span className="ml-1 text-[17px] text-[#61697a]">/월</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['설교', '주보', '목회칼럼', '오늘의 말씀', '앨범', '영상', '예배 및 모임', '행사', '배너', '교역자', '연혁', '게시판'].map((p) => (
                <span key={p} className="rounded-full border border-[#c9dcff] bg-white px-3 py-1.5 text-[13.5px] font-medium text-[#233043]">{p}</span>
              ))}
            </div>
            <p className="mt-5 text-[15px] leading-[1.8] text-[#4a5262]">교회 전용 주소와 보안 인증, 백업, 한/영 지면까지 포함됩니다.</p>
          </div>

          {/* B. 처음 한 번 — 초기 구축 */}
          <div className="mt-12">
            <Eyebrow>처음 한 번 · 초기 구축</Eyebrow>
            <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">사람이 직접 디자인하고 구성합니다</h2>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-[1.8] text-[#4a5262]">범위에 따라 세 구간입니다. 어느 구간인지는 상담에서 교회 사정을 보고 함께 정합니다.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {[
                { t: '새로 시작하는 교회', price: '$600', d: '예배 안내와 오시는 길, 설교·주보, 교역자 소개 등 성도가 찾는 지면을 구성하고 교회가 주신 자료를 입력합니다.' },
                { t: '부서·사역 지면까지', price: '$900', d: '교육부·한국학교·목장·새가족처럼 나뉜 사역마다 안내 지면을 따로 구성합니다.' },
                { t: '기존 사이트 이관까지', price: '$1,400 부터', d: '지금 쓰시는 사이트의 지난 설교·주보·게시물·사진을 옮겨 담습니다. 분량에 따라 사이트를 먼저 보고 최종 금액을 알려 드립니다.' },
              ].map((c) => (
                <div key={c.t} className="flex flex-col rounded-[14px] border border-[#e5e7eb] p-6">
                  <b className="text-[16px]">{c.t}</b>
                  <p className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-[#1466d6]">{c.price}</p>
                  <p className="mt-3 text-[14.5px] leading-[1.75] text-[#4a5262]">{c.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* C. 필요해질 때 — 교회 행정 */}
          <div className="mt-12 rounded-[18px] border border-[#e5e7eb] bg-[#fbfaf8] p-7 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <Eyebrow>필요해질 때 · 교회 행정</Eyebrow>
                <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">쓰시는 것만 매달 더해집니다</h2>
                <p className="mt-2 text-[15.5px] leading-[1.8] text-[#4a5262]">교적관리와 목장, 새가족, 교회 양식은 홈페이지와 별도로 두었습니다. 어떤 조합이 맞는지는 상담에서 함께 정합니다.</p>
              </div>
              <div className="shrink-0 rounded-[12px] border border-[#d9e4f5] bg-white px-5 py-4 text-center">
                <p className="text-[13px] text-[#61697a]">네 가지를 함께 쓰실 때</p>
                <p className="mt-0.5"><span className="text-[32px] font-extrabold tracking-[-0.02em]">$69</span><span className="ml-1 text-[15px] text-[#61697a]">/월</span></p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['교적관리', '명부·세대·가족, 직분, 출석, 심방'],
                ['목장·구역', '조직과 보고, 자료실'],
                ['새가족', '안내와 등록, 정착 관리'],
                ['교회 양식', '수련회·차량·봉사 접수'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 text-[15px]">
                  <span className="font-bold">{t}</span><span className="text-[#61697a]"> — {d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* D. 사용량 */}
          <div className="mt-12">
            <Eyebrow>사용량 · 저장공간과 트래픽</Eyebrow>
            <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">대부분 포함 범위 안에서 운영하십니다</h2>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-[1.8] text-[#4a5262]">구독료에는 교회가 일반적으로 쓰시는 만큼의 저장공간과 트래픽이 포함됩니다. 설교 영상을 직접 올리시거나 사진·영상이 크게 늘어 포함 범위를 넘어서면 초과분에 대한 사용료가 별도로 발생합니다.</p>
            <p className="mt-4 text-[14.5px] leading-[1.8] text-[#61697a]">설교 영상은 유튜브를 연결해 쓰시면 저장공간과 트래픽을 거의 쓰지 않습니다. 포함 범위와 초과 단가는 상담에서 안내드립니다.</p>
          </div>

          {/* 개척 지원 / 결제 조건 링크 */}
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="rounded-[16px] border border-[#dbe6f7] bg-[#f4f8ff] p-7">
              <h3 className="text-[19px] font-extrabold tracking-[-0.03em]">개척·미자립교회 지원</h3>
              <p className="mt-2.5 text-[15px] leading-[1.8] text-[#4a5262]">첫 1년 월 $39, 초기 구축 $200으로 시작하십니다. 함께 세우시는 교회는 구독료 월 $20을 감면받습니다.</p>
              <a href="/support-program" className="mt-4 inline-block text-[14.5px] font-bold text-[#1466d6] hover:underline">지원 프로그램 보기 →</a>
            </div>
            <div className="rounded-[16px] border border-[#e5e7eb] p-7">
              <h3 className="text-[19px] font-extrabold tracking-[-0.03em]">결제와 해지 조건</h3>
              <p className="mt-2.5 text-[15px] leading-[1.8] text-[#4a5262]">청구 주기, 갱신, 초기 구축비, 해지, 도메인, 내려받기 등 교회 재정부 승인에 필요한 항목을 정리했습니다.</p>
              <a href="/billing" className="mt-4 inline-block text-[14.5px] font-bold text-[#1466d6] hover:underline">결제 조건 전체 보기 →</a>
            </div>
          </div>
        </div>
      </section>

      <MarketingCTA title="교회 규모를 알려 주시면 견적을 정리해 드립니다" />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
