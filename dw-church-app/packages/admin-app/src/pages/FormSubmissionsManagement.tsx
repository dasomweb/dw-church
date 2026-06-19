import { useState } from 'react';
import type { FormSubmission, FormSubmissionStatus } from '@dw-church/api-client';
import {
  useFormSubmissions,
  useUpdateFormSubmission,
  useDeleteFormSubmission,
} from '@dw-church/api-client';
import { FormField, selectClass, textareaClass, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 폼 제출함(인박스). 스토어프론트의 폼 블록(문의/목장사역보고서/새가족 등)으로
// 방문자가 남긴 제출을 교역자가 확인/분류/메모하는 화면이다. 생성 훅은 없음.

const STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  new: '신규',
  read: '읽음',
  done: '완료',
  archived: '보관',
};

// 상태별 배지 색상
const STATUS_BADGE: Record<FormSubmissionStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  read: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

const STATUS_FILTERS: { value: '' | FormSubmissionStatus; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'new', label: '신규' },
  { value: 'read', label: '읽음' },
  { value: 'done', label: '완료' },
  { value: 'archived', label: '보관' },
];

// 폼 종류 필터 (값 '' → 전체, useFormSubmissions 에는 undefined 로 전달)
const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'contact', label: '문의' },
  { value: 'cell_report', label: '목장보고' },
  { value: 'newcomer', label: '새가족' },
  { value: 'custom', label: '기타' },
];

// 폼 종류 → 한국어 라벨. 미등록 종류는 원본 문자열을 그대로 노출.
const FORM_TYPE_LABELS: Record<string, string> = {
  contact: '문의',
  cell_report: '목장보고',
  newcomer: '새가족',
  prayer: '기도제목',
  volunteer: '봉사신청',
  custom: '기타',
};

function formTypeLabel(formType: string): string {
  return FORM_TYPE_LABELS[formType] ?? formType;
}

// ISO 날짜를 읽기 쉬운 한국어 형식으로 변환
function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function FormSubmissionsManagement() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | FormSubmissionStatus>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  // 상세 패널의 편집 가능한 로컬 상태 (메모 / 상태). 저장 버튼을 눌러야 서버 반영.
  const [memoDraft, setMemoDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<FormSubmissionStatus>('new');

  const { showToast } = useToast();
  const { data: submissions, isLoading, error } = useFormSubmissions({
    formType: typeFilter || undefined,
    status: statusFilter || undefined,
  });
  const updateMutation = useUpdateFormSubmission();
  const deleteMutation = useDeleteFormSubmission();

  // 최신순 정렬 (createdAt 내림차순)
  const sorted = submissions
    ? [...submissions].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    : [];

  const selected = sorted.find((s) => s.id === selectedId) ?? null;

  const handleSelect = (item: FormSubmission) => {
    setSelectedId(item.id);
    setMemoDraft(item.memo ?? '');
    setStatusDraft(item.status ?? 'new');
  };

  const handleSave = () => {
    if (!selected) return;
    updateMutation.mutate(
      { id: selected.id, data: { status: statusDraft, memo: memoDraft } },
      {
        onSuccess: () => { showToast('success', '저장되었습니다.'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      },
    );
  };

  // 목록의 인라인 상태 드롭다운 — 즉시 서버 반영 (메모는 건드리지 않음)
  const handleQuickStatus = (item: FormSubmission, status: FormSubmissionStatus) => {
    updateMutation.mutate(
      { id: item.id, data: { status } },
      {
        onSuccess: () => { showToast('success', '상태가 변경되었습니다.'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      },
    );
  };

  // payload 의 표시 가능한 항목만 (null/빈 값 제외)
  const detailEntries = selected
    ? Object.entries(selected.payload).filter(
        ([, value]) => value !== null && value !== undefined && String(value).trim() !== '',
      )
    : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">폼 제출 관리</h2>
      </div>

      {/* 폼 종류 필터 */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setTypeFilter(f.value)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              typeFilter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === f.value ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {submissions && sorted.length === 0 && !isLoading && (
        <EmptyState
          icon="📥"
          title="제출된 폼이 없습니다"
          description="사이트의 폼 블록(문의, 목장사역보고서 등)으로 제출이 들어오면 여기에 표시됩니다."
        />
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 제출 목록 */}
          <div className="lg:col-span-3 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-600">이름</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-36">연락처</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-28">제출일</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-32 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((item) => {
                  const status = item.status ?? 'new';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedId === item.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{item.submitterName || '(이름 없음)'}</span>
                          <span className="text-xs font-medium rounded px-1.5 py-0.5 bg-gray-100 text-gray-500">
                            {formTypeLabel(item.formType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{item.submitterContact || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={status}
                          onChange={(e) => handleQuickStatus(item, e.target.value as FormSubmissionStatus)}
                          disabled={updateMutation.isPending}
                          className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer ${STATUS_BADGE[status]}`}
                        >
                          {(Object.keys(STATUS_LABELS) as FormSubmissionStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 상세 패널 */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="border border-gray-200 rounded-lg p-5 space-y-4 sticky top-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selected.submitterName || '(이름 없음)'}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formTypeLabel(selected.formType)} · 제출일: {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ id: selected.id, name: selected.submitterName || '' })}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>

                {/* 제출 내용 (읽기 전용) */}
                {detailEntries.length > 0 ? (
                  <dl className="text-sm divide-y divide-gray-100 border-y border-gray-100">
                    {detailEntries.map(([key, value]) => (
                      <DetailRow key={key} label={key} value={String(value)} />
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-gray-400 border-y border-gray-100 py-3">제출 내용이 없습니다.</p>
                )}

                {/* 교역자 메모 + 상태 (편집) */}
                <FormField label="상태">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as FormSubmissionStatus)}
                    className={selectClass}
                  >
                    {(Object.keys(STATUS_LABELS) as FormSubmissionStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="교역자 메모">
                  <textarea
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    rows={4}
                    placeholder="확인 내용, 후속 조치 등을 기록하세요"
                    className={textareaClass}
                  />
                </FormField>

                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
                제출을 선택하면 상세 내용이 표시됩니다.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name || '(이름 없음)'}"의 제출을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => { showToast('success', '삭제되었습니다.'); setSelectedId(null); },
            onError: () => { showToast('error', '오류가 발생했습니다.'); },
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// 상세 패널의 읽기 전용 한 줄 (값이 없으면 '-')
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-24 shrink-0 text-gray-400 break-words">{label}</dt>
      <dd className="flex-1 text-gray-800 whitespace-pre-wrap break-words">{value || '-'}</dd>
    </div>
  );
}
