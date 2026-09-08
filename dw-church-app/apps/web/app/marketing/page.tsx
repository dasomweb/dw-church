import QRCode from 'qrcode';
import type { Metadata } from 'next';

// truelight.app/marketing — 데스크 iPad 부스용 공개 페이지(로그인 불필요).
// 두 섹션: (1) 둘러보기 — 서비스 홈 + 데모 사이트, (2) 역할별 관리자 체험 —
// 관리자(전체)·목자·새가족 담당자 (각 QR 스캔 시 해당 역할로 자동 로그인).
// QR은 서버에서 SVG로 생성해 자체 호스팅(외부 의존 없음). 정적 페이지.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'True Light 데모 부스',
  description: '카메라로 QR을 스캔해 서비스와 데모 사이트, 역할별 관리자 화면을 체험하세요.',
  robots: { index: false, follow: false },
};

const QR_OPTS = { type: 'svg' as const, margin: 1, color: { dark: '#0a1330', light: '#ffffff' } };
const auto = (email: string, pw: string) =>
  `https://dasom.truelight.app/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(pw)}&auto=1`;

export default async function MarketingBoothPage() {
  const [homeSvg, siteSvg, adminSvg, cellSvg, newcomerSvg] = await Promise.all([
    QRCode.toString('https://truelight.app', QR_OPTS),
    QRCode.toString('https://dasom.truelight.app', QR_OPTS),
    QRCode.toString(auto('demo@truelight.app', 'demo1234'), QR_OPTS),
    QRCode.toString(auto('cell@truelight.app', 'cell1234'), QR_OPTS),
    QRCode.toString(auto('newcomer@truelight.app', 'newcomer1234'), QR_OPTS),
  ]);

  return (
    <>
      <style>{CSS}</style>
      <div className="mkq-stage">
        <div className="mkq-brand">
          <div className="mkq-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" /></svg>
          </div>
          <h1>True Light</h1>
          <p className="mkq-tag">교회 홈페이지 · <b>교회 행정 시스템</b> — 카메라로 QR을 스캔해 주세요</p>
        </div>

        {/* 섹션 1 — 둘러보기 */}
        <section className="mkq-sec">
          <p className="mkq-seclabel">둘러보기</p>
          <div className="mkq-cards">
            <div className="mkq-card">
              <span className="mkq-eyebrow">서비스 소개</span>
              <h2>홈페이지 둘러보기</h2>
              <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: homeSvg }} />
              <a className="mkq-url" href="https://truelight.app">truelight.app</a>
              <p className="mkq-desc">요금·기능·도입 사례를 한눈에.</p>
            </div>
            <div className="mkq-card">
              <span className="mkq-eyebrow">데모 사이트</span>
              <h2>성도가 보는 화면</h2>
              <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: siteSvg }} />
              <a className="mkq-url" href="https://dasom.truelight.app">dasom.truelight.app</a>
              <p className="mkq-desc">완성된 교회 홈페이지를 그대로.</p>
            </div>
          </div>
        </section>

        {/* 섹션 2 — 역할별 관리자 체험 */}
        <section className="mkq-sec">
          <p className="mkq-seclabel">역할별 관리자 체험 · 스캔하면 바로 로그인됩니다</p>
          <div className="mkq-cards">
            <div className="mkq-card mkq-primary">
              <span className="mkq-eyebrow">관리자 · 전체</span>
              <h2>운영 화면 전체</h2>
              <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: adminSvg }} />
              <a className="mkq-url" href={auto('demo@truelight.app', 'demo1234')}>dasom.truelight.app/login</a>
              <p className="mkq-desc">설교·주보·교적·목장·새가족까지 전부.</p>
              <div className="mkq-cred"><span>demo@truelight.app</span><b>demo1234</b></div>
            </div>
            <div className="mkq-card">
              <span className="mkq-eyebrow">목자</span>
              <h2>목장 보고서</h2>
              <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: cellSvg }} />
              <a className="mkq-url" href={auto('cell@truelight.app', 'cell1234')}>dasom.truelight.app/login</a>
              <p className="mkq-desc">담당 목장만 보이고 리포트를 제출.</p>
              <div className="mkq-cred"><span>cell@truelight.app</span><b>cell1234</b></div>
            </div>
            <div className="mkq-card">
              <span className="mkq-eyebrow">새가족 담당자</span>
              <h2>새가족 관리</h2>
              <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: newcomerSvg }} />
              <a className="mkq-url" href={auto('newcomer@truelight.app', 'newcomer1234')}>dasom.truelight.app/login</a>
              <p className="mkq-desc">새가족 등록서·정착 관리만.</p>
              <div className="mkq-cred"><span>newcomer@truelight.app</span><b>newcomer1234</b></div>
            </div>
          </div>
        </section>

        <p className="mkq-foot">
          도입 문의 <b>1-470-839-5151</b> · <b>info@dasomweb.com</b> · 데모 데이터는 매일 초기화됩니다.
        </p>
      </div>
    </>
  );
}

const CSS = `
  .mkq-stage{
    --brand:#1466d6;--brand-deep:#0b3aa0;--ink:#14181f;--muted:#5b6472;--line:#e5e8ee;--card:#fff;
    min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:clamp(16px,2.6vh,30px);padding:clamp(16px,3vh,40px) clamp(14px,3vw,40px);
    color:var(--ink);letter-spacing:-.02em;
    font-family:"Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,-apple-system,"Segoe UI",sans-serif;
    background:radial-gradient(1200px 700px at 78% -8%,#e8f0ff 0,rgba(232,240,255,0) 60%),
      radial-gradient(900px 600px at -6% 108%,#eef3ff 0,rgba(238,243,255,0) 55%),#f4f6fb;
  }
  .mkq-brand{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px}
  .mkq-mark{width:52px;height:52px;border-radius:16px;background:linear-gradient(150deg,var(--brand),var(--brand-deep));display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px -10px rgba(20,102,214,.55)}
  .mkq-mark svg{width:30px;height:30px;fill:#fff}
  .mkq-brand h1{margin:0;font-size:clamp(24px,3.4vw,36px);font-weight:900;letter-spacing:-.04em}
  .mkq-tag{margin:0;font-size:clamp(12px,1.5vw,15px);color:var(--muted);font-weight:500}
  .mkq-tag b{color:var(--brand);font-weight:700}
  .mkq-sec{width:100%;max-width:1180px;display:flex;flex-direction:column;align-items:center;gap:10px}
  .mkq-seclabel{margin:0;font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
  .mkq-cards{display:flex;gap:clamp(12px,1.6vw,20px);width:100%;justify-content:center;flex-wrap:wrap}
  .mkq-card{flex:1 1 210px;max-width:290px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:clamp(14px,2vh,20px) clamp(12px,1.4vw,18px);display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;box-shadow:0 20px 50px -34px rgba(15,32,80,.35)}
  .mkq-primary{border:2px solid var(--brand);background:linear-gradient(180deg,#f6faff,#fff)}
  .mkq-eyebrow{font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--brand);text-transform:uppercase}
  .mkq-card h2{margin:0;font-size:clamp(15px,1.7vw,18px);font-weight:800;letter-spacing:-.03em}
  .mkq-desc{margin:0;font-size:12.5px;line-height:1.5;color:var(--muted)}
  .mkq-qrbox{background:#fff;border-radius:14px;padding:11px;border:1px solid var(--line);line-height:0;width:clamp(150px,16vw,182px);height:clamp(150px,16vw,182px)}
  .mkq-qrbox svg{display:block;width:100%;height:100%}
  .mkq-url{font-size:13.5px;font-weight:700;color:var(--brand);word-break:break-all;text-decoration:none;border-bottom:1px solid transparent}
  .mkq-url:hover{border-bottom-color:var(--brand)}
  .mkq-cred{display:flex;flex-direction:column;gap:1px;width:100%;background:#eef4ff;border:1px solid #d7e5ff;border-radius:10px;padding:6px 10px;font-size:12px}
  .mkq-cred span{color:var(--muted)} .mkq-cred b{color:var(--brand-deep);font-size:13px}
  .mkq-foot{font-size:12px;color:var(--muted);text-align:center;line-height:1.6}
  .mkq-foot b{color:var(--ink);font-weight:700}
`;
