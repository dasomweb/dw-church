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
  onCompleted?: (counts: ResultCounts) => void;
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
  const [result, setResult] = useState<ResultCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      const body = await res.json() as MigrationResponse;
      setResult(body.data.classifiedCounts);
      onCompleted?.(body.data.classifiedCounts);
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

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>처리 과정 (1~5분 소요):</strong>
              <ol className="mt-1.5 space-y-0.5 list-decimal list-inside">
                <li>사이트 페이지 트리 스캔 (최대 30개)</li>
                <li>콘텐츠 자동 분류 (설교·교역자·연혁·게시판 등)</li>
                <li>이미지/PDF R2 업로드</li>
                <li>테넌트 DB 일괄 저장</li>
              </ol>
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
                <ResultRow label="페이지" value={result.pages} />
                <ResultRow label="설교" value={result.sermons} />
                <ResultRow label="주보" value={result.bulletins} />
                <ResultRow label="칼럼" value={result.columns} />
                <ResultRow label="행사" value={result.events} />
                <ResultRow label="앨범" value={result.albums} />
                <ResultRow label="교역자" value={result.staff} />
                <ResultRow label="연혁" value={result.history} />
                <ResultRow label="게시판" value={result.boards} />
                <ResultRow label="메뉴" value={result.menus} />
                <ResultRow label="이미지" value={result.images} />
                <ResultRow label="YouTube" value={result.youtubeVideos} />
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              잘못 분류된 항목은 좌측 사이드바의 각 콘텐츠 관리 페이지에서 수정/삭제할 수 있습니다.
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

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between bg-white/60 px-2 py-1 rounded">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
