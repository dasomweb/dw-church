import { useState } from 'react';
import type { Newcomer, NewcomerStatus } from '@dw-church/api-client';
import {
  useNewcomers,
  useUpdateNewcomer,
  useDeleteNewcomer,
} from '@dw-church/api-client';
import { FormField, selectClass, textareaClass, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 새가족 등록은 작성 폼이 아니라 "제출함(인박스)". 방문자가 사이트(스토어프론트)
// 폼으로 남긴 신청을 교역자가 확인/분류/메모하는 화면이다. 등록 생성 훅은 없음.

const STATUS_LABELS: Record<NewcomerStatus, string> = {
  new: '신규',
  contacted: '연락함',
  registered: '등록완료',
  archived: '보관',
};

// 상태별 배지 색상
const STATUS_BADGE: Record<NewcomerStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  registered: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

const STATUS_FILTERS: { value: '' | NewcomerStatus; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'new', label: '신규' },
  { value: 'contacted', label: '연락함' },
  { value: 'registered', label: '등록완료' },
  { value: 'archived', label: '보관' },
];

// ISO 날짜를 읽기 쉬운 한국어 형식으로 변환
function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewcomerManagement() {
  const [statusFilter, setStatusFilter] = useState<'' | NewcomerStatus>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  // 상세 패널의 편집 가능한 로컬 상태 (메모 / 상태). 저장 버튼을 눌러야 서버 반영.
  const [memoDraft, setMemoDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<NewcomerStatus>('new');

  const { showToast } = useToast();
  const { data: newcomers, isLoading, error } = useNewcomers(statusFilter || undefined);
  const updateMutation = useUpdateNewcomer();
  const deleteMutation = useDeleteNewcomer();

  // 최신순 정렬 (createdAt 내림차순)
  const sorted = newcomers
    ? [...newcomers].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    : [];

  const selected = sorted.find((n) => n.id === selectedId) ?? null;

  const handleSelect = (item: Newcomer) => {
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
  const handleQuickStatus = (item: Newcomer, status: NewcomerStatus) => {
    updateMutation.mutate(
      { id: item.id, data: { status } },
      {
        onSuccess: () => { showToast('success', '상태가 변경되었습니다.'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      },
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">새가족 관리</h2>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              statusFilter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {newcomers && sorted.length === 0 && !isLoading && (
        <EmptyState
          icon="🙌"
          title="등록된 새가족 신청이 없습니다"
          description="사이트의 새가족 등록 폼으로 신청이 들어오면 여기에 표시됩니다."
        />
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 신청 목록 */}
          <div className="lg:col-span-3 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-600">이름</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-36">연락처</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-28">신청일</th>
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
                        <div className="font-medium text-gray-800">{item.name}</div>
                        {item.faithStatus && <div className="text-xs text-gray-400">{item.faithStatus}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{item.phone || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={status}
                          onChange={(e) => handleQuickStatus(item, e.target.value as NewcomerStatus)}
                          disabled={updateMutation.isPending}
                          className={`text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer ${STATUS_BADGE[status]}`}
                        >
                          {(Object.keys(STATUS_LABELS) as NewcomerStatus[]).map((s) => (
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
                    <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">신청일: {formatDate(selected.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ id: selected.id, name: selected.name || '' })}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>

                {/* 제출 내용 (읽기 전용) */}
                <dl className="text-sm divide-y divide-gray-100 border-y border-gray-100">
                  <DetailRow label="전화번호" value={selected.phone} />
                  <DetailRow label="이메일" value={selected.email} />
                  <DetailRow label="주소" value={selected.address} />
                  <DetailRow label="생년월일" value={selected.birthDate} />
                  <DetailRow label="성별" value={selected.gender} />
                  <DetailRow label="이전 교회" value={selected.prevChurch} />
                  <DetailRow label="방문 경로" value={selected.visitPath} />
                  <DetailRow label="신앙 상태" value={selected.faithStatus} />
                  <DetailRow label="가족 정보" value={selected.familyInfo} />
                  <DetailRow label="기도 제목" value={selected.prayerRequest} />
                </dl>

                {/* 교역자 메모 + 상태 (편집) */}
                <FormField label="상태">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as NewcomerStatus)}
                    className={selectClass}
                  >
                    {(Object.keys(STATUS_LABELS) as NewcomerStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="교역자 메모">
                  <textarea
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    rows={4}
                    placeholder="상담 내용, 후속 조치 등을 기록하세요"
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
                신청을 선택하면 상세 내용이 표시됩니다.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"의 신청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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
      <dt className="w-20 shrink-0 text-gray-400">{label}</dt>
      <dd className="flex-1 text-gray-800 whitespace-pre-wrap break-words">{value || '-'}</dd>
    </div>
  );
}
