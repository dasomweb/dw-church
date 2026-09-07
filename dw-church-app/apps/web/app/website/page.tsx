import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// truelight.app 마케팅 — 홈페이지 기능 (/website). "웹사이트 전체 시안" 기준.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-[#1466d6]">{children}</span>;
}

export default function WebsitePage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="홈페이지"
        title={<>성도와 방문자가 보는 페이지 12개를<br className="hidden sm:block" /> 기본으로 제공합니다</>}
        desc="등급을 나눠 잠가 두지 않습니다. 교회 규모와 상관없이 모두 같습니다."
      />

      {/* 01 예배와 말씀 */}
      <section className="bg-white">
        <div className={`${CONTAINER} pt-16 sm:pt-20`}>
          <Eyebrow>01 · 예배와 말씀</Eyebrow>
          <h2 className="mt-3.5 text-[26px] font-extrabold tracking-[-0.048em] sm:text-[32px]">성도가 가장 자주 찾는 페이지</h2>
          <div className="mt-7 grid gap-[18px] sm:grid-cols-2">
            {[
              { t: '설교', d: '제목·본문·설교자·날짜를 등록하고 영상 주소를 연결합니다. 주소를 넣으면 제목과 썸네일이 따라 들어옵니다. 성도는 설교자와 카테고리로 지난 설교를 찾습니다.' },
              { t: '주보', d: '주간 주보를 PDF나 이미지로 올리면 날짜별로 정리됩니다. 예배에 참석하지 못한 성도가 지난 주보를 열어 봅니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[16px] border border-[#e5e7eb] p-7 sm:p-8">
                <b className="mb-2.5 block text-[19px] tracking-[-0.03em]">{c.t}</b>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4a5262]">{c.d}</p>
                <div className="flex h-[150px] items-center justify-center rounded-[10px] bg-[#f4f6f9] text-[13px] font-medium text-[#8b93a3]">{c.t} 화면</div>
              </div>
            ))}
            {[
              { t: '목회칼럼', d: '담임목사와 교역자의 글을 연재 형태로 올립니다.' },
              { t: '오늘의 말씀', d: '대표 말씀 구절을 홈 화면에 표시합니다.' },
              { t: '영상', d: '찬양·교육 영상을 카테고리별 게시판으로 정리합니다.' },
              { t: '앨범', d: '행사와 모임 사진을 카테고리별 갤러리로 올립니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[16px] border border-[#e5e7eb] p-6 sm:px-7 sm:py-6">
                <b className="mb-2 block text-[17px] tracking-[-0.03em]">{c.t}</b>
                <p className="text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 교회 안내 */}
      <section className="bg-white">
        <div className={`${CONTAINER} pt-10 sm:pt-12`}>
          <Eyebrow>02 · 교회 안내</Eyebrow>
          <h2 className="mb-6 mt-3.5 text-[26px] font-extrabold tracking-[-0.048em] sm:text-[32px]">처음 오시는 분이 찾는 정보</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: '예배 및 모임', d: '주일예배와 각 모임 시간을 시간표로 정리합니다.' },
              { t: '교역자', d: '직분과 담당 부서, 사진을 함께 소개합니다.' },
              { t: '연혁', d: '교회 연혁을 연도별로 정리해 보여 줍니다.' },
              { t: '행사', d: '교회 행사 일정과 안내를 등록합니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[14px] border border-[#e5e7eb] p-6">
                <b className="mb-2 block text-[17px] tracking-[-0.03em]">{c.t}</b>
                <p className="text-[14px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 소식과 나눔 */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-10 sm:py-14`}>
          <Eyebrow>03 · 소식과 나눔</Eyebrow>
          <h2 className="mb-6 mt-3.5 text-[26px] font-extrabold tracking-[-0.048em] sm:text-[32px]">교회 소식을 전하는 페이지</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: '게시판', d: '공지사항·선교소식·교회소식을 카테고리로 나눠 운영합니다. 필요한 게시판을 추가할 수 있습니다.' },
              { t: '배너', d: '홈 화면 상단 배너를 교회에서 직접 교체합니다. 절기와 행사에 맞춰 바꿉니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-[14px] border border-[#e5e7eb] p-6 sm:px-7 sm:py-6">
                <b className="mb-2 block text-[17px] tracking-[-0.03em]">{c.t}</b>
                <p className="text-[14.5px] leading-[1.8] text-[#61697a]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 디자인과 모바일 */}
      <section className="border-t border-[#eceae6] bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <Eyebrow>04 · 디자인과 모바일</Eyebrow>
          <h2 className="mb-7 mt-3.5 text-[26px] font-extrabold tracking-[-0.048em] sm:text-[32px]">디자인은 저희가 제작합니다</h2>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10">
            <div className="flex flex-col gap-3">
              {[
                { t: '교회에 맞춘 디자인 제작', d: '교회 이름과 색, 사진에 맞춰 디자인하고 페이지를 구성합니다. 교회가 직접 만들지 않으십니다.' },
                { t: '휴대폰 화면', d: '모든 페이지가 휴대폰에서 그대로 열립니다. 성도 대부분이 휴대폰으로 접속합니다.' },
                { t: '영어 페이지', d: '한국어로 등록한 내용이 영어 페이지에도 반영됩니다. 교회에서 쓰는 표현은 직접 고쳐 두실 수 있습니다.' },
                { t: '교회 도메인 연결', d: '교회 명의 도메인을 연결해 오픈합니다. 쓰고 계신 주소를 그대로 쓰실 수 있습니다.' },
              ].map((f) => (
                <div key={f.t} className="rounded-[12px] border border-[#e5e7eb] bg-white p-5 sm:px-6 sm:py-5">
                  <b className="mb-1.5 block text-[16.5px]">{f.t}</b>
                  <p className="text-[14.5px] leading-[1.8] text-[#61697a]">{f.d}</p>
                </div>
              ))}
            </div>
            <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-gradient-to-br from-[#12233b] to-[#1a3358] p-8 text-center lg:h-[460px]">
              <span className="text-[16px] font-bold leading-[1.6] text-[#c3d3ea]">데스크톱과 휴대폰에서<br />그대로 열리는 교회 홈페이지</span>
            </div>
          </div>
        </div>
      </section>

      <MarketingCTA title="교회에 맞는 구성을 정리해 드립니다" desc="지금 사이트가 있으면 함께 보고 무엇을 옮길지 정합니다." secondaryLabel="요금 보기" secondaryHref="/pricing" />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
