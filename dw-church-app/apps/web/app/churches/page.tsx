import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';

// /churches — 함께한 교회(시안 상세 §6, 사례). 서버 컴포넌트.
// 색·타입은 랜딩 v2 디자인 시스템. 외부 이미지 핫링크 금지 — 화면 캡처 자리는 회색 슬롯.

const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

// 이미지 슬롯 — 실제 캡처가 들어갈 자리. 회색 라운드 패널 + 국문 라벨.
function ImgSlot({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{ aspectRatio: '16 / 10', background: '#f2f3f6' }}
      role="img"
      aria-label={label}
    >
      <span className="px-6 text-center text-[13px] font-medium text-[#8b93a3]" style={{ letterSpacing: '-0.01em' }}>
        {label}
      </span>
    </div>
  );
}

const CASES: { img: string; name: string; size: string; request: string; result: string }[] = [
  {
    img: '[IMG] 라그란지 한인침례교회 화면',
    name: '라그란지 한인침례교회',
    size: '○○명 · 조지아 라그란지',
    request: '처음 오시는 분이 예배 시간과 오시는 길을 바로 찾을 수 있게',
    result: '예배 안내와 설교를 중심으로 구성. 오픈까지 ○주.',
  },
  {
    img: '[IMG] 웨이크처치 화면',
    name: '웨이크처치',
    size: '○○명 · 조지아 뷰포드',
    request: '쓰던 도메인을 유지하면서 사이트만 새로',
    result: '자체 도메인 연결로 오픈. 이후 기술 관리는 저희가 담당.',
  },
];

export default function ChurchesPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <section className="bg-white">
          <div className={`${CONTAINER} py-12 sm:py-20`}>
            <h1 className="text-[32px] text-[#16181d] sm:text-[44px]" style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.2 }}>
              함께한 교회들
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] text-[#4b5464] sm:text-[17.5px]" style={{ lineHeight: 1.85 }}>
              교회 규모와 요청이 무엇이었고 어떻게 정리됐는지까지 담았습니다.
            </p>

            {/* 사례 카드 2건 */}
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {CASES.map((c) => (
                <div key={c.name} className="overflow-hidden rounded-xl border border-[#e7e9ee] bg-white">
                  <ImgSlot label={c.img} />
                  <div className="p-6">
                    <h2 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em' }}>{c.name}</h2>
                    <dl className="mt-4 space-y-3 text-[15px]">
                      <div>
                        <dt className="text-[13px] font-bold tracking-[0.03em] text-[#1466d6]">규모</dt>
                        <dd className="mt-0.5 text-[#4b5464]" style={{ lineHeight: 1.7 }}>{c.size}</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] font-bold tracking-[0.03em] text-[#1466d6]">요청</dt>
                        <dd className="mt-0.5 text-[#4b5464]" style={{ lineHeight: 1.7 }}>{c.request}</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] font-bold tracking-[0.03em] text-[#1466d6]">결과</dt>
                        <dd className="mt-0.5 text-[#4b5464]" style={{ lineHeight: 1.7 }}>{c.result}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ))}
            </div>

            {/* 사례 추가 자리 (내부 안내) */}
            <div className="mt-6 rounded-xl border border-dashed border-[#cfd4dd] bg-[#fbfaf8] p-6 text-[14.5px] text-[#61697a]" style={{ lineHeight: 1.8 }}>
              사례 추가 자리 — 규모 · 요청 · 결과 3줄을 갖춘 사례를 더 채우면 이 페이지가 신뢰의 근거가 됩니다. 교적관리까지 쓰시는 교회 사례가 하나라도 있으면 가장 강합니다. 각 교회에 화면 캡처 사용 동의와 짧은 추천사를 함께 요청하시는 것이 효율적입니다.
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-[#e7e4de] bg-[#fbfaf8] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="text-[16px] text-[#233043]" style={{ lineHeight: 1.75 }}>
                우리 교회에는 어떤 구성이 맞을지, 사정을 듣고 먼저 정리해 드립니다.
              </p>
              <a
                href="/apply"
                className="inline-flex min-h-[48px] flex-none items-center justify-center rounded-xl bg-[#2b7fff] px-7 text-[16px] font-semibold text-white transition-colors hover:bg-[#1466d6]"
              >
                상담 신청
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
