import { useState } from 'react';
import type { Newcomer, NewcomerStatus, NewcomerSubmission, NewcomerHistoryType } from '@dw-church/api-client';
import {
  useNewcomers,
  useCreateNewcomer,
  useUpdateNewcomer,
  useDeleteNewcomer,
  useNewcomerHistory,
  useAddNewcomerHistory,
  useDeleteNewcomerHistory,
} from '@dw-church/api-client';
import { FormField, inputClass, selectClass, textareaClass, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 새가족 관리 = (1) 새가족 팀이 서면으로 받은 정보를 직접 "등록"하는 폼 +
// (2) 홈페이지 신청 인박스 + (3) 한 명의 "정착 히스토리"(연락/심방/상담/모임/정착)를
// 날짜별로 기록하는 모듈. 통상 새가족은 방문자가 직접 신청하지 않고 새가족 팀이 기입한다.

const STATUS_LABELS: Record<NewcomerStatus, string> = {
  new: '신규',
  contacted: '연락함',
  registered: '등록완료',
  archived: '보관',
};

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

// 정착 히스토리 유형
const HISTORY_TYPE_LABELS: Record<NewcomerHistoryType, string> = {
  contact: '연락',
  visit: '심방',
  counsel: '상담',
  meeting: '모임참석',
  settled: '정착',
  etc: '기타',
};

const HISTORY_TYPE_BADGE: Record<NewcomerHistoryType, string> = {
  contact: 'bg-sky-100 text-sky-700',
  visit: 'bg-violet-100 text-violet-700',
  counsel: 'bg-amber-100 text-amber-700',
  meeting: 'bg-teal-100 text-teal-700',
  settled: 'bg-green-100 text-green-700',
  etc: 'bg-gray-100 text-gray-600',
};

// ISO/자유형식 날짜를 읽기 쉬운 한국어 형식으로 변환
function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: NewcomerSubmission = {
  name: '',
  phone: '',
  email: '',
  address: '',
  birthDate: '',
  gender: '',
  prevChurch: '',
  visitPath: '',
  faithStatus: '',
  familyInfo: '',
  prayerRequest: '',
};

export default function NewcomerManagement() {
  const [statusFilter, setStatusFilter] = useState<'' | NewcomerStatus>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  // 상세 패널의 편집 가능한 로컬 상태 (메모 / 상태). 저장 버튼을 눌러야 서버 반영.
  const [memoDraft, setMemoDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<NewcomerStatus>('new');
  // 스태프 직접 등록 모달
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewcomerSubmission>(EMPTY_FORM);

  const { showToast } = useToast();
  const { data: newcomers, isLoading, error } = useNewcomers(statusFilter || undefined);
  const createMutation = useCreateNewcomer();
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

  const setF = (patch: Partial<NewcomerSubmission>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleCreate = () => {
    if (!form.name?.trim()) { showToast('error', '이름은 필수입니다.'); return; }
    // 빈 문자열은 서버에서 무시되므로 그대로 전송해도 무방
    createMutation.mutate(form, {
      onSuccess: (created) => {
        showToast('success', '새가족을 등록했습니다.');
        setShowCreate(false);
        setForm(EMPTY_FORM);
        if (created?.id) setSelectedId(created.id);
      },
      onError: () => { showToast('error', '등록 중 오류가 발생했습니다.'); },
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">새가족 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            새가족 팀이 서면으로 받은 정보를 직접 등록하거나, 홈페이지 신청을 확인하고 정착 과정을 기록합니다.
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
        >
          ＋ 새가족 등록
        </button>
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
          title="등록된 새가족이 없습니다"
          description="상단의 ‘새가족 등록’으로 서면 정보를 직접 입력하거나, 홈페이지 신청이 들어오면 여기에 표시됩니다."
        />
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 명단 */}
          <div className="lg:col-span-3 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-600">이름</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-36">연락처</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 w-28">등록일</th>
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
              <div className="border border-gray-200 rounded-lg p-5 space-y-4 lg:sticky lg:top-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">등록일: {formatDate(selected.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ id: selected.id, name: selected.name || '' })}
                    disabled={deleteMutation.isPending}
                    className="self-start text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>

                {/* 기본 정보 (읽기 전용) */}
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

                {/* 상태 + 교역자 메모 (편집) */}
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
                    rows={3}
                    placeholder="요약 메모 (정착 과정은 아래 히스토리에 기록)"
                    className={textareaClass}
                  />
                </FormField>

                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {updateMutation.isPending ? '저장 중...' : '상태·메모 저장'}
                </button>

                {/* 정착 히스토리 */}
                <NewcomerHistoryPanel newcomerId={selected.id} />
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
                명단에서 새가족을 선택하면 상세 내용과 정착 히스토리가 표시됩니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 스태프 직접 등록 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">새가족 등록</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600" aria-label="닫기">✕</button>
            </div>
            <p className="mb-4 text-xs text-gray-500">서면으로 받은 새가족 카드를 그대로 입력하세요. 이름만 필수입니다.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="이름 *">
                <input className={inputClass} value={form.name} onChange={(e) => setF({ name: e.target.value })} placeholder="예: 김성실" />
              </FormField>
              <FormField label="전화번호">
                <input className={inputClass} value={form.phone ?? ''} onChange={(e) => setF({ phone: e.target.value })} placeholder="(201) 555-0100" />
              </FormField>
              <FormField label="이메일">
                <input className={inputClass} value={form.email ?? ''} onChange={(e) => setF({ email: e.target.value })} placeholder="name@example.com" />
              </FormField>
              <FormField label="성별">
                <select className={selectClass} value={form.gender ?? ''} onChange={(e) => setF({ gender: e.target.value })}>
                  <option value="">선택 안 함</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </FormField>
              <FormField label="생년월일 / 연령대">
                <input className={inputClass} value={form.birthDate ?? ''} onChange={(e) => setF({ birthDate: e.target.value })} placeholder="1990-03-15 또는 30대" />
              </FormField>
              <FormField label="신앙 상태">
                <input className={inputClass} value={form.faithStatus ?? ''} onChange={(e) => setF({ faithStatus: e.target.value })} placeholder="초신자 / 기신자 / 수평이동" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="주소">
                  <input className={inputClass} value={form.address ?? ''} onChange={(e) => setF({ address: e.target.value })} placeholder="주소" />
                </FormField>
              </div>
              <FormField label="이전 교회">
                <input className={inputClass} value={form.prevChurch ?? ''} onChange={(e) => setF({ prevChurch: e.target.value })} placeholder="이전 출석 교회" />
              </FormField>
              <FormField label="방문 경로">
                <input className={inputClass} value={form.visitPath ?? ''} onChange={(e) => setF({ visitPath: e.target.value })} placeholder="지인 소개 / 검색 / 이사 등" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="가족 정보">
                  <textarea className={textareaClass} rows={2} value={form.familyInfo ?? ''} onChange={(e) => setF({ familyInfo: e.target.value })} placeholder="동반 가족, 자녀 등" />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="기도 제목">
                  <textarea className={textareaClass} rows={2} value={form.prayerRequest ?? ''} onChange={(e) => setF({ prayerRequest: e.target.value })} placeholder="기도 제목" />
                </FormField>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}"의 정보를 삭제하시겠습니까? 정착 히스토리도 함께 삭제되며 되돌릴 수 없습니다.`}
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

// 정착 히스토리 패널 — 날짜별 후속 기록(연락/심방/상담/모임/정착) 타임라인 + 추가 폼
function NewcomerHistoryPanel({ newcomerId }: { newcomerId: string }) {
  const { showToast } = useToast();
  const { data: history, isLoading } = useNewcomerHistory(newcomerId);
  const addMutation = useAddNewcomerHistory();
  const deleteMutation = useDeleteNewcomerHistory();

  const [entryDate, setEntryDate] = useState(today());
  const [type, setType] = useState<NewcomerHistoryType>('contact');
  const [content, setContent] = useState('');

  const entries = history ?? [];

  const handleAdd = () => {
    if (!content.trim()) { showToast('error', '기록 내용을 입력하세요.'); return; }
    addMutation.mutate(
      { newcomerId, data: { entryDate, type, content } },
      {
        onSuccess: () => {
          showToast('success', '히스토리를 추가했습니다.');
          setContent('');
          setType('contact');
          setEntryDate(today());
        },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      },
    );
  };

  const handleDelete = (historyId: string) => {
    deleteMutation.mutate(
      { newcomerId, historyId },
      {
        onSuccess: () => { showToast('success', '삭제되었습니다.'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      },
    );
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <h4 className="mb-3 text-sm font-bold text-gray-800">정착 히스토리</h4>

      {/* 기록 추가 폼 */}
      <div className="space-y-2 rounded-lg bg-gray-50 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className={inputClass}
          />
          <select value={type} onChange={(e) => setType(e.target.value as NewcomerHistoryType)} className={selectClass}>
            {(Object.keys(HISTORY_TYPE_LABELS) as NewcomerHistoryType[]).map((t) => (
              <option key={t} value={t}>{HISTORY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder="예: 담당 목자와 첫 통화, 다음 주 예배 후 식사 약속"
          className={textareaClass}
        />
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50"
        >
          {addMutation.isPending ? '추가 중...' : '＋ 기록 추가'}
        </button>
      </div>

      {/* 타임라인 */}
      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}
        {!isLoading && entries.length === 0 && (
          <p className="text-xs text-gray-400">아직 기록이 없습니다. 연락·심방·상담 등 정착 과정을 남겨 보세요.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="flex gap-3 border-l-2 border-gray-200 pl-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${HISTORY_TYPE_BADGE[e.type] ?? HISTORY_TYPE_BADGE.etc}`}>
                  {HISTORY_TYPE_LABELS[e.type] ?? '기타'}
                </span>
                <span className="text-xs text-gray-500">{formatDate(e.entryDate)}</span>
                {e.author && <span className="text-xs text-gray-400">· {e.author}</span>}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{e.content}</p>
            </div>
            <button
              onClick={() => handleDelete(e.id)}
              disabled={deleteMutation.isPending}
              className="shrink-0 text-xs text-gray-300 hover:text-red-500 disabled:opacity-50"
              aria-label="기록 삭제"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
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
