import QRCode from 'qrcode';
import type { Metadata } from 'next';

// truelight.app/marketing — 데스크 iPad 부스용 공개 페이지(로그인 불필요).
// QR 2개: (1) 서비스 홈, (2) dasom 데모 자동로그인. QR은 서버에서 SVG로 생성해
// 자체 호스팅한다(외부 스크립트/이미지 의존 없음). 정적 페이지.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'True Light 데모 부스',
  description: '카메라로 QR을 스캔해 서비스와 관리자 데모를 체험하세요.',
  robots: { index: false, follow: false }, // 부스용 — 검색 노출 불필요
};

const HOME_URL = 'https://truelight.app';
const DEMO_URL = 'https://dasom.truelight.app/login?email=demo%40truelight.app&password=demo1234&auto=1';

const QR_OPTS = { type: 'svg' as const, margin: 1, color: { dark: '#0a1330', light: '#ffffff' } };

export default async function MarketingBoothPage() {
  const [homeSvg, demoSvg] = await Promise.all([
    QRCode.toString(HOME_URL, QR_OPTS),
    QRCode.toString(DEMO_URL, QR_OPTS),
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

        <div className="mkq-cards">
          {/* 1. 서비스 홈 */}
          <section className="mkq-card">
            <span className="mkq-eyebrow">서비스 소개</span>
            <h2>홈페이지 둘러보기</h2>
            <p className="mkq-desc">요금·기능·도입 사례를 한눈에. 상담·데모 신청도 여기서.</p>
            <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: homeSvg }} />
            <div className="mkq-url">truelight.app</div>
            <span className="mkq-scanhint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /></svg>
              스캔하면 소개 페이지가 열립니다
            </span>
          </section>

          {/* 2. 데모 체험 (자동 로그인) */}
          <section className="mkq-card mkq-primary">
            <span className="mkq-eyebrow">관리자 데모</span>
            <h2>관리자 화면 바로 체험</h2>
            <p className="mkq-desc">설교·주보 등록, 교적·목장·새가족 관리까지 실제 화면으로.</p>
            <div className="mkq-qrbox" dangerouslySetInnerHTML={{ __html: demoSvg }} />
            <span className="mkq-autobadge">스캔하면 바로 로그인됩니다</span>
            <div className="mkq-creds">
              <div className="mkq-cred"><span className="mkq-k">주소</span><span className="mkq-v">dasom.truelight.app</span></div>
              <div className="mkq-cred"><span className="mkq-k">아이디</span><span className="mkq-v">demo@truelight.app</span></div>
              <div className="mkq-cred"><span className="mkq-k">비밀번호</span><span className="mkq-v">demo1234</span></div>
            </div>
          </section>
        </div>

        <p className="mkq-foot">
          도입 문의 <b>1-470-839-5151</b> · <b>info@dasomweb.com</b><br />
          데모 데이터는 매일 초기화됩니다 — 자유롭게 체험해 보세요.
        </p>
      </div>
    </>
  );
}

const CSS = `
  .mkq-stage{
    --brand:#1466d6;--brand-deep:#0b3aa0;--ink:#14181f;--muted:#5b6472;--line:#e5e8ee;--card:#fff;
    min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:clamp(22px,4vh,44px);padding:clamp(20px,4vh,56px) clamp(18px,4vw,56px);
    color:var(--ink);letter-spacing:-.02em;
    font-family:"Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,-apple-system,"Segoe UI",sans-serif;
    background:
      radial-gradient(1200px 700px at 78% -8%, #e8f0ff 0%, rgba(232,240,255,0) 60%),
      radial-gradient(900px 600px at -6% 108%, #eef3ff 0%, rgba(238,243,255,0) 55%),
      #f4f6fb;
  }
  .mkq-brand{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px}
  .mkq-mark{width:64px;height:64px;border-radius:20px;background:linear-gradient(150deg,var(--brand),var(--brand-deep));display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px -10px rgba(20,102,214,.55)}
  .mkq-mark svg{width:36px;height:36px;fill:#fff}
  .mkq-brand h1{margin:0;font-size:clamp(30px,4.4vw,46px);font-weight:900;letter-spacing:-.04em}
  .mkq-tag{margin:0;font-size:clamp(14px,1.8vw,18px);color:var(--muted);font-weight:500}
  .mkq-tag b{color:var(--brand);font-weight:700}
  .mkq-cards{display:flex;gap:clamp(18px,3vw,32px);width:100%;max-width:1000px;justify-content:center;flex-wrap:wrap}
  .mkq-card{flex:1 1 340px;max-width:460px;background:var(--card);border:1px solid var(--line);border-radius:26px;padding:clamp(22px,3.2vh,34px) clamp(20px,2.6vw,30px);display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;box-shadow:0 24px 60px -34px rgba(15,32,80,.35)}
  .mkq-primary{border:2px solid var(--brand);background:linear-gradient(180deg,#f6faff,#fff)}
  .mkq-eyebrow{font-size:12.5px;font-weight:800;letter-spacing:.12em;color:var(--brand);text-transform:uppercase}
  .mkq-card h2{margin:0;font-size:clamp(19px,2.3vw,24px);font-weight:800;letter-spacing:-.03em}
  .mkq-desc{margin:0;font-size:14.5px;line-height:1.6;color:var(--muted);min-height:2.6em}
  .mkq-qrbox{background:#fff;border-radius:18px;padding:16px;border:1px solid var(--line);line-height:0;width:clamp(210px,26vw,264px);height:clamp(210px,26vw,264px)}
  .mkq-qrbox svg{display:block;width:100%;height:100%}
  .mkq-url{font-size:15px;font-weight:700;color:var(--ink);word-break:break-all}
  .mkq-scanhint{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);font-weight:500}
  .mkq-scanhint svg{width:16px;height:16px}
  .mkq-autobadge{font-size:12.5px;font-weight:800;color:#0b7a3b;background:#e5f7ec;border:1px solid #bfead0;border-radius:999px;padding:5px 12px}
  .mkq-creds{margin-top:2px;display:flex;flex-direction:column;gap:6px;width:100%;max-width:300px}
  .mkq-cred{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#eef4ff;border:1px solid #d7e5ff;border-radius:12px;padding:9px 14px}
  .mkq-k{font-size:12px;color:var(--muted);font-weight:600}
  .mkq-v{font-size:14.5px;font-weight:800;color:var(--brand-deep);font-variant-numeric:tabular-nums}
  .mkq-foot{font-size:13px;color:var(--muted);text-align:center;line-height:1.7}
  .mkq-foot b{color:var(--ink);font-weight:700}
  @media (max-width:520px){ .mkq-desc{min-height:0} }
`;
