import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 교적관리 (/membership). 홈 "교적관리 모듈" + 시스템 콘텐츠를
// 디자인 시스템으로 정리한 페이지.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-[#1466d6]">{children}</span>;
}

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="교적관리"
        title={<>교적을 기준으로<br className="hidden sm:block" /> 교회 행정을 하나로</>}
        desc="홈페이지와 별도로 신청하는 교회 행정 모듈입니다. 교적 위에서 목장과 새가족, 출석과 심방이 같은 자료를 씁니다."
      />

      {/* 왜 교적 기준인가 */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="max-w-[780px]">
            <Eyebrow>왜 교적을 기준으로 두는가</Eyebrow>
            <h2 className="mt-3.5 text-[26px] font-extrabold leading-[1.3] tracking-[-0.048em] sm:text-[34px]">명단을 두 번 옮겨 적지 않습니다</h2>
            <p className="mt-4 text-[16px] leading-[1.85] text-[#4a5262] sm:text-[17px]">교적은 엑셀로, 목장은 메신저로, 새가족은 종이로 흩어지면 같은 사람을 여러 번 적게 됩니다. 교적관리는 교적을 한 곳에 두고, 목장 편성과 새가족 정착이 그 교적을 그대로 씁니다. 새가족이 홈페이지에서 등록하면 관리자 화면에서 교인으로 이어집니다.</p>
          </div>
        </div>
      </section>

      {/* 무엇을 관리하나 */}
      <section className="border-y border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <h2 className="mb-8 text-[26px] font-extrabold tracking-[-0.048em] sm:text-[34px]">무엇을 관리하나요</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: '교인 명부', d: '이름·생년·연락처·주소·직분·신급·상태. 검색과 필터로 바로 찾습니다.' },
              { t: '세대 · 가족', d: '세대주와 가족 관계를 묶습니다. 한 가정을 한눈에 봅니다.' },
              { t: '직분 임명', d: '직분 임명 이력을 남기고 명부에 반영합니다.' },
              { t: '출석', d: '예배별 출석을 기록하고 장기결석을 확인합니다.' },
              { t: '심방 · 상담', d: '심방과 상담 내용을 교역자 전용으로 남깁니다.' },
              { t: '성례 · 이동', d: '세례·입교 등 성례와 전입·전출을 기록합니다.' },
              { t: '목장 · 구역', d: '교적 위에서 조직을 편성하고 주간 보고를 받습니다. 분가 계보까지 이어집니다.' },
              { t: '새가족', d: '홈페이지 등록을 관리자 화면에서 받아 정착 과정을 이어 갑니다.' },
              { t: '교회 양식', d: '수련회·차량·봉사 신청 양식을 만들어 접수하고 처리합니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[14px] border border-[#e5e7eb] bg-white p-6">
                <b className="mb-2 block text-[17px] tracking-[-0.03em]">{c.t}</b>
                <p className="text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 교육/보고 */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[16px] border border-[#e5e7eb] p-7 sm:p-8">
              <Eyebrow>목장 운영</Eyebrow>
              <h3 className="mt-3 text-[20px] font-extrabold tracking-[-0.035em]">보고와 교육, 자료실까지</h3>
              <p className="mt-3 text-[15px] leading-[1.8] text-[#4a5262]">목자는 주간 리포트를 올리고, 교역자는 제출 현황을 봅니다. 새가족반·제자훈련 같은 교육 과정과 차수·출결, 공지와 자료실을 한 자리에서 운영합니다.</p>
            </div>
            <div className="rounded-[16px] border border-[#e5e7eb] p-7 sm:p-8">
              <Eyebrow>담당자 구분</Eyebrow>
              <h3 className="mt-3 text-[20px] font-extrabold tracking-[-0.035em]">부서별로 볼 수 있는 범위를 정합니다</h3>
              <p className="mt-3 text-[15px] leading-[1.8] text-[#4a5262]">교육부·목장·새가족 담당자가 각자 자기 영역을 관리합니다. 심방 기록처럼 민감한 내용은 교역자 전용으로 둡니다. 담당자가 바뀌어도 이어서 관리됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 신청 안내 */}
      <section className="border-t border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-14 sm:py-16`}>
          <div className="rounded-[18px] border border-[#dbe6f7] bg-[#f4f8ff] p-7 sm:p-9">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h3 className="text-[21px] font-extrabold tracking-[-0.035em]">필요해질 때 신청하시면 됩니다</h3>
                <p className="mt-2 text-[15px] leading-[1.8] text-[#4a5262]">홈페이지만으로 시작하고, 교적관리는 성도가 늘어난 뒤에 켜셔도 됩니다. 네 가지를 함께 쓰실 때 월 $69.</p>
              </div>
              <a href="/pricing" className="shrink-0 text-[15px] font-bold text-[#1466d6] hover:underline">요금 자세히 보기 →</a>
            </div>
          </div>
        </div>
      </section>

      <MarketingCTA title="교적을 지금 어떻게 관리하고 계신가요" desc="엑셀·종이·메신저로 흩어진 것도 괜찮습니다. 상담에서 함께 정리해 드립니다." />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
