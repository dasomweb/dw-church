/**
 * MigrationDialog — Phase 12-δ.
 *
 * "URL 만 주면 끝" UX. 운영자가 기존 교회 사이트 URL 입력 → 서버의
 * /api/v1/migration/migrate-url 가 extract → classify → apply 전부
 * 자동 실행 → 결과 카운트 반환. 운영자 추가 입력 없음.
 *
 * Used from SuperAdminDashboardV2 의 행 "📥 가져오기" 버튼. AIBuilderModal
 * 의 PlannerWizard step 으로도 후에 통합 가능 (계산된 ClassifiedData 가
 * 다음 step 의 prefill 로 들어감) — 그때까지는 standalone.
 *
 * Pricing tier (project_pricing_tiers): 마이그레이션은 사이트 셋업의
 * "초기 1회" 작업이라 모든 plan 에서 슈퍼어드민이 실행 가능. Basic 의
 * page-add gate 와 무관.
 */
import { useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../index';

interface MigrationDialogProps {
  tenant: { id: string; slug: string; name: string };
  open: boolean;
  onClose: () => void;
  onCompleted?: (result: MigrationResult) => void;
}

interface ResultCounts {
  sermons: number;
  bulletins: number;
  columns: number;
  events: number;
  albums: number;
  staff: number;
  history: number;
  boards: number;
  menus: number;
  pages: number;
  images: number;
  youtubeVideos: number;
  /** Phase 12-γ.2 — count of SEO fields harvested from source <head>.
   *  Out of 7: seoTitle, seoDescription, seoKeywords, ogImageUrl,
   *  logoUrl, locale, slogan. See [[project_migration_seo_extraction]]. */
  seoFieldsFilled?: number;
  /** Phase 12-γ.4 — pages the LLM examined + items it contributed
   *  beyond the rule-based pass. */
  llmPagesAnalyzed?: number;
  llmItemsAdded?: number;
}

interface MigrationResult {
  counts: ResultCounts;
}

interface MigrationResponse {
  data: {
    jobId: string;
    applyResult: Record<string, number>;
    classifiedCounts: ResultCounts;
  };
}

export function MigrationDialog({ tenant, open, onClose, onCompleted }: MigrationDialogProps) {
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();
  const [sourceUrl, setSourceUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Phase 12-γ.5 — selective import. Static content always included
  // (fast, low risk). Dynamic content checked per operator preference.
  // Default: no dynamic selected (= static-only first run).
  const [dynamicSelections, setDynamicSelections] = useState<Record<string, boolean>>({
    sermons: false, bulletins: false, columns: false, events: false,
    albums: false, staff: false, boards: false,
  });
  const [useLlm, setUseLlm] = useState(true);
  const toggleDynamic = (key: string) =>
    setDynamicSelections((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!open) return null;

  const baseUrl = (() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const run = async () => {
    const url = sourceUrl.trim();
    if (!url) {
      showToast('error', '사이트 URL 을 입력하세요.');
      return;
    }
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      // Static is always included; dynamic only if explicitly checked.
      const STATIC_KEYS = ['settings', 'pages', 'worshipTimes', 'history', 'menus'];
      const include = [
        ...STATIC_KEYS,
        ...Object.entries(dynamicSelections).filter(([, v]) => v).map(([k]) => k),
      ];
      const res = await fetch(`${baseUrl}/api/v1/migration/migrate-url`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceUrl: url,
          tenantSlug: tenant.slug,
          youtubeChannelUrl: youtubeUrl.trim() || undefined,
          include,
          useLlm,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const body = await res.json() as MigrationResponse;
      const finalResult: MigrationResult = {
        counts: body.data.classifiedCounts,
      };
      setResult(finalResult);
      onCompleted?.(finalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '마이그레이션 실패');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">📥</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">기존 사이트 가져오기</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{tenant.name}</span> 에 기존 교회 사이트의
              페이지·콘텐츠·이미지를 자동으로 가져옵니다.
            </p>
          </div>
        </div>

        {!result && !error && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                기존 사이트 URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={running}
                placeholder="https://oldchurch.com"
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                YouTube 채널 URL (선택)
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={running}
                placeholder="https://www.youtube.com/@yourchannel"
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                지정하면 설교 영상 메타데이터를 자동 수집합니다.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-3">
              {/* 자동 포함 — 정적 콘텐츠 (사용자에게 무엇이 들어오는지 명시) */}
              <div>
                <div className="font-semibold text-gray-900 mb-1">✅ 자동 포함 (정적 콘텐츠)</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-gray-700">
                  <span>• 교회 기본정보 (이름·주소·전화·SEO)</span>
                  <span>• 메뉴 구조</span>
                  <span>• 담임목사 인사말</span>
                  <span>• 교회 비전·소개</span>
                  <span>• 예배 시간 안내</span>
                  <span>• 오시는 길·연락처</span>
                  <span>• 새가족 안내</span>
                  <span>• 선교·교육·훈련</span>
                  <span>• 연혁 / 교회 역사</span>
                  <span>• 그 외 일반 페이지</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  AI가 각 페이지를 분석해서 위 카테고리로 자동 분류·저장합니다.
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <div className="font-semibold text-gray-900 mb-1">📦 추가 선택 (동적 콘텐츠)</div>
                <div className="text-[11px] text-gray-600 mb-2">
                  필요한 것만 선택하세요 — 안 가져온 항목은 운영자가 직접 등록할 수 있습니다.
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { key: 'sermons',   label: '설교',     hint: '워드프레스 카테고리 + YouTube' },
                    { key: 'bulletins', label: '주보',     hint: 'PDF 첨부 + KBoard' },
                    { key: 'columns',   label: '칼럼',     hint: '본문 텍스트 포함' },
                    { key: 'events',    label: '행사',     hint: '공지·소식' },
                    { key: 'albums',    label: '앨범',     hint: '갤러리 이미지 (R2 업로드)' },
                    { key: 'staff',     label: '교역자',   hint: '이름·직책·사진' },
                    { key: 'boards',    label: '게시판',   hint: '자유게시판·Q&A' },
                  ] as const).map((item) => (
                    <label key={item.key} className="flex items-start gap-1.5 p-1.5 rounded hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dynamicSelections[item.key] ?? false}
                        onChange={() => toggleDynamic(item.key)}
                        disabled={running}
                        className="mt-0.5"
                      />
                      <span>
                        <div className="font-medium text-gray-800">{item.label}</div>
                        <div className="text-[10px] text-gray-500">{item.hint}</div>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDynamicSelections({
                      sermons: true, bulletins: true, columns: true, events: true,
                      albums: true, staff: true, boards: true,
                    })}
                    disabled={running}
                    className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    모두 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => setDynamicSelections({
                      sermons: false, bulletins: false, columns: false, events: false,
                      albums: false, staff: false, boards: false,
                    })}
                    disabled={running}
                    className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    모두 해제 (정적만)
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-1.5 pt-2 border-t border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLlm}
                  onChange={(e) => setUseLlm(e.target.checked)}
                  disabled={running}
                />
                <span className="text-[11px] text-gray-700">
                  🤖 AI 분석 사용 (Gemini) — 모든 페이지를 검토해 룰베이스가 놓친 콘텐츠를 보강.
                  해제하면 더 빠르지만 정확도가 낮아집니다.
                </span>
              </label>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>처리 과정 (정적만: 1~2분 / 동적 포함: 3~8분):</strong>
              <ol className="mt-1.5 space-y-0.5 list-decimal list-inside">
                <li>사이트 페이지 크롤 (최대 30개 — sitemap.xml + 메뉴 링크)</li>
                <li>각 페이지의 텍스트·이미지·YouTube·PDF 링크 추출 (CSS/JS 무시)</li>
                <li>SEO·OG·JSON-LD 메타데이터 → 교회 기본정보</li>
                <li><strong>🤖 AI 분석</strong>: Gemini 가 각 페이지를 보고 "어떤 페이지인지 + 무엇이 담겼는지" 판단·추출</li>
                <li>이미지/PDF R2 업로드</li>
                <li>테넌트 DB 일괄 저장</li>
              </ol>
              <p className="mt-2 text-[11px]">
                <strong>제외:</strong> 배너 슬라이더는 자동 가져오지 않습니다.
                마이그레이션 후 [배너 관리]에서 직접 등록해 주세요.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                disabled={running}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={run}
                disabled={running || !sourceUrl.trim()}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {running ? '진행 중...' : '가져오기 시작'}
              </button>
            </div>

            {running && (
              <p className="text-center text-xs text-gray-500 animate-pulse">
                서버에서 사이트 분석 중... 페이지가 많으면 시간이 더 걸릴 수 있습니다.
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="text-sm font-bold text-green-900">✅ 가져오기 완료</h4>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-green-900">
                <ResultRow label="페이지" value={result.counts.pages} />
                <ResultRow label="설교" value={result.counts.sermons} />
                <ResultRow label="주보" value={result.counts.bulletins} />
                <ResultRow label="칼럼" value={result.counts.columns} />
                <ResultRow label="행사" value={result.counts.events} />
                <ResultRow label="앨범" value={result.counts.albums} />
                <ResultRow label="교역자" value={result.counts.staff} />
                <ResultRow label="연혁" value={result.counts.history} />
                <ResultRow label="게시판" value={result.counts.boards} />
                <ResultRow label="메뉴" value={result.counts.menus} />
                <ResultRow label="이미지" value={result.counts.images} />
                <ResultRow label="YouTube" value={result.counts.youtubeVideos} />
                <ResultRow label="SEO 정보" value={`${result.counts.seoFieldsFilled ?? 0} / 7`} />
              </div>
              {(result.counts.llmPagesAnalyzed ?? 0) > 0 && (
                <p className="mt-2 text-[11px] text-green-800">
                  🤖 AI 분석: {result.counts.llmPagesAnalyzed} 페이지 검토 →{' '}
                  <strong>+{result.counts.llmItemsAdded ?? 0}건</strong> 추가 발견
                </p>
              )}
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900">
              <strong>배너 슬라이더는 가져오지 않았습니다.</strong>{' '}
              좌측 메뉴 [배너 관리]에서 직접 등록해 주세요.
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              잘못 분류된 항목은 좌측 사이드바의 각 콘텐츠 관리 페이지에서 수정/삭제할 수 있습니다.
              SEO 정보는 [교회 기본정보]에서 확인하세요.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <h4 className="text-sm font-bold text-red-900">❌ 마이그레이션 실패</h4>
              <p className="mt-1.5 text-xs text-red-800 leading-relaxed">{error}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setError(null); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                다시 시도
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between bg-white/60 px-2 py-1 rounded">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
