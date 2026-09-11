/**
 * MigrationDialog — 3단계 마이그레이션 (분류 → 리뷰 → 적용).
 *
 * 재설계(2026-09): 예전엔 URL 넣으면 곧바로 정적 페이지만 적용하고 "탐지 수"를
 * 완료라며 보여줬다(실속 없음 + 동적 콘텐츠 누락). 이제는:
 *
 *   1. 입력   — 기존 사이트 URL(+YouTube) → 서버가 크롤/분류만 실행(apply:false).
 *              WordPress면 WP REST로 글 아카이브를 통째로 자동 수집.
 *   2. 리뷰   — 정적 페이지 / 동적 콘텐츠(모듈별)를 탐지 수와 함께 보여주고,
 *              무엇을 적용할지 타입별 체크박스로 확정(기본 전체).
 *   3. 적용   — 확정한 항목만 서버가 저장하고, "실제 적용 수"(applyResult)를 보고.
 *
 * 정적 페이지는 블록으로, 동적 리스트 페이지(주보·앨범·설교·칼럼·행사·교역자·
 * 게시판)는 해당 콘텐츠 모듈로 들어가고 페이지엔 데이터 블록으로 표시된다.
 *
 * Used from SuperAdminDashboardV2 의 "🚚 마이그레이션". 슈퍼어드민 전용(초기 1회 셋업).
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

/** 탐지 수(detected) — 실제 적용 수(applyResult)와 구분된다. */
interface DetectedCounts {
  sermons: number; bulletins: number; columns: number; events: number;
  albums: number; staff: number; history: number; boards: number;
  boardPosts?: number; menus: number; pages: number;
  staticPages?: number; dynamicPages?: number;
  images: number; youtubeVideos: number; wpPostCount?: number;
  seoFieldsFilled?: number;
}

/** 실제 DB에 적용된 수 — 서버 applyResult. */
interface ApplyResult {
  images: number; settings: number; staff: number; sermons: number;
  bulletins: number; columns: number; events: number; albums: number;
  history: number; boards: number; pages: number; worshipTimes: number; menus: number;
}

interface ClassifyResponse {
  data: { jobId: string; applied: false; wordpress?: boolean; classifiedCounts: DetectedCounts; warnings?: string[] };
}
interface ApplyResponse {
  data: { jobId: string; applied: true; applyResult: ApplyResult; appliedTypes: string[]; classifiedCounts: DetectedCounts };
}

// 정적 번들(서버 STATIC_INCLUDE 와 동일) — 하나의 토글로 묶는다.
const STATIC_INCLUDE = ['settings', 'pages', 'worshipTimes', 'history', 'menus'] as const;
// 동적 모듈 토글 — 각자 자기 IncludeKey.
const DYNAMIC_TOGGLES = [
  { key: 'sermons', label: '설교', field: 'sermons' as const },
  { key: 'bulletins', label: '주보', field: 'bulletins' as const },
  { key: 'columns', label: '칼럼', field: 'columns' as const },
  { key: 'events', label: '행사·공지', field: 'events' as const },
  { key: 'albums', label: '앨범·갤러리', field: 'albums' as const },
  { key: 'staff', label: '교역자', field: 'staff' as const },
  { key: 'boards', label: '게시판', field: 'boards' as const },
] as const;
type DynKey = typeof DYNAMIC_TOGGLES[number]['key'];

type Phase = 'input' | 'review' | 'done';

export function MigrationDialog({ tenant, open, onClose, onCompleted }: MigrationDialogProps) {
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>('input');
  const [sourceUrl, setSourceUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLlm, setUseLlm] = useState(true);

  // 분류 결과(리뷰용).
  const [jobId, setJobId] = useState<string | null>(null);
  const [counts, setCounts] = useState<DetectedCounts | null>(null);
  const [isWordPress, setIsWordPress] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  // 적용 대상 선택. static = 정적 번들, 나머지는 동적 모듈.
  const [includeStatic, setIncludeStatic] = useState(true);
  const [includeDyn, setIncludeDyn] = useState<Record<DynKey, boolean>>(
    () => Object.fromEntries(DYNAMIC_TOGGLES.map((t) => [t.key, true])) as Record<DynKey, boolean>,
  );
  // 적용 결과.
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [appliedWarnings, setAppliedWarnings] = useState<string[]>([]);

  // 다른 테넌트로 열릴 때마다 초기화.
  useEffect(() => {
    if (!open) return;
    setPhase('input');
    setSourceUrl('');
    setYoutubeUrl('');
    setError(null);
    setUseLlm(true);
    setJobId(null);
    setCounts(null);
    setIsWordPress(false);
    setWarnings([]);
    setIncludeStatic(true);
    setIncludeDyn(Object.fromEntries(DYNAMIC_TOGGLES.map((t) => [t.key, true])) as Record<DynKey, boolean>);
    setApplyResult(null);
    setAppliedWarnings([]);
  }, [open, tenant.id]);

  if (!open) return null;

  // 분류(크롤)는 60~120s+ 걸린다 → Cloudflare(~100s origin 타임아웃)를 우회해
  // Railway 직접 도메인으로. 적용(DB쓰기)도 같은 base 로 일관.
  const baseUrl = (() => {
    const override = (import.meta.env.VITE_MIGRATION_DIRECT_BASE_URL as string)
      || (import.meta.env.VITE_PLANNER_DIRECT_BASE_URL as string) || '';
    if (override) return override;
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'admin.truelight.app') {
      return 'https://api-server-production-c612.up.railway.app';
    }
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken ?? ''}`,
    'Content-Type': 'application/json',
  };

  // ── STEP 1 → 2 : 분류(dry-run). 적용하지 않고 classifiedData 만 받아 리뷰. ──
  const classify = async () => {
    const url = sourceUrl.trim();
    if (!url) { showToast('error', '사이트 URL 을 입력하세요.'); return; }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/migration/migrate-url`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sourceUrl: url,
          tenantSlug: tenant.slug,
          youtubeChannelUrl: youtubeUrl.trim() || undefined,
          include: 'all',   // 분류는 전체 탐지 → 리뷰에서 취사선택
          useLlm,
          apply: false,     // ← 분류만. 적용은 리뷰 확정 후.
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const body = await res.json() as ClassifyResponse;
      const c = body.data.classifiedCounts;
      setJobId(body.data.jobId);
      setCounts(c);
      setIsWordPress(!!body.data.wordpress);
      setWarnings(body.data.warnings ?? []);
      // 탐지 0인 동적 타입은 기본 해제(적용해도 의미 없음). 정적은 항상 기본 on.
      setIncludeDyn(
        Object.fromEntries(DYNAMIC_TOGGLES.map((t) => [t.key, (c[t.field] ?? 0) > 0])) as Record<DynKey, boolean>,
      );
      setIncludeStatic((c.pages ?? 0) > 0 || (c.menus ?? 0) > 0 || (c.seoFieldsFilled ?? 0) > 0);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 실패');
    } finally {
      setRunning(false);
    }
  };

  // ── STEP 2 → 3 : 확정한 include 로 적용. 재크롤 없이 저장된 job 데이터 사용. ──
  const apply = async () => {
    if (!jobId) return;
    const include: string[] = [
      ...(includeStatic ? STATIC_INCLUDE : []),
      ...DYNAMIC_TOGGLES.filter((t) => includeDyn[t.key]).map((t) => t.key),
    ];
    if (include.length === 0) { showToast('error', '적용할 항목을 하나 이상 선택하세요.'); return; }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/migration/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ include }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const body = await res.json() as ApplyResponse;
      setApplyResult(body.data.applyResult);
      setAppliedWarnings(warnings);
      setPhase('done');
      onCompleted?.({ applyResult: body.data.applyResult });
    } catch (err) {
      setError(err instanceof Error ? err.message : '적용 실패');
    } finally {
      setRunning(false);
    }
  };

  const nothingDetected = counts
    && (counts.pages ?? 0) === 0
    && DYNAMIC_TOGGLES.every((t) => (counts[t.field] ?? 0) === 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">🚚</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">기존 사이트 마이그레이션</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{tenant.name}</span> — 분석 후 무엇을 가져올지 확인하고 적용합니다.
            </p>
          </div>
        </div>

        {/* 단계 표시 */}
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">YouTube 채널 URL (선택)</label>
              <input
                type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={running} placeholder="https://www.youtube.com/@yourchannel"
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              />
              <p className="mt-1 text-[10px] text-gray-500">지정하면 설교 영상 메타데이터를 함께 수집합니다.</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-700 leading-relaxed space-y-2">
              <p>
                <strong className="text-gray-900">이렇게 가져옵니다.</strong> 정적 페이지(인사말·소개·오시는 길)는
                레이아웃 블록 그대로, 동적 리스트(주보·앨범·설교·칼럼·행사·교역자·게시판)는 각 <strong>콘텐츠 모듈</strong>로
                넣고 페이지엔 데이터 블록으로 표시합니다. WordPress면 글 아카이브를 <strong>자동 전량 수집(WP REST)</strong>합니다.
              </p>
              <p>모든 이미지는 R2에 자동 업로드(자가호스팅)됩니다. <strong>배너 슬라이더</strong>는 가져오지 않습니다(마이그 후 [배너 관리]에서 등록).</p>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} disabled={running} />
              <span className="text-[11px] text-gray-700">
                🤖 AI 분석 사용 — 페이지를 읽어 정적/동적을 판정하고 레이아웃을 재현합니다.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} disabled={running}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                취소
              </button>
              <button onClick={classify} disabled={running || !sourceUrl.trim()}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50">
                {running ? '분석 중…' : '분석하기'}
              </button>
            </div>
            {running && (
              <p className="text-center text-xs text-gray-500 animate-pulse">
                사이트를 분석하는 중입니다. 페이지·글이 많으면 1~3분 걸릴 수 있습니다.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: 리뷰 ── */}
        {phase === 'review' && counts && (
          <div className="space-y-3">
            {isWordPress && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-900">
                ✅ WordPress 감지 — WP REST로 글 <strong>{counts.wpPostCount ?? 0}건</strong>을 자동 수집했습니다.
              </div>
            )}

            {nothingDetected ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-xs text-amber-900 leading-relaxed">
                <strong>가져올 콘텐츠를 찾지 못했습니다.</strong> 원본 사이트가 크롤러를 차단(WAF)했거나
                내용을 읽지 못했을 수 있습니다. 실제 페이지를 하나도 읽지 못한 경우 임의로 페이지를 만들어내지
                않습니다(정직한 빈 결과).
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600">가져올 항목을 확인하고 적용할 것만 선택하세요. 기본은 전체 선택입니다.</p>

                {/* 정적 */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-700">정적 페이지 · 기본정보</div>
                  <label className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                    <span className="flex items-center gap-2 text-sm text-gray-800">
                      <input type="checkbox" checked={includeStatic} onChange={(e) => setIncludeStatic(e.target.checked)} />
                      정적 페이지 · 교회정보 · 예배시간 · 연혁 · 메뉴
                    </span>
                    <span className="text-[11px] text-gray-500">
                      정적 {counts.staticPages ?? counts.pages}p · 메뉴 {counts.menus} · SEO {counts.seoFieldsFilled ?? 0}/7
                    </span>
                  </label>
                </div>

                {/* 동적 */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                    <span>동적 콘텐츠 (모듈로 저장 → 페이지에 데이터 블록으로 표시)</span>
                    {(counts.dynamicPages ?? 0) > 0 && <span className="text-gray-400">리스트 페이지 {counts.dynamicPages}개</span>}
                  </div>
                  {DYNAMIC_TOGGLES.map((t) => {
                    const n = counts[t.field] ?? 0;
                    const extra = t.key === 'boards' && counts.boardPosts ? ` (${counts.boardPosts}글)` : '';
                    return (
                      <label key={t.key}
                        className={`flex items-center justify-between px-3 py-2 border-t border-gray-100 ${n === 0 ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                        <span className="flex items-center gap-2 text-sm text-gray-800">
                          <input type="checkbox" checked={includeDyn[t.key]} disabled={n === 0}
                            onChange={(e) => setIncludeDyn((p) => ({ ...p, [t.key]: e.target.checked }))} />
                          {t.label}
                        </span>
                        <span className="text-[11px] tabular-nums text-gray-500">{n}건{extra}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between px-1 text-[11px] text-gray-500">
                  <span>이미지 {counts.images}장 · YouTube {counts.youtubeVideos}건</span>
                  <span>탐지 수입니다 — 실제 저장 수는 적용 후 표시됩니다.</span>
                </div>
              </>
            )}

            {warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 space-y-0.5">
                {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setPhase('input')} disabled={running}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                ← 다시 분석
              </button>
              <button onClick={apply} disabled={running || !!nothingDetected}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50">
                {running ? '적용 중…' : '선택 항목 적용'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 완료 (실제 적용 수) ── */}
        {phase === 'done' && applyResult && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="text-sm font-bold text-green-900">✅ 적용 완료 — 실제 저장된 수</h4>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-green-900">
                <ResultRow label="페이지" value={applyResult.pages} />
                <ResultRow label="설교" value={applyResult.sermons} />
                <ResultRow label="주보" value={applyResult.bulletins} />
                <ResultRow label="칼럼" value={applyResult.columns} />
                <ResultRow label="행사" value={applyResult.events} />
                <ResultRow label="앨범" value={applyResult.albums} />
                <ResultRow label="교역자" value={applyResult.staff} />
                <ResultRow label="연혁" value={applyResult.history} />
                <ResultRow label="게시판" value={applyResult.boards} />
                <ResultRow label="메뉴" value={applyResult.menus} />
                <ResultRow label="예배시간" value={applyResult.worshipTimes} />
                <ResultRow label="이미지(R2)" value={applyResult.images} />
              </div>
            </div>
            {appliedWarnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 space-y-0.5">
                {appliedWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900">
              <strong>배너 슬라이더는 가져오지 않았습니다.</strong> 좌측 메뉴 [배너 관리]에서 직접 등록해 주세요.
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              잘못 분류된 항목은 좌측 사이드바의 각 콘텐츠 관리 페이지에서 수정/삭제할 수 있습니다.
              SEO 정보는 [교회 기본정보]에서 확인하세요.
            </p>
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

function ResultRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between bg-white/60 px-2 py-1 rounded">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
