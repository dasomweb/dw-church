import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import KakaoInquiryButton from '../components/KakaoInquiryButton';
import FaviconSetter from '../components/FaviconSetter';

// ─────────────────────────────────────────────────────────────────────────────
// truelight.app 마케팅 랜딩 — 시안 v2 (국문 단일, 아홉 섹션).
// 이 페이지는 서버 컴포넌트다: 상담 폼은 native GET form(action="/apply")으로,
// "실제로 무엇이 들어가나요" 아코디언은 native <details>로 처리하므로 클라이언트
// 상태가 필요 없다. 헤더/푸터/카카오/파비콘은 클라이언트 컴포넌트로 그대로 임베드된다.
// 색·타입은 시안 "디자인 시스템"을 그대로 적용(브랜드 블루 단일 액센트, 경고색 없음).
// ─────────────────────────────────────────────────────────────────────────────

const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

// ── 소형 프리미티브 ──────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[12.5px] font-extrabold tracking-[0.06em] text-[#1466d6]">
      {children}
    </span>
  );
}

function SectionTitle({ children, dark = false, className = '' }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <h2
      className={`text-[26px] sm:text-[34px] ${dark ? 'text-white' : 'text-[#16181d]'} ${className}`}
      style={{ fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.35 }}
    >
      {children}
    </h2>
  );
}

function Lead({ children, dark = false, className = '' }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <p className={`text-[16px] sm:text-[17.5px] ${dark ? 'text-[#c7d0dd]' : 'text-[#4b5464]'} ${className}`} style={{ lineHeight: 1.85 }}>
      {children}
    </p>
  );
}

// 이미지 슬롯 — 실제 사진/캡처가 들어갈 자리. 회색 라운드 패널 + 국문 라벨.
// 외부 이미지 핫링크 금지(디자인 시스템). 나중에 R2 자체호스팅 자산으로 교체.
function ImgSlot({ label, ratio = '16 / 9', tone = 'light', className = '', src }: { label: string; ratio?: string; tone?: 'light' | 'dark'; className?: string; src?: string }) {
  const bg = tone === 'dark' ? '#16233a' : '#eef1f4';
  const fg = tone === 'dark' ? '#93a3bd' : '#8b93a3';
  // 실제 R2 자체호스팅 이미지가 있으면 채우고, 없으면 라벨 플레이스홀더.
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label.replace(/^\[IMG\]\s*/, '')}
        loading="lazy"
        className={`w-full overflow-hidden rounded-xl object-cover ${className}`}
        style={{ aspectRatio: ratio, background: bg }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-xl ${className}`}
      style={{ aspectRatio: ratio, background: bg }}
      role="img"
      aria-label={label}
    >
      <span className="px-6 text-center text-[13px] font-medium leading-relaxed" style={{ color: fg, letterSpacing: '-0.01em' }}>
        {label}
      </span>
    </div>
  );
}

// R2 자체호스팅 실제 이미지 (핫링크 금지 준수)
const R2 = 'https://pub-674328f08783498389f7857dc6e1ab00.r2.dev';
// 히어로 — 대표님 지정 이미지(예배·손 든 성도·십자가). PNG 1.5MB → 1600px JPEG 83KB로
// 리사이즈·재압축 후 R2 자체호스팅(핫링크 금지 준수).
const IMG_HERO = `${R2}/_samples/frontpage/hero-worship.jpg`;
const IMG_CASE_LAGRANGE = `${R2}/shared/gallery/2031c682-e6c5-4d9b-ba41-f09b352bc57d.jpg`;
const IMG_CASE_WAKE = `${R2}/shared/gallery/d7586ffd-b75d-4b6f-b80c-710d95574711.jpg`;
// section 4 관리자 캡처 — 대표님이 직접 캡처한 실제 관리자 화면. 리사이즈(1440px JPEG) 후
// R2 자체호스팅. 아직 못 받은 슬롯은 undefined → 라벨 플레이스홀더로 표시.
const IMG_ADMIN_MEMBERS = `${R2}/_samples/marketing/admin-members.jpg`;   // 교인 명부 · 세대/가족
const IMG_ADMIN_SERMON = `${R2}/_samples/marketing/admin-sermon.jpg`;     // 설교 등록
const IMG_ADMIN_NEWCOMER: string | undefined = undefined;                // 대기 — 새가족 접수 · 목장 조직
const IMG_ADMIN_I18N: string | undefined = undefined;                     // 대기 — 한/영 지면 비교

// ── 페이지 ───────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* ══ 1 · 히어로 (흰 바탕) ══ */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-12 sm:py-20`}>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <Label>미주 한인 이민교회를 위한 교회 시스템</Label>
              <h1
                className="mt-4 text-[32px] text-[#16181d] sm:text-[48px]"
                style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.2 }}
              >
                교회의 한 주가<br className="hidden sm:block" /> 여기서 돌아갑니다.
              </h1>
              <p className="mt-5 max-w-xl text-[16px] text-[#4b5464] sm:text-[17.5px]" style={{ lineHeight: 1.85 }}>
                성도가 보는 홈페이지부터 교인 명부와 목장, 새가족까지 한 자리에서 이어집니다. 만드는 일과 기술은 저희가 맡습니다.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/apply"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#2b7fff] px-7 text-[16px] font-semibold text-white transition-colors hover:bg-[#1466d6]"
                >
                  상담 신청
                </a>
                <a
                  href="https://dasom.truelight.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#d5dae2] bg-white px-7 text-[16px] font-semibold text-[#16181d] transition-colors hover:bg-[#f5f6f8]"
                >
                  실제 사이트 보기
                </a>
              </div>
            </div>
            <ImgSlot label="히어로 — 주일 예배 · 손 든 성도" ratio="16 / 9" src={IMG_HERO} />
          </div>
        </div>
        {/* 신뢰 스트립 */}
        <div className="border-t border-[#eceef2] bg-white">
          <div className={`${CONTAINER} py-5`}>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-[14px] text-[#61697a]">
              {['한인 이민교회만 맡아 왔습니다', '디자인·구축은 사람이 직접', '함께한 교회 2곳', '오픈까지 평균 ○주'].map((item, i) => (
                <li key={item} className="flex items-center gap-6">
                  {i > 0 && <span aria-hidden className="text-[#c9cfda]">·</span>}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ 2 · 공감 (웜 바탕) ══ */}
      <section className="bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <Label>이런 고민, 익숙하시죠</Label>
          <SectionTitle className="mt-3 max-w-2xl">교회 일이 여러 곳에 흩어져 있습니다.</SectionTitle>
          <Lead className="mt-5 max-w-2xl">
            목회와 행정만으로도 한 주가 벅찹니다. 그 사이에 사이트는 몇 해 전에 멈춰 있고, 처음 오시는 분은 예배 시간을 찾다가 창을 닫습니다.
          </Lead>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              '교적은 엑셀 파일 여러 개로 흩어져 있고, 최신본이 어디 있는지 모릅니다.',
              '목장 편성과 보고가 메신저로 오가고, 지난 학기 자료를 다시 찾기 어렵습니다.',
              '새가족 카드가 종이로 쌓이고, 정착하셨는지 따라가지 못합니다.',
              '수련회·차량 신청을 매번 새로 받고, 명단은 손으로 정리합니다.',
            ].map((line) => (
              <div key={line} className="rounded-xl border border-[#e7e4de] bg-white p-6 text-[16px] text-[#4b5464]" style={{ lineHeight: 1.7 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3 · 도구와의 차이 (흰 바탕) ══ */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <SectionTitle className="max-w-2xl">만드는 일은 시작일 뿐입니다.</SectionTitle>
          <Lead className="mt-5 max-w-2xl">
            요즘은 홈페이지를 만들 방법이 많습니다. 교회 안에 손이 빠른 분이 계시다면 그렇게 시작하셔도 좋습니다. 저희가 교회 사이트를 맡아 오면서 본 문제는, 만드는 데 있지 않았습니다.
          </Lead>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              { t: '멈추는 이유는 도구가 아니라 사람입니다', d: '멈춘 교회 사이트들은 만들 방법이 없어서 멈춘 것이 아닙니다. 맡아 주셨던 분이 떠나면서 멈췄습니다. 담당자가 바뀌어도 사이트는 그대로 갑니다.' },
              { t: '매주 돌아오는 일이 진짜 일입니다', d: '주보 한 장, 설교 한 편, 행사 사진 스무 장. 한 번 만들고 끝나는 일이 아닙니다. 교회의 한 주에 맞춰 만든 화면에서는 이 일이 몇 분으로 끝납니다.' },
              { t: '교회의 언어를 아는 구조입니다', d: '주보, 목장, 새가족, 교육부, 한국학교 — 일반 도구에는 이런 자리가 없어 매번 억지로 맞춰 넣게 됩니다. 저희는 그 자리가 처음부터 있습니다.' },
              { t: '기술은 교회의 숙제가 아닙니다', d: '서버와 보안 인증, 백업은 저희가 맡습니다. 교회 안에서 이 일을 누가 맡을지 정해 두지 않아도 됩니다.' },
            ].map((it) => (
              <div key={it.t} className="rounded-xl border border-[#e7e9ee] bg-white p-6">
                <h3 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1.4 }}>{it.t}</h3>
                <p className="mt-3 text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>{it.d}</p>
              </div>
            ))}
          </div>
          {/* 강조 카드 — 섹션당 하나 (2px 보더 + 연한 블루 바탕) */}
          <div className="mt-6 rounded-xl border-2 border-[#1466d6] bg-[#eef4ff] p-6 sm:p-7">
            <p className="text-[16px] text-[#233043] sm:text-[17px]" style={{ lineHeight: 1.85 }}>
              직접 만드실 수 있는 교회라면, 그것도 좋은 길입니다. 다만 삼 년 뒤에도 같은 분이 맡고 계실지, 그것만 한 번 생각해 보시면 좋겠습니다.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 4 · 증거 (웜 바탕) — 관리자 캡처 ══ */}
      <section id="admin" className="scroll-mt-24 bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <SectionTitle className="max-w-2xl">일반 도구로는 여기까지 오지 못합니다.</SectionTitle>
          <Lead className="mt-5 max-w-2xl">
            교회 홈페이지에서 실제로 손이 많이 가는 곳은 정해져 있습니다. 저희는 그 지점들을 위해 따로 만들었습니다.
          </Lead>

          <div className="mt-12 flex flex-col gap-14">
            {[
              {
                eyebrow: '홈페이지 너머',
                title: '교회 행정이 같은 자리에 있습니다',
                body: '교적관리가 시스템 안에 있습니다. 세대·가족 관계, 직분과 출석, 심방과 성례, 전입·전출까지. 목장과 구역은 그 교적 위에서 조직되고, 새가족은 온라인으로 등록되는 순간 교인으로 이어집니다. 명단을 따로 옮겨 적을 일이 없습니다.',
                muted: '도구로 만든 홈페이지는 명부와 완전히 따로 있습니다. 그래서 교적은 엑셀로, 목장은 메신저로, 새가족은 종이로 남습니다.',
                img: '[IMG] 관리자 — 교인 명부 · 세대/가족 화면',
                src: IMG_ADMIN_MEMBERS,
              },
              {
                eyebrow: '매주 반복되는 일',
                title: '설교 한 편 올리는 데 주소 하나',
                body: '영상 주소를 붙이면 제목과 썸네일, 날짜가 따라 들어옵니다. 설교자와 본문으로 정리되고, 성도는 설교자 이름으로 지난 설교를 찾습니다. 주보는 파일 하나로 날짜별로 쌓입니다.',
                muted: '일반 도구에서는 매주 페이지를 새로 만들고, 썸네일을 따로 올리고, 목록에 손으로 링크를 걸어야 합니다. 그 차이가 오십두 번 쌓입니다.',
                img: '[IMG] 관리자 — 설교 등록 화면',
                src: IMG_ADMIN_SERMON,
              },
              {
                eyebrow: '처음 오시는 분부터',
                title: '새가족이 종이로 남지 않습니다',
                body: '처음 오신 분이 홈페이지에서 직접 남기고 가시면, 담당 교역자에게 바로 전달되고 정착 과정을 이어서 볼 수 있습니다. 목장에 배정되는 순간까지 한 자리에서 이어집니다.',
                muted: '수련회 참가, 차량 신청, 봉사 지원 같은 교회 양식도 직접 만들어 접수하고, 관리자 화면에서 처리합니다.',
                img: '[IMG] 관리자 — 새가족 접수 · 목장 조직 화면',
                src: IMG_ADMIN_NEWCOMER,
              },
              {
                eyebrow: '이민교회의 자리',
                title: '2세와 영어권 성도에게도',
                body: '한국어로 올린 내용이 영어로도 보이고, 교회 고유의 표현은 직접 고쳐 두실 수 있습니다. 영어 페이지를 따로 만들고 따로 관리하는 일이 사라집니다.',
                muted: '쓰고 계신 사이트가 있으면 설교·주보·앨범만 그 사이트에 얹어 단계적으로 넘어오실 수도 있습니다.',
                img: '[IMG] 한/영 지면 비교 화면',
                src: IMG_ADMIN_I18N,
              },
            ].map((scene, i) => (
              <div key={scene.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                {/* 짝수 행: 캡처 왼쪽 / 홀수 행: 캡처 오른쪽 */}
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <ImgSlot label={scene.img} ratio="16 / 10" src={scene.src} className="border border-[#e7e9ee] shadow-sm" />
                </div>
                <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                  <Label>{scene.eyebrow}</Label>
                  <h3 className="mt-3 text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em', lineHeight: 1.4 }}>{scene.title}</h3>
                  <p className="mt-4 text-[16px] text-[#4b5464]" style={{ lineHeight: 1.85 }}>{scene.body}</p>
                  <p className="mt-4 border-t border-[#e7e4de] pt-4 text-[15px] text-[#61697a]" style={{ lineHeight: 1.8 }}>{scene.muted}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 5 · 약속 done-for-you (딥 밴드 #0f1b2d) ══ */}
      <section id="approach" className="scroll-mt-24 bg-[#0f1b2d]">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <SectionTitle dark className="max-w-2xl">저희가 만들어 드립니다.</SectionTitle>
          <Lead dark className="mt-5 max-w-2xl">
            상담에서 오픈까지 네 단계. 교회가 하실 일은 확인과 소식 등록뿐입니다.
          </Lead>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: '상담', d: '교회 이야기를 듣고 어떤 구성이 맞을지 정리해 드립니다.' },
              { n: '02', t: '디자인·구축', d: '교회에 맞게 디자인하고 페이지를 구성합니다. 기존 사이트 내용도 옮겨 드립니다.' },
              { n: '03', t: '확인', d: '완성된 화면을 보고 고칠 곳만 알려 주시면 됩니다.' },
              { n: '04', t: '오픈', d: '도메인을 연결하고 공개합니다. 이후 호스팅 환경과 보안·백업은 저희가 맡습니다.' },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
                <span className="text-[13px] font-extrabold tracking-[0.06em] text-[#4d93ff]">{s.n}</span>
                <h3 className="mt-2 text-[19px] text-white" style={{ fontWeight: 750, letterSpacing: '-0.02em' }}>{s.t}</h3>
                <p className="mt-3 text-[15px] text-[#aeb9c9]" style={{ lineHeight: 1.75 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <h4 className="text-[15px] font-bold text-white">저희가 맡는 일</h4>
              <p className="mt-2 text-[15px] text-[#aeb9c9]" style={{ lineHeight: 1.75 }}>디자인·구축·셋업, 도메인 연결, 호스팅 환경과 보안 인증·백업</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <h4 className="text-[15px] font-bold text-white">교회가 맡는 일</h4>
              <p className="mt-2 text-[15px] text-[#aeb9c9]" style={{ lineHeight: 1.75 }}>주중 소식 등록과 교적관리·목장 운영. 관리자 화면에서 하시고, 사용법은 도움센터에 있습니다</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 6 · 신뢰 함께한 교회들 (흰 바탕) ══ */}
      <section id="churches" className="scroll-mt-24 bg-white">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <SectionTitle>함께한 교회들</SectionTitle>
          <Lead className="mt-5 max-w-2xl">
            일반 홈페이지 빌더가 아니라, 한인 이민교회만 맡아 온 전문 서비스입니다.
          </Lead>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              { img: '[IMG] 라그란지 한인침례교회 화면', name: '라그란지 한인침례교회', desc: '예배 안내와 설교를 중심으로 구성. 조지아 라그란지.', src: IMG_CASE_LAGRANGE },
              { img: '[IMG] 웨이크처치 화면', name: '웨이크처치', desc: '쓰던 도메인을 그대로 연결해 오픈. 조지아 뷰포드.', src: IMG_CASE_WAKE },
            ].map((c) => (
              <div key={c.name} className="overflow-hidden rounded-xl border border-[#e7e9ee] bg-white">
                <ImgSlot label={c.img} ratio="16 / 10" className="rounded-none" src={c.src} />
                <div className="p-6">
                  <h3 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em' }}>{c.name}</h3>
                  <p className="mt-2 text-[15px] text-[#4b5464]" style={{ lineHeight: 1.75 }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* 사례 추가 자리 (내부 플레이스홀더) */}
          <div className="mt-4 rounded-xl border border-dashed border-[#cfd4dd] bg-[#fbfaf8] p-5 text-center text-[14px] text-[#61697a]">
            사례 추가 자리 — 최소 6건까지, 규모 · 요청 · 결과 3줄 포함
          </div>
          {/* 추천사 */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              { q: '추천사 자리 — 교적관리와 목장을 이 안에서 하게 되면서 무엇이 달라졌는지, 담임 또는 행정간사의 2~3문장.', who: '○○○ 목사 · ○○한인교회' },
              { q: '추천사 자리 — 오픈 후 만족한 교회에 문안 초안을 드리고 확인만 받는 방식이 가장 빠릅니다.', who: '○○○ 간사 · ○○교회' },
            ].map((tm) => (
              <figure key={tm.who} className="rounded-xl border border-[#e7e9ee] bg-white p-6">
                <blockquote className="text-[16px] text-[#4b5464]" style={{ lineHeight: 1.85 }}>“{tm.q}”</blockquote>
                <figcaption className="mt-4 text-[14px] font-semibold text-[#16181d]">{tm.who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 7 · 적합성 (웜 바탕) ══ */}
      <section className="bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <Label>우리 교회에 맞을까요?</Label>
          <SectionTitle className="mt-3">작게 시작해도, 커져도 함께 갑니다.</SectionTitle>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              { t: '개척·소형 교회', d: '담당자가 따로 없어도 괜찮습니다. 홈페이지부터 시작하고, 교적관리와 목장은 필요해질 때 켜시면 됩니다.' },
              { t: '중형 교회', d: '새가족과 목장이 이미 돌아가는 교회. 흩어진 명단을 한 자리로 모으는 것이 가장 큰 변화입니다.' },
              { t: '중대형 교회', d: '부서와 사역이 많고 담당자도 여러 분. 구조를 함께 설계하고 필요하면 맞춤으로 만들어 드립니다.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-[#e7e4de] bg-white p-6">
                <h3 className="text-[19px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.02em' }}>{c.t}</h3>
                <p className="mt-3 text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>{c.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[15px] text-[#61697a]" style={{ lineHeight: 1.8 }}>
            저희 서비스는 정통 기독교 신앙을 고백하는 교회를 대상으로 제공합니다. 무교단·독립교회도 신청하실 수 있습니다.{' '}
            <a href="#" className="font-semibold text-[#1466d6] hover:underline">자세한 기준 보기</a>
          </p>
        </div>
      </section>

      {/* ══ 8 · 요금 (흰 바탕) ══ */}
      <section id="pricing" className="scroll-mt-24 bg-white">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <SectionTitle>요금</SectionTitle>
          <Lead className="mt-5 max-w-2xl">
            홈페이지 구독은 교회 규모와 무관하게 한 가지 값입니다. 처음 구축하는 범위, 교회 행정 시스템, 사용량 세 가지가 교회마다 달라지는 부분입니다.
          </Lead>
          <p className="mt-3 text-[14px] text-[#61697a]">상기 요금은 사전 안내용 예시입니다.</p>

          {/* A. 매달 — 홈페이지 구독 (강조 카드: 섹션당 하나) */}
          <div className="mt-10 rounded-2xl border-2 border-[#1466d6] bg-[#eef4ff] p-7 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <Label>매달</Label>
                <h3 className="mt-2 text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em' }}>홈페이지 구독</h3>
                <p className="mt-2 text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>모든 교회 같은 값. 성도가 보는 지면은 전부 포함됩니다.</p>
              </div>
              <div className="shrink-0">
                <span className="text-[44px] font-extrabold tracking-[-0.03em] text-[#16181d]">$99</span>
                <span className="ml-1 text-[17px] text-[#61697a]">/월</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['설교', '주보', '목회칼럼', '오늘의 말씀', '앨범', '영상', '예배 및 모임', '행사', '배너', '교역자', '연혁', '게시판'].map((p) => (
                <span key={p} className="rounded-full border border-[#c9dcff] bg-white px-3 py-1.5 text-[13.5px] font-medium text-[#233043]">{p}</span>
              ))}
            </div>
            <p className="mt-5 text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
              교회 전용 주소와 보안 인증, 백업, 한/영 지면까지. <span className="font-semibold text-[#16181d]">등급을 나눠 기능을 잠가 두지 않습니다.</span>
            </p>
          </div>

          {/* B. 처음 한 번 — 초기 구축 */}
          <div className="mt-10">
            <Label>처음 한 번</Label>
            <h3 className="mt-2 text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em' }}>초기 구축</h3>
            <p className="mt-2 max-w-2xl text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>사람이 직접 디자인하고 구성하는 작업입니다. 범위에 따라 세 구간.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {[
                { t: '새로 시작하는 교회', price: '$600', d: '예배 안내와 오시는 길, 설교·주보, 교역자 소개 등 성도가 찾는 지면을 구성하고 교회가 주신 자료를 입력합니다.' },
                { t: '부서·사역 지면까지', price: '$900', d: '교육부·한국학교·목장·새가족처럼 나뉜 사역마다 안내 지면을 따로 구성합니다.' },
                { t: '기존 사이트 이관까지', price: '$1,400 부터', d: '지금 쓰시는 사이트의 지난 설교·주보·게시물·사진을 옮겨 담습니다. 분량과 정리 상태에 따라 작업량이 늘어날 수 있어, 사이트를 먼저 보고 최종 금액을 알려 드립니다.' },
              ].map((c) => (
                <div key={c.t} className="flex flex-col rounded-xl border border-[#e7e9ee] bg-white p-6">
                  <h4 className="text-[16px] font-bold text-[#16181d]">{c.t}</h4>
                  <p className="mt-1 text-[22px] font-extrabold tracking-[-0.02em] text-[#1466d6]">{c.price}</p>
                  <p className="mt-3 text-[14.5px] text-[#4b5464]" style={{ lineHeight: 1.75 }}>{c.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[14.5px] text-[#61697a]" style={{ lineHeight: 1.8 }}>어느 구간인지는 상담에서 교회 사정을 보고 함께 정합니다. 이후에는 구독료만 부담하십니다.</p>
          </div>

          {/* C. 필요해질 때 — 교회 행정 (이름만, 개별 단가는 노출하지 않음) */}
          <div className="mt-10 rounded-2xl border border-[#e7e9ee] bg-[#fbfaf8] p-7 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <Label>필요해질 때</Label>
                <h3 className="mt-2 text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em' }}>교회 행정</h3>
                <p className="mt-2 text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>교적관리와 목장, 새가족, 교회 양식은 홈페이지와 별도로 두었습니다. 쓰시는 것만 매달 더해지고, 어떤 조합이 맞는지는 상담에서 함께 정합니다.</p>
              </div>
              <div className="shrink-0 rounded-xl border border-[#d9e4f5] bg-white px-5 py-4 text-center">
                <p className="text-[13px] text-[#61697a]">네 가지를 함께 쓰실 때</p>
                <p className="mt-0.5"><span className="text-[32px] font-extrabold tracking-[-0.02em] text-[#16181d]">$69</span><span className="ml-1 text-[15px] text-[#61697a]">/월</span></p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { t: '교적관리', d: '명부·세대·가족, 직분, 출석, 심방' },
                { t: '목장·구역', d: '조직과 보고, 자료실' },
                { t: '새가족', d: '안내와 등록, 정착 관리' },
                { t: '교회 양식', d: '수련회·차량·봉사 접수' },
              ].map((it) => (
                <div key={it.t} className="rounded-lg border border-[#e7e9ee] bg-white px-4 py-3 text-[15px]">
                  <span className="font-bold text-[#16181d]">{it.t}</span>
                  <span className="text-[#61697a]"> — {it.d}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[14.5px] text-[#61697a]" style={{ lineHeight: 1.8 }}>홈페이지 구독료에 합산되어 청구됩니다. 하나씩 쓰실 때의 요금은 상담에서 안내드립니다.</p>
          </div>

          {/* D. 사용량 */}
          <div className="mt-10">
            <Label>사용량</Label>
            <h3 className="mt-2 text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em' }}>저장공간과 트래픽</h3>
            <p className="mt-2 max-w-2xl text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
              구독료에는 교회가 일반적으로 쓰시는 만큼의 저장공간과 트래픽이 포함되어 있습니다. 설교 영상을 직접 올리시거나 사진·영상이 크게 늘어나 포함 범위를 넘어서면, 초과분에 대한 사용료가 별도로 발생합니다.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                '포함 저장공간 ○○GB · 초과 시 GB당 $○',
                '포함 트래픽 월 ○○GB · 초과 시 GB당 $○',
                '넘어서기 전에 포함 범위의 ○%에 이르면 미리 알려 드립니다',
              ].map((line) => (
                <li key={line} className="rounded-lg border border-[#e7e9ee] bg-white px-4 py-3 text-[14.5px] text-[#4b5464]" style={{ lineHeight: 1.7 }}>{line}</li>
              ))}
            </ul>
            <p className="mt-4 text-[14.5px] text-[#61697a]" style={{ lineHeight: 1.8 }}>설교 영상은 유튜브를 연결해 쓰시면 저장공간과 트래픽을 거의 쓰지 않습니다. 대부분의 교회는 포함 범위 안에서 운영하십니다.</p>
          </div>

          {/* E + F. 초기 구축 포함 항목 / 결제와 해지 */}
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-[#e7e9ee] bg-white p-6">
              <h3 className="text-[18px] font-bold text-[#16181d]">초기 구축에 포함되는 것</h3>
              <ul className="mt-4 space-y-2.5 text-[15px] text-[#4b5464]">
                {['교회에 맞는 디자인 제작 · 페이지·메뉴 구성', '기존 사이트 내용 이관 · 기본 정보 입력', '도메인 연결 · 오픈 전 점검'].map((line) => (
                  <li key={line} className="flex gap-2"><span aria-hidden className="text-[#1466d6]">·</span><span>{line}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#e7e9ee] bg-white p-6">
              <h3 className="text-[18px] font-bold text-[#16181d]">결제와 해지</h3>
              <p className="mt-4 text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
                정기 요금은 선불로 청구되며, 해지는 관리자 화면에서 신청하시면 당해 청구 주기 종료일에 효력이 발생합니다. 내려받기는 해지 전에 해 두셔야 합니다.
              </p>
              <a href="/terms" className="mt-4 inline-block text-[15px] font-semibold text-[#1466d6] hover:underline">결제 조건 전체 보기 →</a>
            </div>
          </div>

          {/* G. 함께 세우는 교회 */}
          <div className="mt-10 rounded-2xl border border-[#e7e9ee] bg-[#fbfaf8] p-7 sm:p-9">
            <h3 className="text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em' }}>함께 세우는 교회</h3>
            <p className="mt-2 text-[16px] font-medium text-[#233043]">개척·미자립교회를 돕고, 두 교회가 함께 감면받습니다.</p>
            <p className="mt-4 max-w-3xl text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.85 }}>
              개척교회나 아직 자립하지 못한 교회는 첫 1년 동안 월 $39로 시작하시고, 그 교회를 함께 세워 주시는 교회는 구독료를 감면받습니다. 홈페이지가 없어서 찾아오시려는 분을 만나지 못하는 일은 없어야 한다고 생각합니다.
            </p>
            <p className="mt-3 max-w-3xl text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>상담에서 교회 사정과 함께 세우실 교회를 말씀해 주시면 됩니다. 복잡한 서류는 받지 않습니다.</p>
            <p className="mt-3 max-w-3xl text-[14.5px] text-[#61697a]" style={{ lineHeight: 1.8 }}>
              지원 신청은 소속 교단·교협 확인과 담임목사 안수 교단 확인, 그리고 함께 세우시는 교회의 추천으로 확인합니다. 저희 서비스는 정통 기독교 신앙을 고백하는 교회를 대상으로 제공합니다.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {[
                { t: '돕는 교회', price: '구독료 월 $20 감면', d: '한 교회를 함께 세우실 때마다, 지원하는 1년 동안. 최대 세 교회까지' },
                { t: '개척·미자립교회', price: '첫 1년 월 $39 · 초기 구축 $200', d: '개척 ○년 이내 또는 자립 이전 교회. 돕는 교회 없이 신청하셔도 같은 조건입니다' },
                { t: '교회 행정은 나중에', price: '', d: '홈페이지만으로 시작하시고, 교적관리는 성도가 늘어난 뒤에 켜시면 됩니다' },
              ].map((c) => (
                <div key={c.t} className="rounded-xl border border-[#e7e9ee] bg-white p-5">
                  <h4 className="text-[16px] font-bold text-[#16181d]">{c.t}</h4>
                  {c.price && <p className="mt-1 text-[15px] font-bold text-[#1466d6]">{c.price}</p>}
                  <p className="mt-2 text-[14px] text-[#4b5464]" style={{ lineHeight: 1.7 }}>{c.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[14px] text-[#61697a]">감면 폭과 대상 기준은 확정 후 채워 넣습니다.</p>
          </div>

          {/* H. 실제로 무엇이 들어가나요 (아코디언) */}
          <div className="mt-10">
            <h3 className="text-[23px] text-[#16181d]" style={{ fontWeight: 750, letterSpacing: '-0.025em' }}>실제로 무엇이 들어가나요</h3>
            <p className="mt-2 max-w-2xl text-[15.5px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
              교회마다 필요한 구성이 다릅니다. 아래는 저희가 만들어 드리는 지면이며, 교회 사정에 맞춰 구성해 드립니다.
            </p>
            <div className="mt-6 divide-y divide-[#e7e9ee] overflow-hidden rounded-xl border border-[#e7e9ee] bg-white">
              {[
                {
                  t: '예배와 말씀', sub: '성도가 가장 자주 찾는 것', open: true,
                  lines: [
                    '설교 — 제목·본문·설교자·날짜와 영상. 성도는 설교자로 지난 설교를 찾습니다.',
                    '주보 · 오늘의 말씀 — 주간 주보가 날짜별로 쌓이고, 대표 말씀 구절이 홈에 놓입니다.',
                    '목회칼럼 · 영상 — 목회자의 글과 찬양·교육 영상을 이어서 볼 수 있게.',
                  ],
                },
                { t: '교회 안내', sub: '', open: false, lines: ['예배 및 모임 시간표, 오시는 길, 교역자 소개, 연혁, 행사 안내'] },
                { t: '소식과 나눔', sub: '', open: false, lines: ['공지·선교·교회소식 게시판, 사진 앨범, 메인 배너'] },
                { t: '교회 행정', sub: '', open: false, lines: ['교적관리, 목장·구역, 새가족, 교회 양식 — 홈페이지와 별도로 신청'] },
              ].map((row) => (
                <details key={row.t} open={row.open} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[17px] font-bold text-[#16181d]">{row.t}</span>
                      {row.sub && <span className="text-[13.5px] text-[#61697a]">{row.sub}</span>}
                    </span>
                    <span aria-hidden className="text-[20px] leading-none text-[#1466d6] transition-transform group-[[open]]:rotate-45">+</span>
                  </summary>
                  <div className="mt-3 space-y-2 text-[15px] text-[#4b5464]" style={{ lineHeight: 1.8 }}>
                    {row.lines.map((l) => <p key={l}>{l}</p>)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 9 · 전환 + 폼 (웜 바탕) ══ */}
      <section id="contact" className="scroll-mt-24 bg-[#fbfaf8]">
        <div className={`${CONTAINER} py-16 sm:py-24`}>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <SectionTitle className="max-w-md">우리 교회 이야기부터 들려주세요.</SectionTitle>
              <Lead className="mt-5 max-w-md">
                지금 사이트가 없어도, 무엇이 필요한지 아직 정하지 못했어도 괜찮습니다. 교회 사정을 듣고 어떤 구성이 맞을지 먼저 정리해 드립니다.
              </Lead>
              <p className="mt-5 text-[14.5px] text-[#61697a]" style={{ lineHeight: 1.8 }}>연락 방법과 상담 가능 시간 — ○○○ 확정 값을 받아 채웁니다</p>
              <div className="mt-6">
                {/* 카카오톡 문의 — 우하단 플로팅 버튼(KakaoInquiryButton)이 페이지 전역에 상시 노출됩니다. */}
                <span className="text-[14px] text-[#61697a]">전화·이메일이 편하지 않으시면 카카오톡 문의도 가능합니다.</span>
              </div>
            </div>

            {/* 상담 폼 — native GET form. 제출 시 /apply 로 이동(값은 쿼리로 전달되어 프리필 가능). */}
            <form action="/apply" method="get" className="rounded-2xl border border-[#e7e4de] bg-white p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-[#16181d]">교회명</span>
                  <input name="church" type="text" autoComplete="organization"
                    className="w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-[#16181d]">담당자 · 직함</span>
                  <input name="contact" type="text" autoComplete="name"
                    className="w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-[#16181d]">이메일</span>
                  <input name="email" type="email" autoComplete="email"
                    className="w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-[#16181d]">전화</span>
                  <input name="phone" type="tel" autoComplete="tel"
                    className="w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-[#16181d]">교인 규모</span>
                  <input name="size" type="text" placeholder="예: 장년 120명"
                    className="w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none placeholder:text-[#a3aab8] focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[13.5px] font-semibold text-[#16181d]">지금 가장 불편한 것</span>
                  <textarea name="need" rows={4}
                    className="w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]" />
                </label>
              </div>
              <button
                type="submit"
                className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#2b7fff] px-6 text-[16px] font-semibold text-white transition-colors hover:bg-[#1466d6]"
              >
                상담 신청
              </button>
            </form>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {/* 모바일 하단 고정 CTA 바 — 상담 신청 + 카카오톡 문의 반반(50/50). 데스크톱 숨김.
          카카오 풍선 FAB 는 데스크톱 전용이므로 모바일에서 겹치지 않는다. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[#eceef2] bg-white/95 px-3 py-3 backdrop-blur-sm lg:hidden">
        <a
          href="/apply"
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#2b7fff] px-4 text-[16px] font-semibold text-white hover:bg-[#1466d6]"
        >
          상담 신청
        </a>
        <KakaoInquiryButton className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 text-[16px] font-bold text-[#191600] hover:brightness-95" />
      </div>
      {/* 하단 고정 바가 콘텐츠를 가리지 않도록 모바일 여백 확보(딥 푸터 색을 이어 흰 띠 방지) */}
      <div className="h-20 bg-[#0f1b2d] lg:hidden" aria-hidden />

      <KakaoInquiryButton />
      <FaviconSetter />
    </div>
  );
}
