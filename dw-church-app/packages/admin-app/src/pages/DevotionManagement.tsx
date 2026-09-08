import { useState } from 'react';
import type { Devotion } from '@dw-church/api-client';
import { useDevotions, useCreateDevotion, useUpdateDevotion, useDeleteDevotion } from '@dw-church/api-client';
import { FormField, inputClass, selectClass, textareaClass, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 말씀 묵상(QT) 관리 — 관리자가 하루치 묵상을 업로드. 사용자 트래킹 없음(읽기 전용 콘텐츠).
// ⚠️ 저작권: 성경 본문 전문은 넣지 않는다. 참조(시편 1편) + 창작 묵상/질문/기도만.

type FormState = {
  title: string; devoDate: string; dayLabel: string; scriptureRef: string;
  verse: string; reflection: string; question: string; prayer: string;
  sortOrder: number; status: 'published' | 'draft';
};
const EMPTY: FormState = {
  title: '', devoDate: '', dayLabel: '', scriptureRef: '',
  verse: '', reflection: '', question: '', prayer: '', sortOrder: 0, status: 'published',
};

export default function DevotionManagement() {
  const { data: list, isLoading, error } = useDevotions();
  const createM = useCreateDevotion();
  const updateM = useUpdateDevotion();
  const deleteM = useDeleteDevotion();
  const { showToast } = useToast();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const setF = (p: Partial<FormState>) => setForm((s) => ({ ...s, ...p }));
  const devotions = list ?? [];

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY, sortOrder: devotions.length });
    setView('edit');
  };
  const openEdit = (d: Devotion) => {
    setEditingId(d.id);
    setForm({
      title: d.title ?? '', devoDate: d.devoDate ?? '', dayLabel: d.dayLabel ?? '',
      scriptureRef: d.scriptureRef ?? '', verse: d.verse ?? '', reflection: d.reflection ?? '',
      question: d.question ?? '', prayer: d.prayer ?? '', sortOrder: d.sortOrder ?? 0,
      status: (d.status as 'published' | 'draft') ?? 'published',
    });
    setView('edit');
  };

  const save = () => {
    if (!form.title.trim()) { showToast('error', '제목은 필수입니다.'); return; }
    const cb = {
      onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
      onError: () => { showToast('error', '오류가 발생했습니다.'); },
    };
    if (editingId) updateM.mutate({ id: editingId, data: form }, cb);
    else createM.mutate(form, cb);
  };

  const saving = createM.isPending || updateM.isPending;

  if (view === 'edit') {
    return (
      <div className="p-4 sm:p-6">
        <button onClick={() => setView('list')} className="mb-1 text-sm text-gray-400 hover:text-gray-600">← 말씀 묵상 목록</button>
        <h2 className="mb-1 text-xl font-bold">{editingId ? '말씀 묵상 수정' : '말씀 묵상 업로드'}</h2>
        <p className="mb-6 text-sm text-gray-500">하루치 묵상을 작성하세요. ⚠️ 저작권 — 성경 본문 전문은 넣지 마시고, 참조(예: 시편 1편)만 적어 주세요.</p>

        <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="날짜 (YYYY-MM-DD)">
              <input type="date" className={inputClass} value={form.devoDate} onChange={(e) => setF({ devoDate: e.target.value })} />
            </FormField>
            <FormField label="일차/요일 라벨">
              <input className={inputClass} value={form.dayLabel} onChange={(e) => setF({ dayLabel: e.target.value })} placeholder="예: 1일차 · 월" />
            </FormField>
            <FormField label="상태">
              <select className={selectClass} value={form.status} onChange={(e) => setF({ status: e.target.value as 'published' | 'draft' })}>
                <option value="published">공개</option>
                <option value="draft">임시저장</option>
              </select>
            </FormField>
          </div>
          <FormField label="제목 *">
            <input className={inputClass} value={form.title} onChange={(e) => setF({ title: e.target.value })} placeholder="예: 복 있는 사람의 길" />
          </FormField>
          <FormField label="성경 참조 (본문 전문 아님)">
            <input className={inputClass} value={form.scriptureRef} onChange={(e) => setF({ scriptureRef: e.target.value })} placeholder="예: 시편 1편" />
          </FormField>
          <FormField label="핵심 구절 (선택 — 라이선스 있는 번역본만)">
            <textarea className={textareaClass} rows={2} value={form.verse} onChange={(e) => setF({ verse: e.target.value })} placeholder="저작권상 라이선스가 없으면 비워 두세요. 스토어프론트는 참조만 표시합니다." />
          </FormField>
          <FormField label="묵상 본문">
            <textarea className={textareaClass} rows={8} value={form.reflection} onChange={(e) => setF({ reflection: e.target.value })} placeholder="본문을 묵상하며 나눌 내용을 작성하세요 (문단은 빈 줄로 구분)" />
          </FormField>
          <FormField label="묵상 질문">
            <textarea className={textareaClass} rows={3} value={form.question} onChange={(e) => setF({ question: e.target.value })} placeholder="오늘 본문으로 스스로에게 던질 질문 (여러 개면 줄바꿈)" />
          </FormField>
          <FormField label="기도">
            <textarea className={textareaClass} rows={3} value={form.prayer} onChange={(e) => setF({ prayer: e.target.value })} placeholder="오늘의 기도" />
          </FormField>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <button onClick={() => setView('list')} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
            <button onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">말씀 묵상 (QT)</h2>
          <p className="mt-1 text-sm text-gray-500">하루치 묵상을 업로드합니다. 홈페이지 "말씀 묵상"에 주간 목록과 함께 표시됩니다.</p>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ 묵상 업로드</button>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}
      {list && devotions.length === 0 && !isLoading && (
        <EmptyState icon="📖" title="등록된 말씀 묵상이 없습니다" description="‘묵상 업로드’로 하루치 묵상을 추가하세요." />
      )}

      {devotions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="w-24 px-4 py-2.5 font-medium text-gray-600">날짜</th>
                <th className="px-4 py-2.5 font-medium text-gray-600">제목</th>
                <th className="w-32 px-4 py-2.5 font-medium text-gray-600">본문</th>
                <th className="w-20 px-4 py-2.5 text-center font-medium text-gray-600">상태</th>
                <th className="w-24 px-4 py-2.5 text-right font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devotions.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500">{d.devoDate || '-'}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800">{d.title}</div>
                    {d.dayLabel && <div className="text-xs text-gray-400">{d.dayLabel}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{d.scriptureRef || '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${d.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.status === 'published' ? '공개' : '임시'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openEdit(d)} className="text-xs font-medium text-blue-600 hover:underline">수정</button>
                    <button onClick={() => setDeleteTarget({ id: d.id, name: d.title || '' })} className="ml-3 text-xs text-red-600 hover:underline">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}" 묵상을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteM.mutate(deleteTarget!.id, {
            onSuccess: () => showToast('success', '삭제되었습니다.'),
            onError: () => showToast('error', '오류가 발생했습니다.'),
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
