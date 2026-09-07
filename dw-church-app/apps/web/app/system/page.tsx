import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 시스템 소개 (/system). "웹사이트 전체 시안" 기준.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

export default function SystemPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="시스템 소개"
        title={<>교회 행정과 홈페이지를<br className="hidden sm:block" /> 한 시스템에서 관리합니다</>}
        desc="관리자 화면에서 교적과 사역을 관리하고, 성도에게 공개할 자료는 홈페이지로 내보냅니다."
      />

      {/* 교회 업무 기준 */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mb-9 max-w-[780px]">
            <h2 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.048em] sm:text-[34px]">교회 업무를 기준으로 만든 시스템</h2>
            <p className="mt-4 text-[16px] leading-[1.85] text-[#4a5262] sm:text-[17px]">일반 홈페이지 도구는 회사 소개나 쇼핑몰을 기준으로 만들어져 있습니다. 교회에서 실제로 반복되는 업무는 설교와 주보 등록, 교적 정리, 목장 편성과 보고, 새가족 정착 관리입니다. 이 업무를 화면 단위로 두고 설계했습니다.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-[18px]">
            {[
              { n: '01', t: '주중 업무 화면', d: '설교·주보·앨범·영상·공지를 등록합니다. 등록한 자료는 홈페이지 해당 페이지에 반영됩니다.' },
              { n: '02', t: '교적과 사역 화면', d: '교적을 기준으로 세대와 직분을 정리하고, 출석·심방·성례를 기록합니다. 목장 편성과 새가족 관리가 같은 자료를 씁니다.' },
              { n: '03', t: '설정 화면', d: '교회 기본 정보와 예배 시간, 관리자 계정, 신청한 부가기능을 관리합니다.' },
            ].map((c) => (
              <div key={c.n} className="rounded-[16px] border border-[#e5e7eb] p-7 sm:p-8">
                <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-[#1466d6]">{c.n}</span>
                <b className="mt-3 block text-[19px] tracking-[-0.035em]">{c.t}</b>
                <p className="mt-2.5 text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 관리자 화면 구성 */}
      <section className="border-y border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <h2 className="mb-8 text-[26px] font-extrabold leading-[1.3] tracking-[-0.048em] sm:text-[34px]">관리자 화면 구성</h2>
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-10">
            <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-gradient-to-br from-[#12233b] to-[#1a3358] p-8 text-center lg:h-[400px]">
              <span className="text-[17px] font-bold leading-[1.6] text-[#c3d3ea]">관리자 대시보드에서<br />이번 주 할 일을 한눈에</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { t: '이번 주 할 일', d: '이번 주 설교와 주보가 등록되었는지, 접수된 새가족과 신청서가 있는지 첫 화면에서 확인합니다.' },
                { t: '부서별 담당자 구분', d: '교육부·목장·새가족 담당자가 각각 자기 영역을 등록합니다. 담당자별로 볼 수 있는 범위를 정할 수 있습니다.' },
                { t: '등록 이력', d: '누가 언제 무엇을 등록했는지 남습니다. 담당자가 바뀌어도 이어서 관리할 수 있습니다.' },
                { t: '휴대폰에서도 등록', d: '관리자 화면도 휴대폰에서 열립니다. 행사 사진처럼 현장에서 올릴 자료를 바로 등록합니다.' },
              ].map((f) => (
                <div key={f.t} className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 sm:px-[22px] sm:py-5">
                  <b className="mb-1.5 block text-[16px]">{f.t}</b>
                  <p className="text-[14.5px] leading-[1.75] text-[#61697a]">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 도입 절차 */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <h2 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.048em] sm:text-[34px]">도입 절차</h2>
          <p className="mt-3 text-[16px] text-[#61697a] sm:text-[16.5px]">상담부터 오픈까지 저희가 진행하고, 교회는 자료 확인과 최종 검토만 하십니다.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: 'STEP 1', t: '상담과 구성 정리', d: '교회 규모와 부서 구조를 듣고 필요한 페이지와 모듈을 정리해 견적을 드립니다.' },
              { n: 'STEP 2', t: '디자인과 구축', d: '교회에 맞게 디자인하고 페이지를 구성합니다. 기존 사이트 자료와 교적 파일을 옮겨 담습니다.' },
              { n: 'STEP 3', t: '검토와 사용 안내', d: '완성된 화면을 확인하고 수정 사항을 반영합니다. 담당자 사용 안내를 진행합니다.' },
              { n: 'STEP 4', t: '도메인 연결과 오픈', d: '교회 도메인을 연결해 공개합니다. 이후 시스템 운영은 저희가 담당합니다.' },
            ].map((s) => (
              <div key={s.n} className="rounded-[14px] border border-[#e5e7eb] p-6">
                <span className="text-[11.5px] font-extrabold text-[#2b7fff]">{s.n}</span>
                <b className="mb-2 mt-2 block text-[17px] tracking-[-0.03em]">{s.t}</b>
                <p className="text-[14px] leading-[1.8] text-[#61697a]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingCTA desc="교회 규모에 맞춘 화면으로 안내드립니다." />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
