import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

interface CustomDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'active' | 'failed' | string;
  verificationToken: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DnsInstruction {
  purpose: 'ownership' | 'routing';
  type: 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  ttl?: number;
}

// Super-admin-only diagnostics — surfaces whether the Cloudflare-for-SaaS
// integration is actually wired (token/zone valid + live API reachable).
interface DiagData {
  ok: boolean;
  config: { hasApiToken: boolean; hasZoneId: boolean; configured: boolean; fallbackOrigin: string };
  ping: { ok: boolean; error?: string; zoneName?: string };
  summary: string;
}

const STATUS_META: Record<string, { label: string; cls: string; hint: string }> = {
  pending:     { label: 'DNS 대기',  cls: 'bg-yellow-100 text-yellow-800', hint: 'DNS 레코드를 아직 인식하지 못했습니다' },
  verified:    { label: 'DNS 확인',  cls: 'bg-blue-100 text-blue-800',    hint: '소유권 확인 완료 — Railway 등록 대기 중' },
  pending_ssl: { label: 'SSL 발급 중', cls: 'bg-blue-100 text-blue-800',  hint: 'Railway에 등록 완료 — Let\'s Encrypt SSL 발급 진행 중 (보통 1~5분)' },
  active:      { label: '활성',      cls: 'bg-green-100 text-green-800',  hint: '연결 완료 — HTTPS로 접속 가능' },
  failed:      { label: '실패',      cls: 'bg-red-100 text-red-800',      hint: 'DNS 설정을 확인하세요' },
};

// Shopify-style connection checklist. Each step is derived from the Cloudflare
// hostname status (pending → verified → pending_ssl → active) and, when the
// operator has run "연결 확인", the explicit txtFound/cnameOk probe results.
type StepState = 'done' | 'pending' | 'fail';
function domainSteps(
  status: string,
  checks?: { txtFound: boolean; cnameOk: boolean },
): { ownership: StepState; routing: StepState; ssl: StepState } {
  const failed = status === 'failed';
  const txt = !!checks?.txtFound || ['verified', 'pending_ssl', 'active'].includes(status);
  const cname = !!checks?.cnameOk || ['pending_ssl', 'active'].includes(status);
  const active = status === 'active';
  return {
    ownership: txt ? 'done' : failed ? 'fail' : 'pending',
    routing: cname ? 'done' : failed ? 'fail' : 'pending',
    ssl: active ? 'done' : failed ? 'fail' : 'pending',
  };
}

/** Green check when connected, red ✗ on failure, hollow grey circle while pending. */
function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <svg className="w-4 h-4 text-green-600 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="연결됨">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  if (state === 'fail') {
    return (
      <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="실패">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  }
  return <span className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-300" aria-label="대기 중" />;
}

export default function DomainSettings() {
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);
  const token = session?.accessToken;
  const { slug = '' } = useParams<{ slug: string }>();

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  // Per-domain-row DNS instructions (lazy-loaded on expand)
  const [expanded, setExpanded] = useState<Record<string, DnsInstruction[]>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  // Last "연결 확인" probe result per domain — feeds the Shopify-style checklist.
  const [checks, setChecks] = useState<Record<string, { txtFound: boolean; cnameOk: boolean }>>({});
  // Super-admin diagnostics panel (Cloudflare integration health).
  const isSuperAdmin = !!session?.user?.isSuperAdmin;
  const [diag, setDiag] = useState<DiagData | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // This page uses raw fetch (no api-client methods exist for /domains), so it
  // must set X-Tenant-Slug itself. Without it the request is proxied to the
  // api-server internal host and the server mis-reads "api-server" as the slug.
  const headers = { Authorization: `Bearer ${token || ''}`, 'X-Tenant-Slug': slug };

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/domains', { headers });
      const json = (await res.json()) as { data: CustomDomain[] };
      setDomains(json.data ?? []);
    } catch {
      showToast('error', '도메인 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const loadDiag = async () => {
    setDiagLoading(true);
    try {
      const res = await fetch('/api/v1/domains/diagnostics', { headers });
      const json = (await res.json()) as { data: DiagData };
      setDiag(json.data ?? null);
    } catch {
      setDiag(null);
    } finally {
      setDiagLoading(false);
    }
  };
  useEffect(() => { if (isSuperAdmin) void loadDiag(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isSuperAdmin, token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    setAdding(true);
    try {
      const res = await fetch('/api/v1/domains', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || '도메인 추가 실패');
      }
      const json = await res.json() as { data: CustomDomain; instructions: DnsInstruction[] };
      showToast('success', '도메인이 추가되었습니다. DNS 레코드를 설정해주세요.');
      setDomains((prev) => [json.data, ...prev.filter((d) => d.id !== json.data.id)]);
      setExpanded((prev) => ({ ...prev, [json.data.id]: json.instructions }));
      setNewDomain('');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '도메인 추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const handleShowInstructions = async (d: CustomDomain) => {
    if (expanded[d.id]) { setExpanded((prev) => { const n = { ...prev }; delete n[d.id]; return n; }); return; }
    try {
      const res = await fetch(`/api/v1/domains/${d.id}/instructions`, { headers });
      if (!res.ok) throw new Error('instructions load failed');
      const json = await res.json() as { data: CustomDomain; instructions: DnsInstruction[] };
      setExpanded((prev) => ({ ...prev, [d.id]: json.instructions }));
    } catch {
      showToast('error', 'DNS 안내를 불러오지 못했습니다.');
    }
  };

  const handleVerify = async (d: CustomDomain) => {
    setVerifying((prev) => ({ ...prev, [d.id]: true }));
    try {
      const res = await fetch(`/api/v1/domains/${d.id}/verify`, { method: 'POST', headers });
      const json = await res.json() as {
        data: CustomDomain;
        checks: { txtFound: boolean; cnameOk: boolean };
        errorMessage?: string;
      };
      setDomains((prev) => prev.map((x) => (x.id === d.id ? json.data : x)));
      setChecks((prev) => ({ ...prev, [d.id]: json.checks }));
      if (json.checks.txtFound) {
        const cnameMsg = json.checks.cnameOk ? '' : ' (CNAME은 아직 전파 중이거나 apex 도메인 — SSL은 슈퍼어드민이 Railway에서 등록해야 합니다)';
        showToast('success', `소유권 확인됨 ✓${cnameMsg}`);
      } else {
        showToast('error', json.errorMessage || 'TXT 레코드를 찾을 수 없습니다.');
      }
    } catch {
      showToast('error', '확인 중 오류가 발생했습니다.');
    } finally {
      setVerifying((prev) => ({ ...prev, [d.id]: false }));
    }
  };

  const handleRemove = async (d: CustomDomain) => {
    if (!window.confirm(`"${d.domain}" 도메인을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/v1/domains/${d.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error();
      showToast('success', '삭제되었습니다.');
      setDomains((prev) => prev.filter((x) => x.id !== d.id));
    } catch {
      showToast('error', '삭제 실패');
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast('success', '복사되었습니다.'); }
    catch { showToast('error', '복사에 실패했습니다.'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold">도메인 설정</h2>
        <p className="text-xs text-gray-500 mt-1">
          소유한 도메인(예: mychurch.com)을 연결해서 기본 주소(<span className="font-mono">{slug}.truelight.app</span>)
          대신 사용하세요. 연결 과정은 3단계입니다: 도메인 등록 → 레지스트라에서 DNS 레코드 추가 → 소유권 확인.
        </p>
      </div>

      {/* Super-admin-only: is the Cloudflare-for-SaaS integration actually wired?
          Surfaces token/zone presence + a live API ping so a 9109 (bad token)
          shows here instead of only failing when a tenant adds a domain. */}
      {isSuperAdmin && (
        <div className={`border rounded-lg p-4 ${diag ? (diag.ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200') : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-800">
              도메인 연동 진단 <span className="font-normal text-gray-400">(슈퍼어드민 전용)</span>
            </h3>
            <button
              onClick={() => void loadDiag()}
              disabled={diagLoading}
              className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {diagLoading ? '확인 중...' : '다시 확인'}
            </button>
          </div>
          {!diag ? (
            <p className="text-xs text-gray-400">{diagLoading ? '진단 중...' : '진단 정보를 불러오지 못했습니다.'}</p>
          ) : (
            <>
              <p className={`text-xs mb-2 ${diag.ok ? 'text-green-800' : 'text-amber-800'}`}>
                {diag.ok ? '✓ ' : '⚠ '}{diag.summary}
              </p>
              <div className="font-mono text-[11px] space-y-0.5 text-gray-600">
                <p>{diag.config.hasApiToken ? '✓' : '✗'} CF_API_TOKEN</p>
                <p>{diag.config.hasZoneId ? '✓' : '✗'} CF_ZONE_ID</p>
                <p className="text-gray-500">Fallback Origin: {diag.config.fallbackOrigin}</p>
                <p className={diag.ping.ok ? 'text-green-700' : 'text-red-600'}>
                  {diag.ping.ok ? `✓ Cloudflare API 응답 — zone: ${diag.ping.zoneName}` : `✗ Cloudflare API 응답 — ${diag.ping.error}`}
                </p>
              </div>
              {!diag.ping.ok && (
                <p className="mt-2 text-[11px] text-amber-700">
                  토큰 만료/권한 또는 Zone ID 오류일 수 있습니다. Railway api-server 의 <code className="font-mono">CF_API_TOKEN</code> 을
                  재발급해 교체하세요 (docs/multitenant-domains/SETUP.md §7).
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Default subdomain */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-bold mb-2">기본 주소</h3>
        <div className="flex items-center gap-2">
          <code className="px-3 py-1.5 bg-gray-50 border rounded text-sm font-mono text-gray-700">
            {slug}.truelight.app
          </code>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">활성</span>
          <span className="text-xs text-gray-400">기본 제공 — 커스텀 도메인이 없어도 항상 사용 가능</span>
        </div>
      </div>

      {/* Add domain */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-bold mb-3">+ 커스텀 도메인 추가</h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="www.mychurch.com"
            required
            pattern="^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$"
            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={adding || !newDomain.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {adding ? '추가 중...' : '도메인 추가'}
          </button>
        </form>

        {/* Short up-front note — the real, copy-paste, step-by-step walkthrough
            appears under the domain row after it's added. */}
        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-[11px] leading-relaxed text-gray-700 space-y-1.5">
          <p>
            <strong className="text-gray-900">www 형식으로 입력하세요.</strong>{' '}
            예: <code className="font-mono">www.mychurch.com</code> (루트 도메인 <code className="font-mono">mychurch.com</code> 단독은 연결되지 않습니다.)
          </p>
          <p>
            <strong className="text-gray-900">[도메인 추가]</strong>를 누르면, 도메인 구입처에{' '}
            <strong>그대로 복사·붙여넣기</strong> 할 DNS 설정값(복사 버튼 포함)과 <strong>단계별 안내</strong>가 바로 아래에 나타납니다.
          </p>
          <p className="text-blue-800">
            직접 설정이 어려우시면 — 도메인 구입처 로그인 정보를{' '}
            <a href="mailto:info@truelight.app" className="underline font-medium">info@truelight.app</a> 으로 보내주시면 저희가 대신 연결해 드립니다.
          </p>
        </div>
      </div>

      {/* Domain list */}
      {loading ? (
        <p className="text-sm text-gray-400 py-4">불러오는 중...</p>
      ) : domains.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-400">
          등록된 커스텀 도메인이 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => {
            const meta = STATUS_META[d.status] ?? STATUS_META.pending!;
            const instructions = expanded[d.id];
            return (
              <div key={d.id} className="bg-white border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="text-sm font-mono font-medium truncate">{d.domain}</code>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleShowInstructions(d)}
                      className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      {instructions ? '안내 닫기' : 'DNS 안내 보기'}
                    </button>
                    <button
                      onClick={() => handleVerify(d)}
                      disabled={!!verifying[d.id]}
                      className="text-xs text-indigo-700 hover:text-indigo-900 px-2 py-1 border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {verifying[d.id] ? '확인 중...' : '연결 확인'}
                    </button>
                    <button
                      onClick={() => handleRemove(d)}
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <p className="px-4 pb-2 text-[11px] text-gray-500">{meta.hint}</p>

                {/* Shopify-style connection checklist — a check appears as each
                    step connects. Re-runs on "연결 확인". */}
                {(() => {
                  const st = domainSteps(d.status, checks[d.id]);
                  const rows: { label: string; state: StepState; note: Record<StepState, string> }[] = [
                    { label: '도메인 소유권 확인 (TXT)', state: st.ownership, note: { done: '확인됨', pending: '대기 중', fail: '실패' } },
                    { label: '트래픽 라우팅 (CNAME → customers.truelight.app)', state: st.routing, note: { done: '연결됨', pending: '전파 중', fail: '실패' } },
                    { label: 'SSL 인증서 · HTTPS 연결', state: st.ssl, note: { done: '발급 완료', pending: '대기 중', fail: '실패' } },
                  ];
                  const noteCls: Record<StepState, string> = {
                    done: 'text-green-600', pending: 'text-gray-400', fail: 'text-red-500',
                  };
                  return (
                    <div className="px-4 pb-3">
                      <div className="rounded-lg border border-gray-100 bg-gray-50/70 divide-y divide-gray-100">
                        {rows.map((r) => (
                          <div key={r.label} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                            <StepIcon state={r.state} />
                            <span className={r.state === 'done' ? 'text-gray-800' : 'text-gray-500'}>{r.label}</span>
                            <span className={`ml-auto text-[10px] font-semibold ${noteCls[r.state]}`}>{r.note[r.state]}</span>
                          </div>
                        ))}
                      </div>
                      {st.ssl === 'done' ? (
                        <p className="mt-2 text-[11px] text-green-700">
                          ✓ 연결 완료 — <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="underline font-medium">https://{d.domain}</a> 으로 접속됩니다.
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] text-gray-400">DNS 추가 후 <strong>연결 확인</strong>을 누르면 단계별로 체크됩니다. 전파에 1~10분 걸릴 수 있습니다.</p>
                      )}
                    </div>
                  );
                })()}

                {instructions && (
                  <div className="border-t bg-gray-50 p-4 space-y-3">
                    <p className="text-sm font-bold text-gray-800">
                      <code className="font-mono">{d.domain}</code> 연결 방법 — 아래 순서대로 따라 하세요
                    </p>
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><strong className="text-gray-900">1단계.</strong> 도메인을 구입한 사이트(예: 가비아·GoDaddy·Namecheap·Cloudflare)에 로그인 → <strong>DNS 관리</strong>(또는 “DNS 설정”, “DNS Records”) 메뉴를 엽니다.</p>
                      <p><strong className="text-gray-900">2단계.</strong> <strong>“레코드 추가”</strong>로 아래 <strong>2개</strong>를 그대로 입력합니다. (값은 <strong>복사</strong> 버튼을 쓰면 정확합니다)</p>
                    </div>
                    {instructions.map((rec, i) => (
                      <div key={i} className="bg-white rounded border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase">{rec.purpose === 'ownership' ? '1. 소유권 확인 (TXT)' : '2. 트래픽 라우팅 (CNAME)'}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-y-1.5 gap-x-3 items-center text-xs">
                          <span className="text-gray-500">Type</span>
                          <code className="font-mono">{rec.type}</code>

                          <span className="text-gray-500">Name / Host</span>
                          <div className="flex items-center gap-1.5">
                            <code className="flex-1 font-mono bg-gray-50 px-2 py-1 rounded border text-[11px] truncate">{rec.name}</code>
                            <button onClick={() => copy(rec.name)} className="text-[10px] px-1.5 py-0.5 bg-white border rounded hover:bg-gray-50">복사</button>
                          </div>

                          <span className="text-gray-500">Value / Target</span>
                          <div className="flex items-center gap-1.5">
                            <code className="flex-1 font-mono bg-gray-50 px-2 py-1 rounded border text-[11px] truncate">{rec.value}</code>
                            <button onClick={() => copy(rec.value)} className="text-[10px] px-1.5 py-0.5 bg-white border rounded hover:bg-gray-50">복사</button>
                          </div>

                          {rec.ttl && (
                            <>
                              <span className="text-gray-500">TTL</span>
                              <code className="font-mono text-[11px]">{rec.ttl} (또는 Auto)</code>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><strong className="text-gray-900">3단계.</strong> 저장하고 <strong>1~10분</strong> 기다립니다. (DNS 전파 시간)</p>
                      <p><strong className="text-gray-900">4단계.</strong> 위의 <strong>연결 확인</strong> 버튼을 누릅니다. 체크리스트가 모두 초록 ✓ 가 되면 완료 — <code className="font-mono">https://{d.domain}</code> 로 접속됩니다.</p>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      ※ 일부 등록업체는 “이름/호스트” 칸에 도메인 뒷부분을 자동으로 붙입니다. 그럴 땐 위 값에서 <strong>앞부분만</strong>(예: <code className="font-mono">www</code>) 입력하세요.
                    </p>
                    {(() => {
                      const root = d.domain.replace(/^www\./, '');
                      return root !== d.domain ? (
                        <div className="text-[11px] text-gray-500 space-y-0.5">
                          <p><strong>(선택) 루트 주소도 연결</strong> — <code className="font-mono">{root}</code> 으로 들어오는 분들도 보이게 하려면:</p>
                          <p className="ml-2">
                            <strong className="text-gray-700">① Cloudflare·Route53 등 DNS면(권장):</strong> 같은 DNS에 <code className="font-mono">{root}</code> CNAME → <code className="font-mono">customers.truelight.app</code> (Proxied) <strong>한 줄</strong>만 추가하세요. 자동으로 <code className="font-mono">https://{d.domain}</code> 로 연결됩니다.
                          </p>
                          <p className="ml-2">
                            <strong className="text-gray-700">② 일반 등록업체면:</strong> Domain Forwarding(URL Redirect)으로 <code className="font-mono">{root} → https://{d.domain}</code> 설정. (대부분 무료)
                          </p>
                        </div>
                      ) : null;
                    })()}

                    <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded p-2">
                      직접 하기 어려우시면 — 도메인 구입처 로그인 정보를{' '}
                      <a href="mailto:info@truelight.app" className="underline font-medium">info@truelight.app</a> 으로 보내주시면 저희가 대신 설정해 드립니다.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
