import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 회사 소개 (/company). 실적 주장 없이, 하는 일과 방식·연락처만.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="회사 소개"
        title={<>미주 한인교회만<br className="hidden sm:block" /> 생각합니다</>}
        desc="TRUE LIGHT는 다솜웹(DASOMWEB)이 만드는 교회 행정 통합 시스템입니다. 홈페이지와 교적관리를 한 시스템에 두고, 구축과 운영을 대행합니다."
      />

      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { t: '한인 이민교회 전용', d: '설교·주보·목장·새가족처럼 교회에서 실제로 반복되는 업무를 기준으로 시스템을 설계했습니다.' },
              { t: '사람이 직접 구축', d: '디자인과 페이지 구성, 기존 사이트 자료 이관을 사람이 직접 대행합니다. 교회에 전산 담당자가 없어도 됩니다.' },
              { t: '기술은 저희가', d: '호스팅 환경과 보안 인증, 백업, 도메인 연결 유지를 저희가 맡습니다. 교회는 소식 등록과 사역 운영에 집중하십니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[16px] border border-[#e5e7eb] p-6 sm:p-7">
                <b className="text-[18px] tracking-[-0.03em]">{c.t}</b>
                <p className="mt-2.5 text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <h2 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.048em] sm:text-[32px]">만드는 일은 시작일 뿐입니다</h2>
              <p className="mt-4 text-[16px] leading-[1.85] text-[#4a5262] sm:text-[17px]">멈춘 교회 사이트들은 만들 방법이 없어서 멈춘 것이 아닙니다. 맡아 주셨던 분이 떠나면서 멈췄습니다. 저희는 담당자가 바뀌어도 사이트와 행정이 이어지도록, 구축 이후의 운영까지 함께 맡습니다.</p>
            </div>
            <div>
              <h3 className="text-[15px] font-extrabold tracking-[0.04em] text-[#1466d6]">연락처</h3>
              <div className="mt-4 space-y-2.5 text-[15.5px] leading-[1.8] text-[#41495a]">
                <p><span className="inline-block w-20 text-[#61697a]">이메일</span><a href="mailto:info@dasomweb.com" className="font-semibold text-[#1466d6] hover:underline">info@dasomweb.com</a></p>
                <p><span className="inline-block w-20 text-[#61697a]">전화</span><a href="tel:+14708395151" className="font-semibold text-[#16181d]">1-470-839-5151</a></p>
                <p><span className="inline-block w-20 align-top text-[#61697a]">주소</span><span>1172 Satellite Blvd NW Ste 110,<br />Suwanee, GA 30024</span></p>
                <p><span className="inline-block w-20 text-[#61697a]">상담 시간</span>월–금 오전 9시–오후 5시 (EST)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingCTA />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
