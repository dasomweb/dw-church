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

const STATUS_META: Record<string, { label: string; cls: string; hint: string }> = {
  pending:     { label: 'DNS 대기',  cls: 'bg-yellow-100 text-yellow-800', hint: 'DNS 레코드를 아직 인식하지 못했습니다' },
  verified:    { label: 'DNS 확인',  cls: 'bg-blue-100 text-blue-800',    hint: '소유권 확인 완료 — Railway 등록 대기 중' },
  pending_ssl: { label: 'SSL 발급 중', cls: 'bg-blue-100 text-blue-800',  hint: 'Railway에 등록 완료 — Let\'s Encrypt SSL 발급 진행 중 (보통 1~5분)' },
  active:      { label: '활성',      cls: 'bg-green-100 text-green-800',  hint: '연결 완료 — HTTPS로 접속 가능' },
  failed:      { label: '실패',      cls: 'bg-red-100 text-red-800',      hint: 'DNS 설정을 확인하세요' },
};

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

  const headers = { Authorization: `Bearer ${token || ''}` };

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
            placeholder="mychurch.com"
            required
            pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$"
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

                <p className="px-4 pb-3 text-[11px] text-gray-500">{meta.hint}</p>

                {instructions && (
                  <div className="border-t bg-gray-50 p-4 space-y-3">
                    <p className="text-xs text-gray-700">
                      도메인을 구입한 서비스(Cloudflare, GoDaddy, Namecheap, 가비아 등)의 DNS 관리 페이지에서
                      아래 <strong>2개 레코드</strong>를 추가해주세요. 전파까지 최대 5~10분 걸릴 수 있습니다.
                    </p>
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
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      ⚠ apex 도메인(mychurch.com처럼 서브도메인 없는 주소)은 CNAME을 지원하지 않는 레지스트라가 있습니다.
                      그 경우 <strong>www.mychurch.com</strong>을 CNAME으로 연결하고 apex는 레지스트라가 제공하는
                      "ANAME/ALIAS/Forwarding" 기능을 사용하세요.
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
