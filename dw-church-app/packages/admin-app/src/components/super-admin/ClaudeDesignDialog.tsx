/**
 * ClaudeDesignDialog — 콘솔에서 Claude Design 을 연결하고 캔버스를 가져온다.
 *
 * 연결(인증): Anthropic 의 Claude Design MCP OAuth 는 native-app(loopback 전용)이라
 * 서버가 https 콜백을 받을 수 없다(검증됨). 그래서 "연결" 은 콘솔이 1회용 connect_token
 * 을 발급 → 대표님이 로컬에서 한 줄 명령을 1번 실행하면 브라우저 claude.ai 로그인으로
 * 토큰을 받아 서버에 저장(refresh 로 장기 유지)한다. 이후 fetch→매핑→반영은 콘솔에서.
 *
 * 반영: 연결되면 Claude Design 이 준 포인터(프로젝트 링크 + .dc.html)를 붙여넣고
 * "가져오기(미리보기)" → 서버가 MCP 로 캔버스를 읽어 화면→블록 구조를 보여준다(쓰기 없음).
 * 실제 적용(테마+페이지)은 미리보기로 실측 확인 후 이어서.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../index';
import { useAuthStore } from '../../stores/auth';

interface Props {
  tenant: { id: string; slug: string; name: string };
  open: boolean;
  onClose: () => void;
}
type Mode = '전면개편' | '부분추가';

interface Parsed { projectId: string | null; projectLink: string | null; file: string | null }

/** Claude Design 이 준 요청 블록에서 프로젝트/파일을 파싱한다. */
export function parseClaudeDesignRequest(raw: string): Parsed {
  const link = raw.match(/https:\/\/claude\.ai\/design\/p\/[^\s'"`)]+/)?.[0] ?? null;
  const projectId = (link ?? raw).match(/design\/p\/([A-Za-z0-9-]+)/)?.[1] ?? null;
  let file: string | null = null;
  const fromParam = (link ?? raw).match(/[?&]file=([^&\s'"`]+)/)?.[1];
  if (fromParam) { try { file = decodeURIComponent(fromParam.replace(/\+/g, ' ')); } catch { file = fromParam; } }
  if (!file) file = raw.match(/Implement:\s*`?([^`\n]+\.dc\.html)`?/i)?.[1]?.trim() ?? null;
  if (!file) file = raw.match(/`([^`]+\.dc\.html)`/)?.[1]?.trim() ?? null;
  return { projectId, projectLink: link, file };
}

interface Status { connected: boolean; scope?: string; expiresAt?: string | null; updatedAt?: string }
interface PreviewPage { slug: string; label?: string; sections: { blockType: string; needsBlock: boolean; note?: string }[]; dynamicLists: string[] }
interface Preview { toolNote: string; htmlLength: number; pages: PreviewPage[]; imports: string[]; warnings: string[] }

export function ClaudeDesignDialog({ tenant, open, onClose }: Props) {
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);

  const [status, setStatus] = useState<Status | null>(null);
  const [connectCmd, setConnectCmd] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);

  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState<Mode>('전면개편');
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const parsed = useMemo(() => parseClaudeDesignRequest(raw), [raw]);

  const baseUrl = (() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'admin.truelight.app') return 'https://api-server-production-c612.up.railway.app';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const designFetch = async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(`${baseUrl}/api/v1/design${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${session?.accessToken ?? ''}`,
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers as Record<string, string> | undefined),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return json.data as T;
  };

  const refreshStatus = async () => {
    try { setStatus(await designFetch<Status>('/oauth/status')); }
    catch (e) { setError(e instanceof Error ? e.message : '상태 조회 실패'); }
  };

  useEffect(() => {
    if (!open) return;
    setStatus(null); setConnectCmd(null); setConnecting(false); setCmdCopied(false);
    setRaw(''); setMode('전면개편'); setPreviewing(false); setPreview(null); setError(null);
    void refreshStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenant.id]);

  if (!open) return null;

  const startConnect = async () => {
    setError(null); setConnecting(true);
    try {
      const { command } = await designFetch<{ connectToken: string; command: string }>('/oauth/local/init', { method: 'POST', body: '{}' });
      setConnectCmd(command);
      // 로컬 커넥터가 토큰을 서버에 넘기면 상태가 connected 로 바뀐다 — 폴링으로 감지.
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const s = await designFetch<Status>('/oauth/status');
          setStatus(s);
          if (s.connected) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null; setConnecting(false); setConnectCmd(null);
            showToast('success', 'Claude Design 연결 완료');
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch (e) {
      setConnecting(false);
      showToast('error', e instanceof Error ? e.message : '연결 시작 실패');
    }
  };

  const copyCmd = async () => {
    if (!connectCmd) return;
    try { await navigator.clipboard.writeText(connectCmd); setCmdCopied(true); setTimeout(() => setCmdCopied(false), 1600); }
    catch { showToast('error', '복사 실패 — 명령을 직접 선택해 복사하세요.'); }
  };

  const probe = async () => {
    try {
      const { tools } = await designFetch<{ tools: { name: string }[] }>('/oauth/mcp/probe', { method: 'POST', body: '{}' });
      showToast('success', `MCP 정상 — 도구: ${tools.map((t) => t.name).join(', ') || '(없음)'}`);
    } catch (e) { showToast('error', e instanceof Error ? e.message : 'MCP 점검 실패'); }
  };

  const doDisconnect = async () => {
    try { await designFetch('/oauth', { method: 'DELETE' }); await refreshStatus(); showToast('success', '연결 해제됨'); }
    catch (e) { showToast('error', e instanceof Error ? e.message : '해제 실패'); }
  };

  const runPreview = async () => {
    if (!parsed.projectId || !parsed.file) { showToast('error', '프로젝트 링크와 .dc.html 파일이 감지되지 않았습니다.'); return; }
    setError(null); setPreviewing(true); setPreview(null);
    try {
      const p = await designFetch<Preview>('/import/preview', { method: 'POST', body: JSON.stringify({ projectId: parsed.projectId, file: parsed.file }) });
      setPreview(p);
    } catch (e) { setError(e instanceof Error ? e.message : '미리보기 실패'); }
    finally { setPreviewing(false); }
  };

  const connected = status?.connected === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="mb-4 flex items-start gap-3">
          <div className="text-3xl">🎨</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Claude Design 반영</h3>
            <p className="mt-1 text-sm text-gray-600"><span className="font-semibold">{tenant.name}</span> ({tenant.slug}) — 완성된 시안을 콘솔에서 가져와 반영합니다.</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {/* ── 1. 연결 ─────────────────────────────────────────── */}
        <div className="mb-5 rounded-xl border border-gray-200 p-4">
          <div className="mb-2 text-xs font-semibold text-gray-500">1. Claude Design 연결 (계정당 1회)</div>
          {status === null ? (
            <div className="text-sm text-gray-400">상태 확인 중…</div>
          ) : connected ? (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <span>✓ Claude Design 연결됨</span>
                {status.updatedAt && <span className="text-xs font-normal text-gray-400">({new Date(status.updatedAt).toLocaleString('ko-KR')})</span>}
              </div>
              {status.scope && <div className="mt-0.5 text-[11px] text-gray-500">scope: {status.scope}</div>}
              <div className="mt-2 flex gap-2">
                <button onClick={probe} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">MCP 점검</button>
                <button onClick={doDisconnect} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600">연결 해제</button>
              </div>
            </div>
          ) : connectCmd ? (
            <div>
              <p className="mb-2 text-xs text-gray-600">아래 명령을 <b>로컬 PowerShell</b>에 붙여넣어 1번 실행하세요(전체 경로라 <b>아무 폴더</b>에서나 됩니다). 브라우저에서 claude.ai 로그인/동의 후 자동으로 연결됩니다.</p>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 font-mono text-[11px] text-gray-100">{connectCmd}</code>
                <button onClick={copyCmd} className="shrink-0 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50">{cmdCopied ? '복사됨 ✓' : '복사'}</button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600"><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />연결 대기 중… (명령 실행 후 자동 감지, 15분 내)</div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs text-gray-600">Anthropic 의 Claude Design 인증은 로컬(loopback) 전용이라, 1회용 명령을 로컬에서 실행해 연결합니다.</p>
              <button onClick={startConnect} disabled={connecting} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
                {connecting ? '준비 중…' : 'claude.ai 로그인 (연결)'}
              </button>
            </div>
          )}
        </div>

        {/* ── 2. 가져오기(미리보기) ────────────────────────────── */}
        <div className={`rounded-xl border border-gray-200 p-4 ${connected ? '' : 'opacity-50'}`}>
          <div className="mb-2 text-xs font-semibold text-gray-500">2. 시안 가져오기 → 구조 미리보기 {connected ? '' : '(연결 후 사용 가능)'}</div>

          <label className="mb-1 block text-xs font-medium text-gray-700">Claude Design 포인터 붙여넣기 (프로젝트 링크 + .dc.html)</label>
          <textarea
            value={raw} onChange={(e) => setRaw(e.target.value)} rows={5} disabled={!connected}
            placeholder={'https://claude.ai/design/p/…?file=…\n\nImplement: `…리뉴얼.dc.html`\n→ tenant: ' + tenant.slug}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-[11px] leading-relaxed outline-none focus:border-blue-500 disabled:bg-gray-50"
          />
          {raw.trim() && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700 space-y-0.5">
              <div>프로젝트: {parsed.projectId ? <span className="font-mono text-gray-900">{parsed.projectId}</span> : <span className="text-red-600">감지 실패</span>}</div>
              <div>파일: {parsed.file ? <span className="font-medium text-gray-900">{parsed.file}</span> : <span className="text-red-600">감지 실패</span>}</div>
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-700">반영 방식</label>
            <div className="flex gap-2">
              {(['전면개편', '부분추가'] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} disabled={!connected}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${mode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {m}{m === '전면개편' ? ' (백업 후 초기화)' : ''}
                </button>
              ))}
            </div>
          </div>

          <button onClick={runPreview} disabled={!connected || previewing || !parsed.projectId} className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {previewing ? '가져오는 중… (MCP)' : '가져오기 (미리보기 · 쓰기 없음)'}
          </button>

          {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div>}

          {preview && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] text-gray-500">캔버스 {(preview.htmlLength / 1024).toFixed(1)}KB · 화면 {preview.pages.length}개 · {preview.toolNote}</div>
              {preview.imports.length > 0 && <div className="text-[11px] text-gray-500">공통: {preview.imports.join(', ')}</div>}
              {preview.pages.map((p) => (
                <div key={p.slug} className="rounded-lg border border-gray-200 px-3 py-2">
                  <div className="text-xs font-semibold text-gray-800">{p.label || p.slug} <span className="font-mono text-[10px] text-gray-400">/{p.slug}</span></div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.sections.map((s, i) => (
                      <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${s.needsBlock ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                        {s.needsBlock ? `⚠ ${s.note || 'NEEDS_BLOCK'}` : s.blockType}
                      </span>
                    ))}
                    {p.sections.length === 0 && <span className="text-[10px] text-red-500">섹션 없음</span>}
                  </div>
                </div>
              ))}
              {preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 space-y-0.5">
                  {preview.warnings.map((w, i) => <div key={i}>• {w}</div>)}
                </div>
              )}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                구조 확인용 미리보기입니다(쓰기 없음). 실제 반영(테마+페이지 적용)은 이 미리보기가 실측으로 확인되면 이어서 활성화합니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
