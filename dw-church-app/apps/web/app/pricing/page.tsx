import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 요금 (/pricing). 구독은 월 $99 단일, 교회마다 달라지는 것은
// 초기 구축·교회 행정·사용량 셋. 저장공간만 과금(트래픽 추가요금 없음), 기본 10GB 포함.
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
        title={<>매달 나가는 비용이<br className="hidden sm:block" /> 달라지지 않습니다</>}
        desc="홈페이지 구독료는 월 $99이며, 성도가 늘어도 오르지 않습니다. 교회마다 달라지는 것은 초기 구축 범위, 교회 행정 시스템, 사용량 세 가지입니다."
      />

      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <p className="mb-8 text-[14px] text-[#61697a]">아래 금액은 안내 기준가이며, 최종 금액은 상담에서 확정됩니다.</p>

          {/* A. 매달 — 홈페이지 구독 */}
          <div className="rounded-[18px] border-2 border-[#1466d6] bg-[#eef4ff] p-7 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <Eyebrow>매달 · 홈페이지 구독</Eyebrow>
                <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">12가지 화면, 전부 포함</h2>
                <p className="mt-2 text-[15.5px] leading-[1.8] text-[#4a5262]">성도가 보는 화면 12가지가 모두 들어갑니다. 요금제에 따라 기능이 달라지지 않습니다.</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <div><span className="text-[44px] font-extrabold tracking-[-0.03em]">$99</span><span className="ml-1 text-[17px] text-[#61697a]">/월</span></div>
                <div className="mt-1 text-[13px] text-[#61697a]">연 결제 시 2개월 무료</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['설교', '주보', '목회칼럼', '오늘의 말씀', '앨범', '영상', '예배 및 모임', '행사', '배너', '교역자', '연혁', '게시판'].map((p) => (
                <span key={p} className="rounded-full border border-[#c9dcff] bg-white px-3 py-1.5 text-[13.5px] font-medium text-[#233043]">{p}</span>
              ))}
            </div>
            <p className="mt-5 text-[15px] leading-[1.8] text-[#4a5262]">교회 도메인 연결, SSL 보안 인증서, 정기 백업, 한·영 이중 언어 화면까지 포함됩니다.</p>
          </div>

          {/* B. 처음 한 번 — 초기 구축 */}
          <div className="mt-12">
            <Eyebrow>처음 한 번 · 초기 구축</Eyebrow>
            <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">교회 자료를 받아 직접 디자인하고 구성해 드립니다</h2>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-[1.8] text-[#4a5262]">구축 범위에 따라 세 가지로 나뉩니다. 어느 쪽이 맞는지는 상담에서 함께 정해 드립니다.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {[
                { t: '새로 시작하는 교회', price: '$600', d: '예배 안내와 오시는 길, 설교·주보, 교역자 소개 등 성도가 가장 많이 찾는 화면을 구성하고, 교회에서 주신 자료를 정리해 올려 드립니다.' },
                { t: '부서·사역 화면까지', price: '$900', d: '교육부, 한국학교, 목장, 새가족처럼 나뉜 사역마다 안내 화면을 따로 구성합니다.' },
                { t: '기존 사이트 이관까지', price: '$1,400 부터', d: '지금 쓰시는 사이트의 설교·주보·게시물·사진을 그대로 옮겨 드립니다. 자료 분량에 따라 달라지므로, 현재 사이트를 확인한 뒤 최종 금액을 알려 드립니다.' },
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
                <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">필요한 기능만 골라 매달 추가하실 수 있습니다</h2>
                <p className="mt-2 text-[15.5px] leading-[1.8] text-[#4a5262]">교적관리와 목장, 새가족, 교회 양식은 홈페이지 구독과는 별도 상품입니다. 필요하지 않으시면 추가하지 않으셔도 됩니다.</p>
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

          {/* D. 사용량 — 저장공간 */}
          <div className="mt-12">
            <Eyebrow>사용량 · 저장공간</Eyebrow>
            <h2 className="mt-2 text-[23px] font-extrabold tracking-[-0.03em] sm:text-[26px]">과금 대상은 저장공간뿐입니다</h2>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-[1.8] text-[#4a5262]">성도 접속량에 따른 추가 트래픽 요금은 없습니다. 구독료에 기본 저장공간 10GB가 포함되며, 사진과 파일이 늘어 이를 넘는 경우에만 초과분에 사용료가 발생합니다.</p>
            <p className="mt-4 text-[14.5px] leading-[1.8] text-[#61697a]">설교 영상은 유튜브를 연결해 쓰시면 저장공간을 거의 차지하지 않습니다. 초과 단가는 결제 조건 페이지에서 확인하실 수 있습니다.</p>
          </div>

          {/* 개척 지원 / 결제 조건 링크 */}
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="rounded-[16px] border border-[#dbe6f7] bg-[#f4f8ff] p-7">
              <h3 className="text-[19px] font-extrabold tracking-[-0.03em]">개척·미자립교회 지원</h3>
              <p className="mt-2.5 text-[15px] leading-[1.8] text-[#4a5262]">첫 1년은 월 $39, 초기 구축은 $200으로 시작하실 수 있습니다. 개척교회를 후원하시는 교회는 1년간 구독료에서 월 $20을 감면해 드립니다.</p>
              <a href="/support-program" className="mt-4 inline-block text-[14.5px] font-bold text-[#1466d6] hover:underline">지원 프로그램 보기 →</a>
            </div>
            <div className="rounded-[16px] border border-[#e5e7eb] p-7">
              <h3 className="text-[19px] font-extrabold tracking-[-0.03em]">결제와 해지 조건</h3>
              <p className="mt-2.5 text-[15px] leading-[1.8] text-[#4a5262]">청구 주기, 갱신, 초기 구축비, 해지, 도메인, 데이터 내보내기 등 교회 재정부 승인에 필요한 항목을 정리했습니다.</p>
              <a href="/billing" className="mt-4 inline-block text-[14.5px] font-bold text-[#1466d6] hover:underline">결제 조건 전체 보기 →</a>
            </div>
          </div>
        </div>
      </section>

      <MarketingCTA
        title="교회 상황을 알려 주시면 맞는 구성을 정리해 드립니다"
        desc="어떤 구성이 필요한지 함께 살펴보고 정리해 드립니다. 데모는 실제 운영 화면으로 보여 드립니다."
        primaryLabel="도입 상담 신청"
        secondaryLabel="데모 신청"
      />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
