import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';

// /billing — 결제와 해지(시안 상세 §5). 교회 재정부·당회 승인용, 이용약관 정리본.
// 서버 컴포넌트. 색·타입은 랜딩 v2 디자인 시스템. 경고색(빨강) 사용 금지 —
// 시안의 "확정 필요" 빨강 메모는 내부용이므로 값은 ○ 플레이스홀더/중립 문구로 둔다.

const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

// 결제·해지 항목 (라벨 / 설명). 최종 기준은 약관.
const TERMS: { label: string; desc: string }[] = [
  { label: '청구 주기', desc: '홈페이지 구독은 선불 월 구독입니다. 연 결제(1년 선불)도 선택하실 수 있습니다.' },
  { label: '신청 자격', desc: '정통 기독교 신앙을 고백하는 교회. (약관 §2)' },
  { label: '약정 기간', desc: '별도 약정 없이 청구 주기 단위로 연장됩니다.' },
  { label: '갱신', desc: '만료 ○일 전 안내 후 자동 갱신되며, 갱신 전에 해지하실 수 있습니다.' },
  { label: '초기 구축비', desc: '1회 비용이며, 작업이 시작된 뒤에는 환불되지 않습니다.' },
  { label: '해지', desc: '관리자 화면에서 신청하시면 당해 청구 주기 종료일에 효력이 발생합니다. 잔여 기간은 환불되지 않습니다.' },
  { label: '부가기능', desc: '신청 후 확인을 거쳐 활성화되어 구독료에 합산됩니다. 끄시면 다음 청구 주기부터 제외됩니다.' },
  { label: '결제 수단', desc: '카드, 교회 수표, 인보이스로 결제하실 수 있고 영수증은 자동으로 발행됩니다.' },
  { label: '지원 범위', desc: '도움센터와 카카오톡·이메일 문의 응대가 포함됩니다. 대량 콘텐츠 입력 대행, 반복되는 1:1 교육, 실시간 우선 지원은 별도로 안내드립니다.' },
  { label: '개척·미자립 지원', desc: '심사 후 첫 1년 감면가로 시작하시고, 이후는 1년 시점에 교회 사정에 맞춰 안내드립니다. 감면은 승인 후 적용되며 자동이 아닙니다.' },
  { label: '요금 변경', desc: '갱신 시점부터 적용되며, 최소 ○일 전에 안내드립니다.' },
  { label: '도메인', desc: '교회 명의로 둡니다. 연결과 보안은 저희가 맡고, 구입·갱신 비용은 교회가 부담하시며, 해지 후에도 교회 소유로 유지됩니다.' },
  { label: '내려받기', desc: '이용 중에는 언제든 하실 수 있습니다. 해지 전에 받아 두시길 권합니다.' },
  { label: '해지 후 데이터', desc: '보관 기간은 약속하지 않습니다. (약관 §10)' },
];

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        {/* 헤더 */}
        <section className="bg-white">
          <div className={`${CONTAINER} py-12 sm:py-20`}>
            <h1 className="text-[32px] text-[#16181d] sm:text-[44px]" style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.2 }}>
              결제와 해지
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] text-[#4b5464] sm:text-[17.5px]" style={{ lineHeight: 1.85 }}>
              교회 재정부와 당회가 승인하실 때 필요한 항목들입니다. 이용약관의 조항을 읽기 쉽게 정리한 것이며, 최종 기준은 약관입니다.
            </p>

            {/* 상단 2카드 */}
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {/* 매달 내는 것 (강조) */}
              <div className="rounded-2xl border-2 border-[#1466d6] bg-[#f4f8ff] p-7">
                <span className="inline-block text-[12.5px] font-extrabold tracking-[0.06em] text-[#1466d6]">매달 내는 것</span>
                <ul className="mt-4 space-y-4">
                  {[
                    { t: '홈페이지 구독', v: '$99 / 월', d: '모든 교회 같은 값. 성도가 보는 지면은 전부 포함됩니다.' },
                    { t: '교회 행정 묶음', v: '$69 / 월', d: '쓰실 때만. 교적관리·목장·새가족·교회 양식.' },
                    { t: '저장공간 초과분', v: '넘어설 때만', d: '트래픽은 무제한(공정 사용). 저장공간만, 포함 범위를 넘어서면 초과분에 대해서만 사용료가 발생합니다.' },
                  ].map((row) => (
                    <li key={row.t} className="border-t border-[#d9e4f5] pt-4 first:border-t-0 first:pt-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[16px] font-bold text-[#16181d]">{row.t}</span>
                        <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[#1466d6]">{row.v}</span>
                      </div>
                      <p className="mt-1 text-[14px] text-[#4b5464]" style={{ lineHeight: 1.7 }}>{row.d}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 처음 한 번 내는 것 */}
              <div className="rounded-2xl border border-[#e7e9ee] bg-white p-7">
                <span className="inline-block text-[12.5px] font-extrabold tracking-[0.06em] text-[#61697a]">처음 한 번 내는 것</span>
                <ul className="mt-4 space-y-4">
                  {[
                    { t: '초기 구축', v: '$600 · $900', d: '사람이 직접 디자인하고 구성하는 작업. 범위에 따라 두 구간.' },
                    { t: '기존 사이트 이관', v: '$1,400 부터', d: '지난 설교·주보·게시물·사진을 옮겨 담습니다. 분량에 따라 상담에서 확정합니다.' },
                  ].map((row) => (
                    <li key={row.t} className="border-t border-[#eceef2] pt-4 first:border-t-0 first:pt-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[16px] font-bold text-[#16181d]">{row.t}</span>
                        <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[#16181d]">{row.v}</span>
                      </div>
                      <p className="mt-1 text-[14px] text-[#4b5464]" style={{ lineHeight: 1.7 }}>{row.d}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 항목 표 */}
        <section className="bg-[#fbfaf8]">
          <div className={`${CONTAINER} py-14 sm:py-20`}>
            <h2 className="text-[26px] text-[#16181d] sm:text-[34px]" style={{ fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.35 }}>
              항목별 조건
            </h2>
            <div className="mt-8 divide-y divide-[#e7e9ee] overflow-hidden rounded-xl border border-[#e7e9ee] bg-white">
              {TERMS.map((row) => (
                <div key={row.label} className="grid gap-1 px-6 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
                  <dt className="text-[15px] font-bold text-[#16181d]">{row.label}</dt>
                  <dd className="text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>{row.desc}</dd>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 하단 2카드 */}
        <section className="bg-white">
          <div className={`${CONTAINER} py-14 sm:py-20`}>
            <div className="grid gap-5 md:grid-cols-2">
              {/* 구독료에 포함됩니다 (연블루) */}
              <div className="rounded-xl border border-[#c9dcff] bg-[#f4f8ff] p-7">
                <h2 className="text-[18px] font-bold text-[#16181d]">구독료에 포함됩니다</h2>
                <ul className="mt-4 space-y-2.5 text-[15px] text-[#233043]">
                  {[
                    '호스팅 환경 관리',
                    '보안 인증 · 자동 백업',
                    '기술 오류 대응',
                    '전용 주소 연결 유지',
                    '성도가 보는 지면 12가지 전부',
                  ].map((line) => (
                    <li key={line} className="flex gap-2" style={{ lineHeight: 1.7 }}>
                      <span aria-hidden className="mt-[2px] text-[#1466d6]">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 별도로 안내드립니다 */}
              <div className="rounded-xl border border-[#e7e9ee] bg-white p-7">
                <h2 className="text-[18px] font-bold text-[#16181d]">별도로 안내드립니다</h2>
                <ul className="mt-4 space-y-2.5 text-[15px] text-[#4b5464]">
                  {[
                    '맞춤 디자인',
                    '새 페이지 대량 추가',
                    '대량 콘텐츠 이관',
                    '로고 · 사진 촬영 · 원고 작성',
                    '독립형 제작',
                  ].map((line) => (
                    <li key={line} className="flex gap-2" style={{ lineHeight: 1.7 }}>
                      <span aria-hidden className="mt-[2px] text-[#61697a]">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-[#e7e4de] bg-[#fbfaf8] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="text-[16px] text-[#233043]" style={{ lineHeight: 1.75 }}>
                어느 구간이 맞을지, 어떤 조합이 필요할지는 상담에서 교회 사정을 보고 함께 정합니다.
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
