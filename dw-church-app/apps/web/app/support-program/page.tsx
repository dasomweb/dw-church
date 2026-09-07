import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 개척교회 지원 (/support-program). 홈 지원 티저 + 함께 세우는 교회.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

export default function SupportProgramPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="개척교회 지원"
        title={<>개척·미자립교회를<br className="hidden sm:block" /> 함께 세웁니다</>}
        desc="홈페이지가 없어서 찾아오시려는 분을 만나지 못하는 일은 없어야 한다고 생각합니다."
      />

      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="max-w-[760px]">
            <p className="text-[16px] leading-[1.85] text-[#4a5262] sm:text-[17px]">개척교회나 아직 자립하지 못한 교회는 첫 1년 동안 낮은 비용으로 시작하시고, 그 교회를 함께 세워 주시는 교회는 구독료를 감면받습니다. 복잡한 서류는 받지 않습니다 — 상담에서 교회 사정과 함께 세우실 교회를 말씀해 주시면 됩니다.</p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              { t: '돕는 교회', price: '구독료 월 $20 감면', d: '정상 요금 자립교회가 한 교회를 함께 세우실 때마다, 지원하는 1년 동안. 최대 세 교회까지.' },
              { t: '개척·미자립교회', price: '첫 1년 월 $39 · 초기 구축 $200', d: '자립 이전 교회. 돕는 교회 없이 신청하셔도 같은 조건입니다. 1년 후에는 교회 사정에 맞춰 이어서 안내드립니다.' },
              { t: '교회 행정은 나중에', price: '홈페이지만으로 시작', d: '홈페이지만으로 시작하시고, 교적관리는 성도가 늘어난 뒤에 켜시면 됩니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[16px] border border-[#e5e7eb] p-6 sm:p-7">
                <b className="text-[17px] tracking-[-0.03em]">{c.t}</b>
                {c.price && <p className="mt-1.5 text-[15.5px] font-bold text-[#1466d6]">{c.price}</p>}
                <p className="mt-2.5 text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-14 sm:py-16`}>
          <h2 className="text-[24px] font-extrabold tracking-[-0.04em] sm:text-[30px]">지원 확인 방법</h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.8] text-[#4a5262]">지원 신청은 소속 교단·교협 확인과 담임목사 안수 교단 확인, 그리고 함께 세우시는 교회의 추천으로 확인합니다. 저희 서비스는 정통 기독교 신앙을 고백하는 교회를 대상으로 제공합니다. 무교단·독립교회도 신청하실 수 있습니다.</p>
          <p className="mt-4 text-[14.5px] text-[#61697a]">감면은 신청 후 심사·승인을 거쳐 적용되며 자동이 아닙니다. 감면 폭과 대상 기준의 세부는 상담에서 확정합니다.</p>
        </div>
      </section>

      <MarketingCTA title="함께 세우실 교회를 말씀해 주세요" desc="교회 사정과 함께 세우실 교회를 알려 주시면 지원 조건을 정리해 드립니다." primaryLabel="지원 상담 신청" />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
