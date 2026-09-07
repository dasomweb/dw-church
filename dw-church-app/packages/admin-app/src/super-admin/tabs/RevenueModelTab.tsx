import { useMemo, useState } from 'react';

/**
 * Super-admin ERP tool — 수익 모델 시뮬레이터 + 확정 정책 요약.
 * 개척·미자립 감면 확산 시 5년 수익을 A(라이트 착지) vs B(무전략 Drop)로 비교.
 * 정책 요약(요금·제약·감면 내부 규칙)은 내부 참조용 — 공개 페이지엔 최장 2년/단계표를
 * 노출하지 않고, 1년 구독 종료 시 갱신에서 제안한다.
 */

type Inputs = {
  n1: number; n2: number; n3: number; n4: number; n5: number;
  subPct: number; churn: number; liteChurn: number;
  full: number; sub: number; lite: number;
  opc: number; liteOpc: number;
  setFull: number; setSub: number; setCost: number;
  drop: number; addon: number;
};

const DEFAULTS: Inputs = {
  n1: 50, n2: 100, n3: 180, n4: 280, n5: 400,
  subPct: 50, churn: 8, liteChurn: 5,
  full: 99, sub: 39, lite: 39,
  opc: 12, liteOpc: 5,
  setFull: 600, setSub: 200, setCost: 800,
  drop: 70, addon: 30,
};

const fmtK = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n);
};

type Row = { y: number; active: number; lite: number; arr: number; rev: number; contrib: number; cumRev: number; cumC: number };

function sim(P: Inputs, strategy: 'lite' | 'drop'): Row[] {
  const news = [P.n1, P.n2, P.n3, P.n4, P.n5];
  const share = P.subPct / 100, keep = 1 - P.churn / 100, liteKeep = 1 - P.liteChurn / 100, dropKeep = 1 - P.drop / 100;
  let subY1 = 0, lite = 0, full = 0, cumRev = 0, cumC = 0;
  const rows: Row[] = [];
  for (let y = 0; y < 5; y++) {
    const nn = news[y] || 0, nSub = Math.round(nn * share), nFull = nn - nSub;
    const bMRR = subY1 * P.sub + lite * P.lite + full * P.full, bFull = full;
    const retFull = full * keep, retLite = lite * liteKeep, gradSurv = subY1 * keep;
    if (strategy === 'lite') { lite = retLite + gradSurv; full = retFull + nFull; subY1 = nSub; }
    else { const stay = gradSurv * dropKeep; full = retFull + nFull + stay; lite = retLite; subY1 = nSub; }
    const eMRR = subY1 * P.sub + lite * P.lite + full * P.full, eAct = subY1 + lite + full, eFull = full;
    const subCash = (bMRR + eMRR) / 2 * 12;
    const setupCash = nSub * P.setSub + nFull * P.setFull;
    const addonBase = (bFull + eFull) / 2 * (P.addon / 100), addonCash = addonBase * 69 * 12;
    const rev = subCash + setupCash + addonCash;
    const opCost = ((subY1 + full) * P.opc + lite * P.liteOpc) * 12;
    const setupCost = nn * P.setCost;
    const contrib = rev - opCost - setupCost;
    const arr = eMRR * 12 + addonBase * 69 * 12;
    cumRev += rev; cumC += contrib;
    rows.push({ y: y + 1, active: eAct, lite, arr, rev, contrib, cumRev, cumC });
  }
  return rows;
}

const C = { ink: '#16181d', muted: '#61697a', line: '#e3e7ed', panel: '#fff', a: '#1466d6', b: '#e07b39', aSoft: '#eaf1fd', bSoft: '#fbeee2', warm: '#fbfaf8', pos: '#15803d', neg: '#c0392b' };
const num = "'SF Mono',ui-monospace,Menlo,Consolas,monospace";

function Field({ label, id, val, set, hint }: { label: string; id: keyof Inputs; val: number; set: (id: keyof Inputs, v: number) => void; hint?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: C.muted, marginBottom: 3 }}>{label}</label>
      <input type="number" value={val} onChange={(e) => set(id, parseFloat(e.target.value) || 0)}
        style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 9px', fontFamily: num, fontWeight: 600, fontSize: 14, outline: 'none' }} />
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Table({ rows, accent }: { rows: Row[]; accent: string }) {
  const L = rows[rows.length - 1]!;
  const th: React.CSSProperties = { fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'right', padding: '8px 9px', borderBottom: `1px solid ${C.line}` };
  const td: React.CSSProperties = { fontSize: 12.5, fontFamily: num, textAlign: 'right', padding: '7px 9px' };
  const td0: React.CSSProperties = { ...td, textAlign: 'left', color: C.muted, fontFamily: 'inherit', fontWeight: 600 };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...th, textAlign: 'left' }}>연도</th><th style={th}>활성</th><th style={th}>라이트</th><th style={th}>ARR</th><th style={th}>연매출</th><th style={th}>기여이익</th>
      </tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.y} style={{ borderBottom: `1px solid ${C.line}` }}>
            <td style={td0}>Y{r.y}</td><td style={td}>{Math.round(r.active).toLocaleString()}</td><td style={td}>{Math.round(r.lite).toLocaleString()}</td>
            <td style={{ ...td, color: accent, fontWeight: 700 }}>{fmtK(r.arr)}</td><td style={td}>{fmtK(r.rev)}</td>
            <td style={{ ...td, color: r.contrib < 0 ? C.neg : C.pos }}>{fmtK(r.contrib)}</td>
          </tr>
        ))}
        <tr><td style={{ ...td0, fontWeight: 800, borderTop: `2px solid ${C.line}` }}>5년 누적</td><td colSpan={3} style={{ borderTop: `2px solid ${C.line}` }} /><td style={{ ...td, fontWeight: 800, borderTop: `2px solid ${C.line}` }}>{fmtK(L.cumRev)}</td><td style={{ ...td, fontWeight: 800, borderTop: `2px solid ${C.line}`, color: L.cumC < 0 ? C.neg : C.pos }}>{fmtK(L.cumC)}</td></tr>
      </tbody>
    </table>
  );
}

function Chart({ A, B }: { A: Row[]; B: Row[] }) {
  const W = 720, H = 230, pad = 40, bw = 42;
  const max = Math.max(...A.map((r) => r.arr), ...B.map((r) => r.arr), 1);
  const y0 = H - 22, top = 14, sc = (y0 - top) / max, gw = (W - pad - 16) / 5;
  const parts: React.ReactNode[] = [<line key="ax" x1={pad} y1={y0} x2={W - 8} y2={y0} stroke={C.line} />];
  for (let g = 1; g <= 3; g++) { const v = max * g / 3, yy = y0 - v * sc; parts.push(<line key={'g' + g} x1={pad} y1={yy} x2={W - 8} y2={yy} stroke={C.line} strokeDasharray="3 4" />, <text key={'gt' + g} x={pad - 6} y={yy + 4} textAnchor="end" fontSize={10} fill={C.muted} fontFamily={num}>{fmtK(v)}</text>); }
  A.forEach((r, i) => {
    const gx = pad + 8 + i * gw, a = r.arr, b = B[i]!.arr, ah = a * sc, bh = b * sc;
    parts.push(
      <rect key={'a' + i} x={gx} y={y0 - ah} width={bw} height={ah} rx={4} fill={C.a} />,
      <rect key={'b' + i} x={gx + bw + 8} y={y0 - bh} width={bw} height={bh} rx={4} fill={C.b} />,
      <text key={'x' + i} x={gx + bw + 4} y={y0 + 15} textAnchor="middle" fontSize={11} fill={C.muted}>Y{i + 1}</text>,
      <text key={'av' + i} x={gx + bw / 2} y={y0 - ah - 4} textAnchor="middle" fontSize={9} fill={C.a} fontFamily={num}>{fmtK(a)}</text>,
      <text key={'bv' + i} x={gx + bw + 8 + bw / 2} y={y0 - bh - 4} textAnchor="middle" fontSize={9} fill={C.b} fontFamily={num}>{fmtK(b)}</text>,
    );
  });
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={230} role="img" aria-label="전략별 연도별 ARR 비교">{parts}</svg>;
}

export default function RevenueModelTab() {
  const [p, setP] = useState<Inputs>(DEFAULTS);
  const set = (id: keyof Inputs, v: number) => setP((s) => ({ ...s, [id]: v }));
  const A = useMemo(() => sim(p, 'lite'), [p]);
  const B = useMemo(() => sim(p, 'drop'), [p]);
  const la = A[4]!, lb = B[4]!;
  const card: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 };
  const kpi = (l: string, v: string, d: string, col?: string) => (
    <div style={{ flex: 1, minWidth: 150, ...card, padding: '12px 14px' }}>
      <div style={{ fontSize: 11.5, color: C.muted }}>{l}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: num, letterSpacing: '-0.02em', marginTop: 2, color: col }}>{v}</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{d}</div>
    </div>
  );
  const arrGap = la.arr - lb.arr, cGap = la.cumC - lb.cumC;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: C.ink, wordBreak: 'keep-all' }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>수익 모델 · ERP 시뮬레이터</h2>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>개척·미자립 감면 확산 시 5년 수익 — <b style={{ color: C.a }}>A 라이트 착지</b> vs <b style={{ color: C.b }}>B 무전략 Drop</b>. 가정은 직접 조절. 내부 도구.</p>
      </div>

      {/* 정책 요약 (내부) */}
      <div style={{ ...card, background: C.warm }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.04em', color: C.muted, marginBottom: 10 }}>확정 정책 · 내부 참조</div>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', fontSize: 13, lineHeight: 1.7 }}>
          <div>
            <b>요금</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: '#41495a' }}>
              <li>정상 구독 <b>$99/월</b> (연 결제 시 2개월 무료)</li>
              <li>초기구축 $600 / $900 / $1,400부터</li>
              <li>교회 행정 애드온 <b>$69/월</b> (묶음)</li>
              <li>사용량: <b>트래픽 무제한(공정사용)</b> + 저장공간 한도+초과</li>
            </ul>
          </div>
          <div>
            <b>개척·미자립 감면 (내부 · 공개 미표기)</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: '#41495a' }}>
              <li>1년차 <b>$39</b> · 초기구축 $200 (공개는 "첫 1년"까지만)</li>
              <li>2·3년차 <b>단계적 인상</b>(예 $59 → $79 → $99), 1년 종료 시 갱신에서 제안</li>
              <li>최장 2년 지원(내부 상한) — 공개·명시 금지</li>
              <li><b>감면 셋업 = 검증 템플릿 빠른 대행</b>(셀프 아님·저노동, 풀 커스텀 구축은 정상 요금만) → 셋업 손실·담합 차단</li>
              <li>돕는 교회: 정상 자립교회, <b>정기 후원</b>(한 교회씩 이어서 계속) — 후원하는 동안 월 $20 감면</li>
            </ul>
          </div>
          <div>
            <b>제약 · 악용 방지</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: '#41495a' }}>
              <li>감면 = <b>심사·승인제</b>(자동 아님)</li>
              <li>순환·상호 후원 금지, 동일 실체 분할 등록 금지</li>
              <li>부정 적발 시 소급 청구·해지</li>
              <li>감면 = <b>하드캡 선교예산</b>(성장 채널 아님)</li>
            </ul>
          </div>
          <div>
            <b>지원 모델</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: '#41495a' }}>
              <li><b>AI-보조 카카오톡 1차</b> + 도움센터</li>
              <li>실시간·반복 1:1·우선지원 = 유료 애드온</li>
              <li>무제한 하이터치 금지 — 스코프 바운드</li>
              <li>인프라 원가 매출의 1~4%(R2 egress 무료) — 진짜 원가는 인적 지원</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 계산기 — 좁은 화면에서 입력 패널/결과가 자연히 아래로 쌓이도록 flex-wrap */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ ...card, flex: '1 1 280px', maxWidth: 340 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.muted, marginBottom: 12, textTransform: 'uppercase' }}>가정</div>
          <label style={{ display: 'block', fontSize: 12.5, color: C.muted, marginBottom: 3 }}>신규 교회 / 년</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginBottom: 10 }}>
            {(['n1', 'n2', 'n3', 'n4', 'n5'] as (keyof Inputs)[]).map((id, i) => (
              <div key={id}>
                <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>Y{i + 1}</div>
                <input type="number" value={p[id]} onChange={(e) => set(id, parseFloat(e.target.value) || 0)} style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 6, padding: '6px 2px', textAlign: 'center', fontFamily: num, fontSize: 12.5, outline: 'none' }} />
              </div>
            ))}
          </div>
          <Field label="신규 중 감면 비중 (%)" id="subPct" val={p.subPct} set={set} />
          <Field label="연 이탈률 — 일반 (%)" id="churn" val={p.churn} set={set} />
          <Field label="연 이탈률 — 라이트 (%)" id="liteChurn" val={p.liteChurn} set={set} hint="저렴 → 변동율↓" />
          <Field label="정상 구독 ($/월)" id="full" val={p.full} set={set} />
          <Field label="감면 1년차 ($/월)" id="sub" val={p.sub} set={set} />
          <Field label="라이트(셀프서브) ($/월)" id="lite" val={p.lite} set={set} />
          <Field label="지원+인프라 원가 — 일반 ($/월)" id="opc" val={p.opc} set={set} hint="AI-카톡·async 기준" />
          <Field label="지원+인프라 원가 — 라이트 ($/월)" id="liteOpc" val={p.liteOpc} set={set} />
          <Field label="초기구축비 — 정상 ($)" id="setFull" val={p.setFull} set={set} />
          <Field label="초기구축비 — 감면 ($)" id="setSub" val={p.setSub} set={set} />
          <Field label="초기구축 실원가/교회 ($)" id="setCost" val={p.setCost} set={set} />
          <Field label="무전략 시 1년 후 Drop율 (%)" id="drop" val={p.drop} set={set} />
          <Field label="행정 애드온 채택률 (%)" id="addon" val={p.addon} set={set} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, flex: '999 1 440px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {kpi('Y5 ARR — 전략(라이트)', fmtK(la.arr), `활성 ${Math.round(la.active).toLocaleString()}교회`)}
            {kpi('Y5 ARR — 무전략(Drop)', fmtK(lb.arr), `활성 ${Math.round(lb.active).toLocaleString()}교회`)}
            {kpi('Y5 ARR 격차', fmtK(arrGap), `전략이 ${(arrGap / Math.max(lb.arr, 1) * 100).toFixed(0)}% 큼`, arrGap < 0 ? C.neg : C.pos)}
            {kpi('5년 누적 기여이익 격차', fmtK(cGap), '전략 − 무전략', cGap < 0 ? C.neg : C.pos)}
          </div>
          <div style={card}>
            <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: C.muted, marginBottom: 6, flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: C.a, verticalAlign: -1, marginRight: 5 }} />A · 라이트 전환</span>
              <span><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: C.b, verticalAlign: -1, marginRight: 5 }} />B · 무전략 Drop</span>
              <span style={{ marginLeft: 'auto' }}>막대 = ARR(연환산)</span>
            </div>
            <Chart A={A} B={B} />
          </div>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            <div style={{ ...card, borderTop: `3px solid ${C.a}`, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', background: C.aSoft }}><b style={{ fontSize: 14 }}>전략 · 라이트 셀프서브 착지</b></div>
              <div style={{ padding: '0 6px' }}><Table rows={A} accent={C.a} /></div>
            </div>
            <div style={{ ...card, borderTop: `3px solid ${C.b}`, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', background: C.bSoft }}><b style={{ fontSize: 14 }}>무전략 · 1년 후 Drop</b></div>
              <div style={{ padding: '0 6px' }}><Table rows={B} accent={C.b} /></div>
            </div>
          </div>
          <div style={{ ...card, background: C.warm, fontSize: 13, lineHeight: 1.8 }}>
            <b>해석.</b> 감면이 확산돼도 <b>라이트($39 셀프서브)로 착지</b>시키면 이탈 대신 유지·흑자(Y5 ARR {fmtK(la.arr)}). <b>무전략(Drop)</b>은 감면 종료 시 이탈해 초기구축 보조가 매몰(Y5 ARR {fmtK(lb.arr)}, 5년 기여이익 {fmtK(cGap)} 낮음). 성패 = 가격이 아니라 <b>바운드</b>(지원 스코프 제한 + 감면 하드캡 + 합리적 가격→저churn). 추정 모델이며 값은 가정.
          </div>
        </div>
      </div>
    </div>
  );
}
