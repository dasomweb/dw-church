/**
 * MigrationDialog — 사이트 구성(디자인) 마이그레이션. 3단계: 분석 → 리뷰 → 적용.
 *
 * 역할 분담(대표님 확정):
 *  - 메인 마이그레이션 = **디자인 구성만.** 공개 사이트를 크롤(Chromium, 플랫폼
 *    무관)해서 각 페이지가 정적인지 / 기능형(게시판·앨범·설교 등)인지 판단하고,
 *    정적은 레이아웃 블록으로 재현, 기능형은 해당 위치에 맞는 데이터 블록(주보→
 *    주보 블록, 앨범→앨범 블록…)을 배치한다. 구조(메뉴·기본정보·SEO)까지.
 *  - **동적 데이터(설교·게시판·앨범 글/사진)는 여기서 안 가져온다.** 각 콘텐츠
 *    관리 페이지의 "📥 URL에서 가져오기"(ContentMigrationButton → /migrate-content)
 *    가 타입별로 알아서 가져오고, 여기서 놓아둔 데이터 블록에 렌더된다.
 *
 * 그래서 이 다이얼로그는 include='static'(구조+디자인+데이터블록 셸)만 적용한다.
 * 분석(apply:false)으로 먼저 판단 결과를 보여주고, 확인 후 적용한다.
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../index';

interface MigrationDialogProps {
  tenant: { id: string; slug: string; name: string };
  open: boolean;
  onClose: () => void;
  onCompleted?: (result: { applyResult: ApplyResult }) => void;
}

interface DetectedCounts {
  menus: number; pages: number;
  staticPages?: number; dynamicPages?: number;
  images: number; seoFieldsFilled?: number;
}

/** 실제 DB에 적용된 수 — 서버 applyResult. */
interface ApplyResult {
  images: number; settings: number; staff: number; sermons: number;
  bulletins: number; columns: number; events: number; albums: number;
  history: number; boards: number; pages: number; worshipTimes: number; menus: number;
}

interface PageLite { pageSlug: string; pageKind?: 'static' | 'dynamic'; moduleType?: string }

// GET /jobs/:id — polled while the background crawl/apply runs. status flows
// draft→extracting→…→classified (dry-run done) / done (applied) / failed.
interface JobLite {
  status: string;
  classifiedData?: { pageContents?: PageLite[]; menus?: unknown[]; images?: unknown[] };
  applyResult?: ApplyResult;
  errorMessage?: string | null;
}

// 데이터 블록이 연결되는 콘텐츠 모듈 라벨(리뷰 표시용).
const MODULE_LABEL: Record<string, string> = {
  bulletins: '주보', sermons: '설교', albums: '앨범', columns: '칼럼',
  events: '행사·공지', staff: '교역자', history: '연혁', boards: '게시판',
};
// 페이지 슬러그 → 사람이 읽는 이름(대략).
const SLUG_LABEL: Record<string, string> = {
  home: '홈', welcome: '환영/인사말', vision: '비전', directions: '오시는 길',
  worship: '예배 안내', newcomer: '새가족', mission: '선교', about: '교회 소개',
};

type Phase = 'input' | 'review' | 'done';

export function MigrationDialog({ tenant, open, onClose, onCompleted }: MigrationDialogProps) {
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>('input');
  const [sourceUrl, setSourceUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [counts, setCounts] = useState<DetectedCounts | null>(null);
  const [pages, setPages] = useState<PageLite[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('input'); setSourceUrl(''); setError(null);
    setJobId(null); setCounts(null); setPages([]); setApplyResult(null);
  }, [open, tenant.id]);

  if (!open) return null;

  // 크롤은 60초+ 걸려 Cloudflare(~100s)를 넘길 수 있어 Railway 직접 도메인으로.
  const baseUrl = (() => {
    const override = (import.meta.env.VITE_MIGRATION_DIRECT_BASE_URL as string)
      || (import.meta.env.VITE_PLANNER_DIRECT_BASE_URL as string) || '';
    if (override) return override;
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'admin.truelight.app') return 'https://api-server-production-c612.up.railway.app';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'Content-Type': 'application/json',
  };

  // 크롤/적용은 서버에서 백그라운드로 돌고(수 분 소요) HTTP 요청을 붙잡지 않는다.
  // 그래서 jobId 를 받은 뒤 GET /jobs/:id 를 폴링해 완료를 기다린다. 요청이 끊겨도
  // 잡은 서버에서 계속 진행되므로 큰 사이트도 타임아웃 없이 결과를 받는다.
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const pollJob = async (id: string, terminal: string[], maxMs = 15 * 60 * 1000): Promise<JobLite> => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await sleep(6000);
      try {
        const res = await fetch(`${baseUrl}/api/v1/migration/jobs/${id}`, { headers: authHeaders });
        if (!res.ok) continue; // 일시적 오류 — 계속 폴링
        const body = await res.json() as { data?: JobLite };
        const job = body.data;
        if (job && terminal.includes(job.status)) return job;
      } catch { /* 네트워크 흔들림 — 계속 폴링 */ }
    }
    throw new Error('시간이 너무 오래 걸립니다. 잠시 후 [마이그레이션 기록]에서 상태를 확인하세요.');
  };

  // ── STEP 1 → 2 : 분석(dry-run). 구조만 판단, 적용 안 함. 백그라운드 + 폴링. ──
  const analyze = async () => {
    const url = sourceUrl.trim();
    if (!url) { showToast('error', '사이트 URL 을 입력하세요.'); return; }
    setRunning(true); setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/migration/migrate-url`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ sourceUrl: url, tenantSlug: tenant.slug, include: 'static', useLlm: true, apply: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const { data } = await res.json() as { data: { jobId: string } };
      setJobId(data.jobId);
      const job = await pollJob(data.jobId, ['classified', 'done', 'failed']);
      if (job.status === 'failed') throw new Error(job.errorMessage || '분석 실패');
      const cd = job.classifiedData ?? {};
      const pc = cd.pageContents ?? [];
      setPages(pc);
      setCounts({ pages: pc.length, menus: cd.menus?.length ?? 0, images: cd.images?.length ?? 0 });
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 실패');
    } finally {
      setRunning(false);
    }
  };

  // ── STEP 2 → 3 : 적용(구조+디자인+데이터블록 셸만). 재크롤 없이 저장된 job 사용. ──
  const apply = async () => {
    if (!jobId) return;
    setRunning(true); setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/migration/jobs/${jobId}/apply`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ include: 'static' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      await res.json(); // { jobId, async } — 결과는 폴링으로.
      const job = await pollJob(jobId, ['done', 'failed']);
      if (job.status === 'failed' || !job.applyResult) throw new Error(job.errorMessage || '적용 실패');
      setApplyResult(job.applyResult);
      setPhase('done');
      onCompleted?.({ applyResult: job.applyResult });
    } catch (err) {
      setError(err instanceof Error ? err.message : '적용 실패');
    } finally {
      setRunning(false);
    }
  };

  const staticPages = pages.filter((p) => p.pageKind !== 'dynamic');
  const dynamicPages = pages.filter((p) => p.pageKind === 'dynamic');
  const nothingFound = counts && (counts.pages ?? 0) === 0;
  const slugLabel = (s: string) => SLUG_LABEL[s] ?? s;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">🚚</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">사이트 구성 가져오기</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{tenant.name}</span> — 기존 사이트의 <strong>페이지 구성·디자인</strong>을 분석해 가져옵니다.
            </p>
          </div>
        </div>

        <StepBar phase={phase} />

        {/* ── STEP 1: 입력 ── */}
        {phase === 'input' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                기존 사이트 URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                disabled={running} placeholder="https://oldchurch.com"
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              />
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-700 leading-relaxed space-y-2">
              <p>
                <strong className="text-gray-900">가져오는 것 = 사이트 "구성".</strong> 각 페이지가 정적인지 /
                기능형(게시판·앨범·설교 등)인지 판단해서, 정적 페이지는 레이아웃 그대로 재현하고,
                기능형 페이지에는 <strong>해당 위치에 맞는 기능 블록(주보·앨범·설교…)을 배치</strong>합니다.
                교회 기본정보·메뉴·SEO도 함께 가져옵니다. 이미지는 R2에 자동 업로드.
              </p>
              <p className="rounded-md bg-blue-50 px-2.5 py-2 text-blue-800">
                <strong>설교·주보·앨범·게시판 등 "콘텐츠 데이터"는 여기서 안 가져옵니다.</strong> 각 콘텐츠 관리
                페이지의 <strong>[📥 URL에서 가져오기]</strong>로 타입별로 가져오세요. 여기서 놓아둔 기능 블록에 자동으로 표시됩니다.
              </p>
              <p><strong>배너 슬라이더</strong>도 제외됩니다(마이그 후 [배너 관리]에서 등록).</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} disabled={running}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                취소
              </button>
              <button onClick={analyze} disabled={running || !sourceUrl.trim()}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50">
                {running ? '분석 중…' : '분석하기'}
              </button>
            </div>
            {running && (
              <p className="text-center text-xs text-gray-500 animate-pulse">
                사이트를 분석하는 중입니다. 페이지가 많으면 1~3분 걸릴 수 있습니다.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: 리뷰 (판단 결과) ── */}
        {phase === 'review' && counts && (
          <div className="space-y-3">
            {nothingFound ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-xs text-amber-900 leading-relaxed">
                <strong>가져올 페이지를 찾지 못했습니다.</strong> 원본 사이트가 크롤러를 차단(WAF)했거나 내용을
                읽지 못했을 수 있습니다. 실제 페이지를 하나도 읽지 못하면 임의로 페이지를 만들어내지 않습니다.
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600">
                  아래 구성으로 가져옵니다. 각 페이지가 정적/기능형으로 올바르게 판단됐는지 확인하세요.
                </p>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="페이지" value={counts.pages} />
                  <Stat label="메뉴" value={counts.menus} />
                  <Stat label="이미지" value={counts.images} />
                </div>

                {/* 정적 페이지 — 디자인 재현 */}
                {staticPages.length > 0 && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-700">
                      정적 페이지 · 디자인 재현 ({staticPages.length})
                    </div>
                    <div className="max-h-32 overflow-y-auto divide-y divide-gray-50">
                      {staticPages.map((p) => (
                        <div key={p.pageSlug} className="px-3 py-1.5 text-[13px] text-gray-800">{slugLabel(p.pageSlug)}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 기능형 페이지 — 데이터 블록 배치 */}
                {dynamicPages.length > 0 && (
                  <div className="rounded-lg border border-indigo-200 overflow-hidden">
                    <div className="bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-800">
                      기능형 페이지 · 기능 블록 배치 ({dynamicPages.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-indigo-50">
                      {dynamicPages.map((p) => (
                        <div key={p.pageSlug} className="flex items-center justify-between px-3 py-1.5 text-[13px]">
                          <span className="text-gray-800">{slugLabel(p.pageSlug)}</span>
                          <span className="text-indigo-700 font-medium">
                            → {MODULE_LABEL[p.moduleType ?? ''] ?? '기능'} 블록
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-indigo-50/50 px-3 py-1.5 text-[10.5px] text-indigo-700">
                      데이터(글·사진)는 각 모듈의 [📥 URL에서 가져오기]로 채우면 이 블록에 표시됩니다.
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setPhase('input')} disabled={running}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                ← 다시 분석
              </button>
              <button onClick={apply} disabled={running || !!nothingFound}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50">
                {running ? '적용 중…' : '이 구성으로 적용'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 완료 (실제 적용 수) ── */}
        {phase === 'done' && applyResult && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="text-sm font-bold text-green-900">✅ 구성 적용 완료 — 실제 저장된 수</h4>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-green-900">
                <ResultRow label="페이지(섹션)" value={applyResult.pages} />
                <ResultRow label="메뉴" value={applyResult.menus} />
                <ResultRow label="예배시간" value={applyResult.worshipTimes} />
                <ResultRow label="연혁" value={applyResult.history} />
                <ResultRow label="교회정보" value={applyResult.settings} />
                <ResultRow label="이미지(R2)" value={applyResult.images} />
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
              <strong>다음 단계 — 콘텐츠 데이터 채우기.</strong> 좌측 메뉴의 설교·주보·앨범·게시판 등 각 관리
              페이지에서 <strong>[📥 URL에서 가져오기]</strong>로 데이터를 가져오면, 방금 배치된 기능 블록에 표시됩니다.
              배너 슬라이더는 [배너 관리]에서 등록하세요.
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              닫기
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 space-y-3">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <h4 className="text-sm font-bold text-red-900">❌ {phase === 'review' ? '적용 실패' : '분석 실패'}</h4>
              <p className="mt-1.5 text-xs text-red-800 leading-relaxed">{error}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setError(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                다시 시도
              </button>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBar({ phase }: { phase: Phase }) {
  const steps: { key: Phase; label: string }[] = [
    { key: 'input', label: '1. 입력' },
    { key: 'review', label: '2. 리뷰' },
    { key: 'done', label: '3. 적용' },
  ];
  const idx = steps.findIndex((s) => s.key === phase);
  return (
    <div className="mb-4 flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div key={s.key} className="flex-1">
          <div className={`h-1 rounded-full ${i <= idx ? 'bg-blue-500' : 'bg-gray-200'}`} />
          <div className={`mt-1 text-[10px] ${i <= idx ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 py-2">
      <div className="text-lg font-bold text-gray-900 tabular-nums">{value ?? 0}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between bg-white/60 px-2 py-1 rounded">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
