import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import MarketingCTA from '../../components/MarketingCTA';
import MarketingSubHero from '../../components/MarketingSubHero';
import FaviconSetter from '../../components/FaviconSetter';

// /churches — 함께한 교회 (도입 사례). "상세 시안" §6 기준, 새 디자인 시스템.
// 외부 이미지 핫링크 금지 — 실제 캡처는 R2 자체호스팅.
const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-6';

const R2 = 'https://pub-674328f08783498389f7857dc6e1ab00.r2.dev';
const CASES: { name: string; size: string; request: string; result: string; src?: string; label: string }[] = [
  {
    name: '라그란지 한인침례교회',
    size: '○○명 · 조지아 라그란지',
    request: '처음 오시는 분이 예배 시간과 오시는 길을 바로 찾을 수 있게',
    result: '예배 안내와 설교를 중심으로 구성. 오픈까지 ○주.',
    src: `${R2}/shared/gallery/2031c682-e6c5-4d9b-ba41-f09b352bc57d.jpg`,
    label: '라그란지 한인침례교회 화면',
  },
  {
    name: '웨이크처치',
    size: '○○명 · 조지아 뷰포드',
    request: '쓰던 도메인을 유지하면서 사이트만 새로',
    result: '자체 도메인 연결로 오픈. 이후 기술 관리는 저희가 담당.',
    src: `${R2}/shared/gallery/d7586ffd-b75d-4b6f-b80c-710d95574711.jpg`,
    label: '웨이크처치 화면',
  },
];

export default function ChurchesPage() {
  return (
    <div className="min-h-screen bg-white text-[#16181d]" style={{ letterSpacing: '-0.02em' }}>
      <MarketingHeader />
      <MarketingSubHero
        crumb="도입 사례"
        title="함께한 교회들"
        desc="교회 규모와 요청이 무엇이었고 어떻게 정리됐는지까지 담았습니다."
      />

      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="grid gap-6 md:grid-cols-2">
            {CASES.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white">
                {c.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.src} alt={c.label} loading="lazy" className="w-full object-cover" style={{ aspectRatio: '16 / 10', background: '#f2f3f6' }} />
                ) : (
                  <div className="flex items-center justify-center text-[13px] text-[#8b93a3]" style={{ aspectRatio: '16 / 10', background: '#f2f3f6' }}>{c.label}</div>
                )}
                <div className="p-6 sm:p-7">
                  <h2 className="text-[19px] font-extrabold tracking-[-0.03em]">{c.name}</h2>
                  <dl className="mt-4 grid grid-cols-[64px_1fr] gap-x-4 gap-y-2.5 text-[14.5px] leading-[1.7]">
                    <dt className="font-semibold text-[#61697a]">규모</dt><dd className="text-[#41495a]">{c.size}</dd>
                    <dt className="font-semibold text-[#61697a]">요청</dt><dd className="text-[#41495a]">{c.request}</dd>
                    <dt className="font-semibold text-[#61697a]">결과</dt><dd className="text-[#41495a]">{c.result}</dd>
                  </dl>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[14px] border border-dashed border-[#cfd5de] bg-[#fbfaf8] p-6 text-[14.5px] leading-[1.8] text-[#61697a]">
            사례를 더 채우면 이 페이지가 신뢰의 근거가 됩니다. 교적관리까지 쓰시는 교회 사례가 하나라도 있으면 가장 강합니다 — 각 교회에 화면 캡처 사용 동의와 짧은 추천사를 함께 요청하시는 것이 효율적입니다.
          </div>
        </div>
      </section>

      <MarketingCTA title="우리 교회에는 어떤 구성이 맞을까요" desc="교회 사정을 듣고 어떤 구성이 맞을지 먼저 정리해 드립니다." />
      <MarketingFooter />
      <FaviconSetter />
    </div>
  );
}
