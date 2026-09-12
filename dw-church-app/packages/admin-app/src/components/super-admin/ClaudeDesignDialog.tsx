/**
 * ClaudeDesignDialog — 콘솔에서 Claude Design Project archive(zip)를 업로드해
 * 테넌트에 반영한다. 흐름: zip 업로드 → 브라우저 unzip → 메인 .dc.html + _tokens.css
 * 추출 → 서버 analyze(LLM 매핑, 쓰기 없음) → 화면·블록 리뷰 → 반영(테마+페이지+이미지 R2,
 * 백업 먼저). 서버는 mdemmauschurch 로 락(가드)되어 있다.
 *
 * (Anthropic 의 Claude Design MCP OAuth 는 외부 클라이언트용으로 막혀 있어 자동 fetch 는
 * 불가 — 검증됨. 그래서 zip 업로드 방식. LLM 매핑은 Anthropic API 크레딧을 사용한다.)
 */
import { useEffect, useRef, useState } from 'react';
import { unzipSync, strFromU8 } from 'fflate';
import { useToast } from '../index';
import { useAuthStore } from '../../stores/auth';

interface Props {
  tenant: { id: string; slug: string; name: string };
  open: boolean;
  onClose: () => void;
}
type Mode = '전면개편' | '부분추가';
const APPLY_ALLOWED = new Set(['mdemmauschurch']);

interface SectionSpec { blockType: string; props: Record<string, unknown> }
interface PageSpec { name: string; slug: string; sections: SectionSpec[] }
interface ImportSpec {
  styleguide: { colors: Record<string, string>; fonts?: Record<string, string> };
  pages: PageSpec[];
  warnings: string[];
}
interface ApplyResult { pages: { slug: string; sections: number }[]; images: number; backupId: string; warnings: string[] }
interface JobData { status: string; step: string; error?: string; spec?: ImportSpec; result?: ApplyResult }

export function ClaudeDesignDialog({ tenant, open, onClose }: Props) {
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);

  const [canvasHtml, setCanvasHtml] = useState('');
  const [tokensCss, setTokensCss] = useState('');
  const [zipInfo, setZipInfo] = useState<{ canvas: string; screens: number; hasTokens: boolean } | null>(null);
  const [mode, setMode] = useState<Mode>('전면개편');
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState('');
  const [spec, setSpec] = useState<ImportSpec | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef(false);

  useEffect(() => {
    if (!open) return;
    setCanvasHtml(''); setTokensCss(''); setZipInfo(null); setMode('전면개편');
    setBusy(null); setStep(''); setSpec(null); setResult(null); setError(null);
    abort.current = false;
    return () => { abort.current = true; };
  }, [open, tenant.id]);

  if (!open) return null;

  const applyAllowed = APPLY_ALLOWED.has(tenant.slug);

  const baseUrl = (() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'admin.truelight.app') return 'https://api-server-production-c612.up.railway.app';
    return host.startsWith('admin.') ? `https://api.${host.replace('admin.', '')}` : (import.meta.env.VITE_API_BASE_URL as string) || '';
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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const pollJob = async <T,>(jobId: string, pick: (d: JobData) => T | null): Promise<T> => {
    for (let i = 0; i < 300 && !abort.current; i++) {
      const d = await designFetch<JobData>(`/import/jobs/${jobId}`);
      setStep(d.step || '');
      if (d.status === 'error') throw new Error(d.error || '작업 실패');
      if (d.status === 'done') {
        const v = pick(d);
        if (v) return v;
        throw new Error('결과 없음');
      }
      await sleep(2000);
    }
    throw new Error('시간 초과 또는 취소');
  };

  const onZip = async (file: File) => {
    setError(null); setSpec(null); setResult(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const entries = unzipSync(buf);
      let mainName = '';
      let mainHtml = '';
      let mainScreens = -1;
      let css = '';
      for (const [path, bytes] of Object.entries(entries)) {
        const base = path.split('/').pop() || path;
        if (/\.dc\.html$/i.test(base)) {
          const html = strFromU8(bytes);
          const screens = (html.match(/data-(?:screen-label|page-slug)\s*=/gi) || []).length;
          if (screens > mainScreens) { mainScreens = screens; mainHtml = html; mainName = base; }
        } else if (/_tokens\.css$/i.test(base)) {
          css = strFromU8(bytes);
        }
      }
      if (!mainHtml) throw new Error('zip 안에서 .dc.html 캔버스를 못 찾았습니다.');
      setCanvasHtml(mainHtml);
      setTokensCss(css);
      const struct = await designFetch<{ screens: unknown[] }>('/import/structure', { method: 'POST', body: JSON.stringify({ canvasHtml: mainHtml }) });
      setZipInfo({ canvas: mainName, screens: struct.screens.length, hasTokens: css.length > 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'zip 처리 실패');
      setZipInfo(null);
    }
  };

  const analyze = async () => {
    if (!canvasHtml) return;
    setError(null); setResult(null); setSpec(null); setBusy('analyze');
    try {
      const { jobId } = await designFetch<{ jobId: string }>('/import/analyze', { method: 'POST', body: JSON.stringify({ canvasHtml, tokensCss, churchName: tenant.name }) });
      const got = await pollJob(jobId, (d) => d.spec ?? null);
      setSpec(got);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 실패');
    } finally {
      setBusy(null); setStep('');
    }
  };

  const apply = async () => {
    if (!spec || !applyAllowed) return;
    setError(null); setResult(null); setBusy('apply');
    try {
      const { jobId } = await designFetch<{ jobId: string }>('/import/apply', { method: 'POST', body: JSON.stringify({ tenantSlug: tenant.slug, canvasHtml, tokensCss, churchName: tenant.name, mode, spec }) });
      const got = await pollJob(jobId, (d) => d.result ?? null);
      setResult(got);
      showToast('success', 'Claude Design 반영 완료');
    } catch (e) {
      setError(e instanceof Error ? e.message : '반영 실패');
    } finally {
      setBusy(null); setStep('');
    }
  };

  const sectionTotal = result ? result.pages.reduce((a, p) => a + p.sections, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="mb-4 flex items-start gap-3">
          <div className="text-3xl">🎨</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Claude Design 반영</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{tenant.name}</span> ({tenant.slug}) — Project archive(zip)를 올려 반영합니다.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {!applyAllowed ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            현재 반영은 안전을 위해 mdemmauschurch 에만 가능합니다 (분석/미리보기는 가능).
          </div>
        ) : null}

        {/* 1. zip 업로드 */}
        <div className="mb-4 rounded-xl border border-gray-200 p-4">
          <div className="mb-2 text-xs font-semibold text-gray-500">1. Claude Design Project archive (zip) 업로드</div>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onZip(f); }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-black"
          />
          {zipInfo ? (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
              캔버스: <span className="font-medium text-gray-900">{zipInfo.canvas}</span> · 화면 {zipInfo.screens}개 · 토큰 {zipInfo.hasTokens ? '있음' : '없음(기본값)'}
            </div>
          ) : null}
        </div>

        {/* 2. 분석 */}
        <div className={`mb-4 rounded-xl border border-gray-200 p-4 ${canvasHtml ? '' : 'opacity-50'}`}>
          <div className="mb-2 text-xs font-semibold text-gray-500">2. 분석 — 화면을 블록으로 매핑 (쓰기 없음)</div>
          <button onClick={analyze} disabled={!canvasHtml || busy !== null} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy === 'analyze' ? `분석 중… ${step}` : '분석(생성) 실행'}
          </button>
          {spec ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1 text-[10px]">
                {Object.entries(spec.styleguide.colors).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5">
                    <span className="inline-block h-3 w-3 rounded" style={{ background: v }} />
                    {k}
                  </span>
                ))}
              </div>
              {spec.pages.map((p) => (
                <div key={p.slug} className="rounded-lg border border-gray-200 px-3 py-2">
                  <div className="text-xs font-semibold text-gray-800">
                    {p.name} <span className="font-mono text-[10px] text-gray-400">/{p.slug}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.sections.map((s, i) => (
                      <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${s.props._unknownBlock ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                        {s.blockType}
                      </span>
                    ))}
                    {p.sections.length === 0 ? <span className="text-[10px] text-red-500">블록 없음</span> : null}
                  </div>
                </div>
              ))}
              {spec.warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 space-y-0.5">
                  {spec.warnings.slice(0, 8).map((w, i) => (<div key={i}>{w}</div>))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* 3. 반영 */}
        <div className={`rounded-xl border border-gray-200 p-4 ${spec && applyAllowed ? '' : 'opacity-50'}`}>
          <div className="mb-2 text-xs font-semibold text-gray-500">3. 반영 — 테마 + 페이지 + 이미지(R2), 백업 먼저</div>
          <div className="mb-3 flex gap-2">
            {(['전면개편', '부분추가'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={!spec || !applyAllowed}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${mode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {m === '전면개편' ? '전면개편 (백업 후 초기화)' : '부분추가'}
              </button>
            ))}
          </div>
          <button onClick={apply} disabled={!spec || !applyAllowed || busy !== null} className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {busy === 'apply' ? `반영 중… ${step}` : `${tenant.slug} 에 반영`}
          </button>
          {result ? (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-800">
              <div>반영 완료 — 페이지 {result.pages.length}개, 섹션 {sectionTotal}개, 이미지 {result.images}개(R2). 백업 {result.backupId.slice(0, 8)}</div>
              {result.warnings.length > 0 ? (
                <div className="mt-1 text-amber-700">
                  {result.warnings.map((w, i) => (<div key={i}>{w}</div>))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div> : null}
      </div>
    </div>
  );
}
