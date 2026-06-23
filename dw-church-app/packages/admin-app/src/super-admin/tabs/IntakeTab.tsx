import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';
import { formatDate } from '../shared/format';
import { PLAN_COLORS } from '../shared/constants';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Intake (초기 입력 — 결제 교회가 제출한 콘텐츠 열람) ───
// ═══════════════════════════════════════════════════════════
// 결제한 교회가 입력한 초기 콘텐츠를 슈퍼 어드민이 읽고, AI 빌더로 사이트를
// 구성한 뒤 '완료 표시'를 누르는 워크플로우. data 블롭은 섹션 id를 키로 가지며
// 섹션 값은 field→value 객체(이미지 필드는 URL 문자열, staff/history/cells는 배열).
type IntakeStatus = 'draft' | 'submitted' | 'built';

interface IntakeListItem {
  tenantSlug: string;
  plan: string;
  status: IntakeStatus;
  updatedAt: string;
}

interface IntakeDetail {
  tenantSlug: string;
  plan: string;
  // 섹션 id → (field → value). value는 string | number | object | array 등 불특정.
  data: Record<string, unknown>;
  status: IntakeStatus;
  updatedAt: string;
}

const INTAKE_STATUS_META: Record<IntakeStatus, { label: string; cls: string }> = {
  draft: { label: '작성중', cls: 'bg-amber-100 text-amber-700' },
  submitted: { label: '제출됨', cls: 'bg-blue-100 text-blue-700' },
  built: { label: '완료', cls: 'bg-green-100 text-green-700' },
};

const INTAKE_FILTERS: { id: 'all' | IntakeStatus; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '작성중' },
  { id: 'submitted', label: '제출됨' },
  { id: 'built', label: '완료' },
];

function IntakeStatusBadge({ status }: { status: IntakeStatus }) {
  const meta = INTAKE_STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

// URL 문자열이 이미지처럼 보이는지 판단(확장자 / uploads 경로 / http).
function looksLikeImageUrl(v: string): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(s)) return true;
  if (s.includes('/uploads')) return true;
  // http(s) 로 시작하면서 이미지일 가능성 — 위 확장자/uploads 에 안 걸려도 thumbnail 시도.
  if (/^https?:\/\//i.test(s) && /(image|img|photo|media|cdn|r2|storage)/i.test(s)) return true;
  return false;
}

// 콘텐츠 블롭을 사람이 읽을 수 있는 plain-text 로 직렬화 (클립보드 복사용).
function intakeToPlainText(detail: IntakeDetail): string {
  const lines: string[] = [];
  lines.push(`교회(slug): ${detail.tenantSlug}`);
  lines.push(`플랜: ${detail.plan}`);
  lines.push(`상태: ${INTAKE_STATUS_META[detail.status]?.label ?? detail.status}`);
  lines.push('');

  const renderValue = (key: string, value: unknown, indent: string) => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      value.forEach((item, i) => {
        if (item != null && typeof item === 'object') {
          lines.push(`${indent}  - [${i + 1}]`);
          Object.entries(item as Record<string, unknown>).forEach(([k, v]) => {
            if (v == null || v === '') return;
            lines.push(`${indent}    ${k}: ${String(v)}`);
          });
        } else {
          lines.push(`${indent}  - ${String(item)}`);
        }
      });
    } else if (typeof value === 'object') {
      lines.push(`${indent}${key}:`);
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => renderValue(k, v, indent + '  '));
    } else {
      lines.push(`${indent}${key}: ${String(value)}`);
    }
  };

  Object.entries(detail.data || {}).forEach(([sectionId, sectionVal]) => {
    lines.push(`■ ${sectionId}`);
    if (sectionVal != null && typeof sectionVal === 'object' && !Array.isArray(sectionVal)) {
      Object.entries(sectionVal as Record<string, unknown>).forEach(([k, v]) => renderValue(k, v, '  '));
    } else {
      renderValue(sectionId, sectionVal, '  ');
    }
    lines.push('');
  });

  return lines.join('\n');
}

// 단일 field 값을 읽기 좋게 렌더 (문자열/이미지/배열/객체 fallback).
function IntakeFieldValue({ value }: { value: unknown }) {
  if (value == null || value === '') {
    return <span className="text-gray-300">—</span>;
  }
  if (typeof value === 'string') {
    if (looksLikeImageUrl(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="inline-block">
          <img
            src={value}
            alt=""
            className="h-20 w-20 object-cover rounded-lg border border-gray-200 bg-gray-50"
          />
        </a>
      );
    }
    return <span className="whitespace-pre-wrap break-words text-gray-800">{value}</span>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-gray-800">{String(value)}</span>;
  }
  // 알 수 없는 형태(중첩 객체 등) — JSON fallback.
  return (
    <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-x-auto text-gray-600">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// 배열 항목(staff/history/cells 등) 하나를 sub-card 로 렌더.
function IntakeRepeaterCard({ item }: { item: unknown }) {
  if (item == null || typeof item !== 'object') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
        <IntakeFieldValue value={item} />
      </div>
    );
  }
  const entries = Object.entries(item as Record<string, unknown>);
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
      {entries.length === 0 ? (
        <span className="text-gray-300 text-sm">(빈 항목)</span>
      ) : (
        entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-sm">
            <span className="shrink-0 w-28 text-xs text-gray-500 pt-0.5">{k}</span>
            <div className="min-w-0 flex-1"><IntakeFieldValue value={v} /></div>
          </div>
        ))
      )}
    </div>
  );
}

function IntakeDetailModal({
  slug,
  onClose,
  onBuilt,
}: {
  slug: string;
  onClose: () => void;
  onBuilt: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<IntakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (applying) return;
    if (!window.confirm('입력한 콘텐츠(교회정보·교역자·연혁·목장·홈 블록)를 사이트에 바로 적용합니다. 진행할까요?')) return;
    setApplying(true);
    try {
      const res = await apiFetch<{ data: { settings: number; staff: number; history: number; cells: number; blocks: number } }>(
        `/intake/${slug}/apply`, { method: 'POST' },
      );
      const s = (res as { data?: Record<string, number> }).data ?? (res as unknown as Record<string, number>);
      showToast('success', `적용 완료 — 설정 ${s.settings ?? 0} · 교역자 ${s.staff ?? 0} · 연혁 ${s.history ?? 0} · 목장 ${s.cells ?? 0} · 홈 블록 ${s.blocks ?? 0}`);
      onBuilt();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '적용 실패');
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{ data: IntakeDetail } | IntakeDetail>(`/intake/${slug}`);
        const d = (res as { data?: IntakeDetail }).data ?? (res as IntakeDetail);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '초기 입력을 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, slug]);

  const handleCopy = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(intakeToPlainText(detail));
      showToast('success', '복사되었습니다.');
    } catch {
      showToast('error', '복사에 실패했습니다.');
    }
  };

  const handleMarkBuilt = async () => {
    if (!detail || marking) return;
    if (!window.confirm('AI 빌더로 사이트 구성을 완료했습니까? 상태를 "완료"로 표시합니다.')) return;
    setMarking(true);
    try {
      await apiFetch(`/intake/${slug}/built`, { method: 'POST' });
      showToast('success', '완료로 표시되었습니다.');
      onBuilt();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '완료 표시 실패');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold font-mono">{slug}</h3>
            {detail && (
              <>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[detail.plan] || 'bg-gray-100 text-gray-600'}`}>
                  {detail.plan}
                </span>
                <IntakeStatusBadge status={detail.status} />
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {loading && <Spinner />}
        {error && <p className="text-red-600 text-sm py-4">{error}</p>}

        {detail && (
          <div className="space-y-5">
            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                전체 내용 복사
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {applying ? '적용 중...' : '📥 콘텐츠 사이트에 적용'}
              </button>
              <button
                onClick={handleMarkBuilt}
                disabled={marking || detail.status === 'built'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {marking ? '표시 중...' : detail.status === 'built' ? '이미 완료됨' : 'AI 빌더 사용 완료 표시'}
              </button>
              <span className="ml-auto self-center text-xs text-gray-400">
                업데이트: {formatDate(detail.updatedAt)}
              </span>
            </div>

            {/* 섹션별 콘텐츠 */}
            {Object.keys(detail.data || {}).length === 0 ? (
              <EmptyState message="제출된 콘텐츠가 없습니다" />
            ) : (
              <div className="space-y-4">
                {Object.entries(detail.data).map(([sectionId, sectionVal]) => (
                  <div key={sectionId} className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700">{sectionId}</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {Array.isArray(sectionVal) ? (
                        sectionVal.length === 0 ? (
                          <span className="text-gray-300 text-sm">(빈 목록)</span>
                        ) : (
                          <div className="space-y-2">
                            {sectionVal.map((item, i) => (
                              <IntakeRepeaterCard key={i} item={item} />
                            ))}
                          </div>
                        )
                      ) : sectionVal != null && typeof sectionVal === 'object' ? (
                        Object.entries(sectionVal as Record<string, unknown>).map(([field, val]) => (
                          Array.isArray(val) ? (
                            <div key={field}>
                              <p className="text-xs text-gray-500 mb-1.5">{field}</p>
                              {val.length === 0 ? (
                                <span className="text-gray-300 text-sm">(빈 목록)</span>
                              ) : (
                                <div className="space-y-2">
                                  {val.map((item, i) => (
                                    <IntakeRepeaterCard key={i} item={item} />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div key={field} className="flex gap-3">
                              <span className="shrink-0 w-32 text-xs text-gray-500 pt-0.5">{field}</span>
                              <div className="min-w-0 flex-1 text-sm"><IntakeFieldValue value={val} /></div>
                            </div>
                          )
                        ))
                      ) : (
                        <IntakeFieldValue value={sectionVal} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntakeTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [items, setItems] = useState<IntakeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | IntakeStatus>('all');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: IntakeListItem[] } | IntakeListItem[]>('/intake');
      setItems(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '초기 입력 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 정렬: 제출됨(submitted) 먼저, 그다음 updatedAt 내림차순.
  const sorted = [...items].sort((a, b) => {
    const aSub = a.status === 'submitted' ? 0 : 1;
    const bSub = b.status === 'submitted' ? 0 : 1;
    if (aSub !== bSub) return aSub - bSub;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const visible = statusFilter === 'all' ? sorted : sorted.filter((i) => i.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
        <p className="text-sm text-blue-800">
          결제한 교회가 입력한 콘텐츠입니다. 이 내용을 바탕으로 AI 빌더로 사이트를 구성한 뒤 '완료 표시'를 눌러주세요.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {INTAKE_FILTERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState
            message={statusFilter === 'all' ? '아직 제출된 초기 입력이 없습니다' : '해당 상태의 초기 입력이 없습니다'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">교회</th>
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">업데이트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((i, idx) => (
                  <tr
                    key={i.tenantSlug}
                    onClick={() => setSelectedSlug(i.tenantSlug)}
                    className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">{i.tenantSlug}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[i.plan] || 'bg-gray-100 text-gray-600'}`}>
                        {i.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3"><IntakeStatusBadge status={i.status} /></td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(i.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSlug && (
        <IntakeDetailModal
          slug={selectedSlug}
          onClose={() => setSelectedSlug(null)}
          onBuilt={() => {
            setSelectedSlug(null);
            void fetchList();
          }}
        />
      )}
    </div>
  );
}
