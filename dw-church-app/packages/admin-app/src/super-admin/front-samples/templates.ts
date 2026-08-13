/**
 * Frontpage design samples — full, self-contained church-homepage previews that
 * an applicant will pick from. Each is a complete HTML document (rendered in an
 * <iframe srcDoc> so its own CSS is isolated). For now they're preview-only in
 * the super-admin; later the chosen sample seeds the tenant's page sections and
 * feeds the marketing page.
 *
 * Palettes/fonts mirror packages/theme-sets so a picked sample maps cleanly onto
 * a real tenant theme. Copy is a placeholder US-East-Coast Korean church.
 */

export interface SamplePalette {
  primary: string;
  primaryDark: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  onDark: string;
}

export interface FrontSample {
  id: string;
  name: string;
  vibe: string;
  themeSet: string; // maps to packages/theme-sets id
  palette: SamplePalette;
  fontHeading: string;
  fontBody: string;
  heading: 'sans' | 'serif';
  html: string;
}

interface SampleConfig {
  id: string;
  name: string;
  vibe: string;
  themeSet: string;
  palette: SamplePalette;
  fontHeading: string;
  fontBody: string;
  heading: 'sans' | 'serif';
}

// Fully self-contained — no external images (CSS gradients only) so previews are
// reliable and nothing is hotlinked. Real tenants upload their own media later.
function buildSampleHtml(c: SampleConfig): string {
  const p = c.palette;
  const rounded = c.heading === 'serif' ? '4px' : '14px';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&display=swap">
<style>
  :root{--p:${p.primary};--pd:${p.primaryDark};--ac:${p.accent};--bg:${p.bg};--sf:${p.surface};--tx:${p.text};--mut:${p.muted};--od:${p.onDark};--r:${rounded}}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${c.fontBody};color:var(--tx);background:var(--bg);line-height:1.7;-webkit-font-smoothing:antialiased}
  h1,h2,h3,.hd{font-family:${c.fontHeading};line-height:1.3;letter-spacing:-.02em}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1160px;margin:0 auto;padding:0 24px}
  .btn{display:inline-block;background:var(--p);color:var(--od);padding:13px 26px;border-radius:var(--r);font-weight:700;font-size:15px}
  .btn.ghost{background:transparent;border:1.5px solid rgba(255,255,255,.6);color:#fff}
  .eyebrow{color:var(--p);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
  /* header */
  header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid rgba(0,0,0,.06)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:68px}
  .logo{font-family:${c.fontHeading};font-weight:800;font-size:20px;color:var(--pd)}
  .nav ul{display:flex;gap:26px;list-style:none;font-size:15px;font-weight:600}
  .nav ul a{color:var(--tx);opacity:.8}
  /* hero */
  .hero{position:relative;min-height:560px;display:flex;align-items:center;color:#fff;background:radial-gradient(120% 120% at 15% 10%,rgba(255,255,255,.14),transparent 45%),linear-gradient(120deg,var(--pd),var(--p))}
  .hero .wrap{padding-top:60px;padding-bottom:60px}
  .hero h1{font-size:52px;color:#fff;max-width:16em}
  .hero p{font-size:19px;margin:18px 0 30px;max-width:30em;color:rgba(255,255,255,.92)}
  .hero .eyebrow{color:#fff;opacity:.85}
  .cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}
  /* service times strip */
  .times{background:var(--pd);color:var(--od)}
  .times .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.14)}
  .times .cell{background:var(--pd);padding:26px 24px;text-align:center}
  .times .cell .k{font-size:13px;opacity:.8;letter-spacing:.08em}
  .times .cell .v{font-family:${c.fontHeading};font-size:24px;font-weight:700;margin-top:6px}
  /* section */
  section.pad{padding:84px 0}
  .sec-head{max-width:640px;margin-bottom:44px}
  .sec-head h2{font-size:36px;margin-top:10px}
  .sec-head p{color:var(--mut);margin-top:12px;font-size:17px}
  /* about split */
  .split{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
  .split .photo{width:100%;border-radius:calc(var(--r) + 6px);aspect-ratio:4/3;background:radial-gradient(120% 120% at 20% 15%,rgba(255,255,255,.25),transparent 50%),linear-gradient(135deg,var(--p),var(--ac))}
  .split h2{font-size:32px}
  .split p{color:var(--mut);margin-top:16px}
  /* ministries grid */
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .card{background:var(--sf);border:1px solid rgba(0,0,0,.05);border-radius:var(--r);padding:28px}
  .card .ic{width:46px;height:46px;border-radius:12px;background:var(--p);opacity:.14;margin-bottom:16px}
  .card h3{font-size:19px}
  .card p{color:var(--mut);font-size:15px;margin-top:8px}
  /* sermons */
  .sermons{background:var(--sf)}
  .slist{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .sermon{background:var(--bg);border-radius:var(--r);overflow:hidden;border:1px solid rgba(0,0,0,.05)}
  .sermon .thumb{aspect-ratio:16/9;background:linear-gradient(135deg,var(--p),var(--ac))}
  .sermon .body{padding:20px}
  .sermon .body .d{font-size:13px;color:var(--p);font-weight:700}
  .sermon .body h3{font-size:18px;margin:6px 0}
  .sermon .body span{font-size:14px;color:var(--mut)}
  /* cta band */
  .band{background:linear-gradient(120deg,var(--p),var(--pd));color:#fff;text-align:center}
  .band h2{font-size:34px;color:#fff}
  .band p{opacity:.9;margin:14px 0 26px;font-size:17px}
  /* footer */
  footer{background:#0b1622;color:#9aa6b2;padding:52px 0 30px;font-size:14px}
  footer .cols{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px;margin-bottom:30px}
  footer h4{color:#e5eaf0;font-family:${c.fontHeading};font-size:16px;margin-bottom:12px}
  footer a{display:block;opacity:.8;margin:6px 0}
  footer .copy{border-top:1px solid rgba(255,255,255,.1);padding-top:20px;opacity:.6}
  @media(max-width:860px){.hero h1{font-size:34px}.split,.grid3,.slist,.times .grid,footer .cols{grid-template-columns:1fr}.nav ul{display:none}.sec-head h2{font-size:28px}}
</style></head>
<body>
<header><div class="wrap nav">
  <div class="logo">${c.name}</div>
  <ul><li><a>교회 소개</a></li><li><a>예배 안내</a></li><li><a>설교</a></li><li><a>교육·훈련</a></li><li><a>오시는 길</a></li></ul>
  <a class="btn" style="padding:9px 18px">새가족 등록</a>
</div></header>

<section class="hero"><div class="wrap">
  <div class="eyebrow">${c.name}에 오신 것을 환영합니다</div>
  <h1>말씀 위에 세워지는<br>믿음의 공동체</h1>
  <p>하나님을 예배하고 서로를 사랑하며, 이웃과 함께 걸어가는 교회입니다. 이번 주일, 여러분을 초대합니다.</p>
  <div class="cta-row"><a class="btn">예배 시간 보기</a><a class="btn ghost">온라인 예배</a></div>
</div></section>

<div class="times"><div class="wrap"><div class="grid">
  <div class="cell"><div class="k">주일 1부 예배</div><div class="v">오전 9:00</div></div>
  <div class="cell"><div class="k">주일 2부 예배</div><div class="v">오전 11:00</div></div>
  <div class="cell"><div class="k">수요 예배</div><div class="v">오후 7:30</div></div>
</div></div></div>

<section class="pad"><div class="wrap split">
  <div class="photo"></div>
  <div>
    <div class="eyebrow">담임목사 인사</div>
    <h2>여러분의 신앙 여정에<br>함께하겠습니다</h2>
    <p>우리 교회는 성경의 가르침 위에서 예배와 교제, 섬김을 실천하는 공동체입니다. 처음 오시는 분도 편안하게 예배드릴 수 있도록 안내해 드립니다. 언제든 문을 두드려 주세요.</p>
    <p style="margin-top:20px;font-weight:700;color:var(--tx)">— 담임목사 김은혜</p>
  </div>
</div></section>

<section class="pad" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><div class="eyebrow">함께하는 사역</div><h2>이런 사역으로 섬깁니다</h2><p>연령과 관심에 맞는 다양한 공동체와 훈련이 준비되어 있습니다.</p></div>
  <div class="grid3">
    <div class="card"><div class="ic"></div><h3>다음세대 교육</h3><p>영유아부터 청년까지, 세대별 신앙 교육과 양육이 이어집니다.</p></div>
    <div class="card"><div class="ic"></div><h3>목장·소그룹</h3><p>삶을 나누는 작은 공동체 안에서 함께 성장합니다.</p></div>
    <div class="card"><div class="ic"></div><h3>선교와 이웃 섬김</h3><p>지역과 열방을 향한 나눔과 섬김에 동참합니다.</p></div>
  </div>
</div></section>

<section class="pad sermons"><div class="wrap">
  <div class="sec-head"><div class="eyebrow">최근 설교</div><h2>말씀으로 시작하세요</h2></div>
  <div class="slist">
    <div class="sermon"><div class="thumb"></div><div class="body"><div class="d">2026.08.10</div><h3>흔들리지 않는 믿음</h3><span>히브리서 11:1 · 김은혜 목사</span></div></div>
    <div class="sermon"><div class="thumb"></div><div class="body"><div class="d">2026.08.03</div><h3>서로 사랑하라</h3><span>요한복음 13:34 · 김은혜 목사</span></div></div>
    <div class="sermon"><div class="thumb"></div><div class="body"><div class="d">2026.07.27</div><h3>날마다 새롭게</h3><span>고린도후서 4:16 · 김은혜 목사</span></div></div>
  </div>
</div></section>

<section class="pad band"><div class="wrap">
  <h2>이번 주일, 함께 예배드려요</h2>
  <p>처음 오시는 분들을 위한 안내가 준비되어 있습니다.</p>
  <a class="btn" style="background:#fff;color:var(--pd)">오시는 길 안내</a>
</div></section>

<footer><div class="wrap">
  <div class="cols">
    <div><h4>${c.name}</h4><p style="opacity:.75">802 Truitt Ave, LaGrange, GA 30240<br>(201) 555-0100 · info@church.org</p></div>
    <div><h4>바로가기</h4><a>교회 소개</a><a>예배 안내</a><a>설교 다시보기</a></div>
    <div><h4>온라인</h4><a>유튜브</a><a>온라인 헌금</a><a>새가족 등록</a></div>
  </div>
  <div class="copy">© 2026 ${c.name}. Powered by TRUE LIGHT.</div>
</div></footer>
</body></html>`;
}

const BASE: Omit<FrontSample, 'html'>[] = [
  {
    id: 'modern-light', name: '모던 라이트', vibe: '깔끔하고 밝은 · 도시형 교회', themeSet: 'modern-light',
    palette: { primary: '#2563eb', primaryDark: '#1e3a8a', accent: '#06b6d4', bg: '#ffffff', surface: '#f8fafc', text: '#0f172a', muted: '#64748b', onDark: '#ffffff' },
    fontHeading: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif", heading: 'sans',
  },
  {
    id: 'warm-family', name: '웜 패밀리', vibe: '따뜻하고 포근한 · 가정적인 교회', themeSet: 'warm-family',
    palette: { primary: '#ea580c', primaryDark: '#9a3412', accent: '#f59e0b', bg: '#fffdf9', surface: '#fef6ec', text: '#292524', muted: '#78716c', onDark: '#ffffff' },
    fontHeading: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif", heading: 'sans',
  },
  {
    id: 'traditional-formal', name: '트래디셔널 포멀', vibe: '단정하고 격조 있는 · 전통적인 교회', themeSet: 'traditional-formal',
    palette: { primary: '#1e3a5f', primaryDark: '#132741', accent: '#b08948', bg: '#ffffff', surface: '#f5f3ee', text: '#1c1917', muted: '#6b7280', onDark: '#ffffff' },
    fontHeading: "'Noto Serif KR', serif", fontBody: "'Pretendard', sans-serif", heading: 'serif',
  },
  {
    id: 'bold-youth', name: '볼드 유스', vibe: '역동적이고 강렬한 · 청년·다음세대', themeSet: 'bold-youth',
    palette: { primary: '#7c3aed', primaryDark: '#4c1d95', accent: '#ec4899', bg: '#ffffff', surface: '#f5f3ff', text: '#18181b', muted: '#71717a', onDark: '#ffffff' },
    fontHeading: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif", heading: 'sans',
  },
];

export const FRONT_SAMPLES: FrontSample[] = BASE.map((s) => ({
  ...s,
  html: buildSampleHtml({
    id: s.id, name: '은혜교회', vibe: s.vibe, themeSet: s.themeSet, palette: s.palette,
    fontHeading: s.fontHeading, fontBody: s.fontBody, heading: s.heading,
  }),
}));
