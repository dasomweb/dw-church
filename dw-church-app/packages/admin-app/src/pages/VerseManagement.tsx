import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Verse } from '@dw-church/api-client';
import {
  useVerses,
  useCreateVerse,
  useUpdateVerse,
  useDeleteVerse,
} from '@dw-church/api-client';
import { FormField, FormSection, inputClass, selectClass, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';
import { useBulkDelete } from '../components/useBulkDelete';

interface VerseFormData {
  text: string;
  reference: string;
  verseDate: string;
  status: 'draft' | 'published' | 'archived';
}

/**
 * 오늘의 말씀 관리 (관리자 전용 게시판식 CRUD). 등록된 말씀 중 현재 것 하나가
 * 프론트 '오늘의 말씀'(verse_of_day) 데이터 블록에 자동 표시된다 — 노출일이
 * 오늘 이하인 최신 published, 없으면 최신 published. 자동저장 없음: 저장 클릭에만
 * 서버 반영([[feedback_no_autosave]]).
 */
export default function VerseManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editing, setEditing] = useState<Verse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();
  const { data: verses, isLoading, error, refetch } = useVerses();
  const createMutation = useCreateVerse();
  const updateMutation = useUpdateVerse();
  const deleteMutation = useDeleteVerse();
  const bulk = useBulkDelete<Verse>({ deleteOne: (id) => deleteMutation.mutateAsync(id), onDone: () => refetch() });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VerseFormData>();

  const handleCreate = () => {
    setEditing(null);
    reset({ text: '', reference: '', verseDate: '', status: 'published' });
    setView('edit');
  };

  const handleEdit = (v: Verse) => {
    setEditing(v);
    reset({
      text: v.text,
      reference: v.reference ?? '',
      verseDate: v.verseDate ? String(v.verseDate).slice(0, 10) : '',
      status: (v.status as VerseFormData['status']) ?? 'published',
    });
    setView('edit');
  };

  const onSubmit = (data: VerseFormData) => {
    const payload: Partial<Verse> = {
      text: data.text,
      reference: data.reference,
      verseDate: data.verseDate || null,
      status: data.status,
    };
    const done = () => { showToast('success', '저장되었습니다.'); setView('list'); };
    const fail = () => showToast('error', '오류가 발생했습니다.');
    if (editing) updateMutation.mutate({ id: editing.id, data: payload }, { onSuccess: done, onError: fail });
    else createMutation.mutate(payload, { onSuccess: done, onError: fail });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button type="button" onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{editing ? '말씀 수정' : '말씀 등록'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="말씀 내용">
            <FormField label="말씀 본문" required error={errors.text?.message}>
              <textarea
                rows={3}
                {...register('text', { required: '말씀 본문을 입력하세요' })}
                placeholder="예: 내가 너를 도와주리라 참으로 너를 붙들리라"
                className={inputClass}
              />
            </FormField>
            <FormField label="출처">
              <input
                {...register('reference')}
                placeholder="예: 이사야 41:10 · Isaiah 41:10"
                className={inputClass}
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="노출 시작일 (선택)">
                <input type="date" {...register('verseDate')} className={inputClass} />
              </FormField>
              <FormField label="상태">
                <select {...register('status')} className={selectClass}>
                  <option value="published">게시</option>
                  <option value="draft">임시저장</option>
                  <option value="archived">보관</option>
                </select>
              </FormField>
            </div>
            <p className="text-xs text-gray-400">
              프론트 ‘오늘의 말씀’에는 노출 시작일이 오늘 이하인 최신 게시 말씀이 표시됩니다.
              시작일을 비우면 곧바로 후보가 되고, 미래 날짜로 두면 그날부터 표시됩니다.
            </p>
          </FormSection>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">취소</button>
            <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-blue-600/25">
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">오늘의 말씀</h2>
          <p className="text-sm text-gray-500 mt-0.5">등록한 말씀 중 현재 것 하나가 홈페이지 ‘오늘의 말씀’에 자동 표시됩니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {verses && verses.length > 0 && (
            <button onClick={() => bulk.toggleAll(verses)} className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
              {bulk.isAllSelected(verses) ? '선택 해제' : '전체 선택'}
            </button>
          )}
          {bulk.count > 0 && (
            <button onClick={() => void bulk.deleteSelected()} disabled={bulk.busy} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
              선택 삭제 ({bulk.count})
            </button>
          )}
          <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">새 말씀</button>
        </div>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {verses && verses.length === 0 && !isLoading && (
        <EmptyState icon="📖" title="등록된 말씀이 없습니다" description="첫 말씀을 등록하면 홈페이지 ‘오늘의 말씀’에 표시됩니다." actionLabel="말씀 등록" onAction={handleCreate} />
      )}

      {verses && verses.length > 0 && (
        <div className="space-y-3">
          {verses.map((v) => (
            <div key={v.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow flex items-start gap-3 ${bulk.has(v.id) ? 'ring-2 ring-red-500' : ''}`}>
              <input type="checkbox" checked={bulk.has(v.id)} onChange={() => bulk.toggle(v.id)} aria-label="선택" className="mt-1 h-5 w-5 accent-red-600 cursor-pointer" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 line-clamp-2">{v.text}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {v.reference}
                  {v.verseDate ? <span className="text-gray-400"> · {String(v.verseDate).slice(0, 10)}</span> : null}
                  {v.status !== 'published' && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{v.status === 'draft' ? '임시저장' : '보관'}</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleEdit(v)} className="text-sm text-blue-600 hover:underline">편집</button>
                <button onClick={() => setDeleteTarget({ id: v.id, name: v.text.slice(0, 20) })} disabled={deleteMutation.isPending} className="text-sm text-red-600 hover:underline disabled:opacity-50">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}…"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
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
