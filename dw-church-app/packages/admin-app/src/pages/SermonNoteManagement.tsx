import { useState } from 'react';
import type { SermonNote, SermonNoteContent, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useSermonNotes,
  useCreateSermonNote,
  useUpdateSermonNote,
  useDeleteSermonNote,
} from '@dw-church/api-client';
import { FormField, FormRow, inputClass, selectClass, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';
import { SermonNoteEditor } from '../components/SermonNoteEditor';

// 설교노트 관리 — 온라인 주보와 별개의 콘텐츠 모듈. 주일(날짜)별로 회중별 설교노트를 입력하면
// 온라인 주보 설교노트 섹션이 해당 주일 날짜로 끌어와 표시. (편집기는 온라인 주보 안 설교노트와 동일)
const EMPTY: { noteDate: string; title: string; status: PostStatus; content: SermonNoteContent } = {
  noteDate: '', title: '', status: 'published', content: {},
};

export default function SermonNoteManagement() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(structuredClone(EMPTY));
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 20 });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useSermonNotes(params);
  const createMutation = useCreateSermonNote();
  const updateMutation = useUpdateSermonNote();
  const deleteMutation = useDeleteSermonNote();

  const handleCreate = () => { setEditingId(null); setForm(structuredClone(EMPTY)); setView('edit'); };
  const handleEdit = (item: SermonNote) => {
    setEditingId(item.id);
    setForm({
      noteDate: item.noteDate ? String(item.noteDate).slice(0, 10) : '',
      title: item.title ?? '',
      status: item.status,
      content: (item.content ?? {}) as SermonNoteContent,
    });
    setView('edit');
  };

  const save = (status: PostStatus) => {
    if (!form.noteDate) { showToast('error', '주일 날짜를 선택하세요.'); return; }
    const payload = { title: form.title, noteDate: form.noteDate, status, content: form.content } as Omit<SermonNote, 'id' | 'createdAt' | 'updatedAt'>;
    const onSuccess = () => { showToast('success', status === 'published' ? '게시되었습니다.' : '임시저장되었습니다.'); setView('list'); refetch(); };
    const onError = () => showToast('error', '오류가 발생했습니다.');
    if (editingId) updateMutation.mutate({ id: editingId, data: payload }, { onSuccess, onError });
    else createMutation.mutate(payload, { onSuccess, onError });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (view === 'edit') {
    return (
      <div className="admin-content mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => setView('list')} className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">‹ 설교노트 관리</button>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? '설교노트 수정' : '설교노트 작성'}</h2>
            <p className="mt-1 text-sm text-gray-500">주일 날짜별로 회중별 설교노트를 입력합니다. 온라인 주보가 이 날짜에 맞춰 끌어와 표시합니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={isSaving} onClick={() => save('draft')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">임시저장</button>
            <button type="button" disabled={isSaving} onClick={() => save('published')} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">게시</button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <FormRow>
            <FormField label="주일 날짜" required>
              <input type="date" value={form.noteDate} onChange={(e) => setForm((f) => ({ ...f, noteDate: e.target.value }))} className={inputClass} />
            </FormField>
            <FormField label="제목 (선택)">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 2026년 9월 27일 설교노트" className={inputClass} />
            </FormField>
            <FormField label="상태">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))} className={selectClass}>
                <option value="published">게시</option>
                <option value="draft">임시저장</option>
              </select>
            </FormField>
          </FormRow>

          <div className="border-t border-gray-100 pt-4">
            <SermonNoteEditor content={form.content} onChange={(content) => setForm((f) => ({ ...f, content }))} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">설교노트 관리</h2>
        <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">새 설교노트</button>
      </div>

      {isLoading && <TableSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}

      {data && data.data.length === 0 && !isLoading && (
        <EmptyState icon="📝" title="등록된 설교노트가 없습니다" description="주일 날짜별로 설교노트를 작성해보세요." actionLabel="설교노트 추가" onAction={handleCreate} />
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium">주일 날짜</th>
                <th className="px-4 py-3 text-left text-sm font-medium">제목</th>
                <th className="px-4 py-3 text-left text-sm font-medium">회중</th>
                <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((item) => {
                const cong = (item.content ?? {}).congregations ?? {};
                const filled = (['adult', 'em', 'youth', 'children', 'kids'] as const)
                  .filter((k) => ((cong[k]?.text || '').trim() || (cong[k]?.title || '').trim() || (cong[k]?.cartoonImageUrls?.length)))
                  .map((k) => ({ adult: '장년', em: 'EM', youth: 'Youth', children: '어린이', kids: 'Kids' }[k]));
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{item.noteDate ? String(item.noteDate).slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.title || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{filled.length ? filled.join(', ') : '—'}</td>
                    <td className="px-4 py-3 text-sm">{item.status === 'published' ? '게시' : item.status === 'draft' ? '임시저장' : '보관'}</td>
                    <td className="space-x-2 px-4 py-3 text-sm">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">편집</button>
                      <button onClick={() => setDeleteTarget({ id: item.id, name: (item.noteDate ? String(item.noteDate).slice(0, 10) : '') + ' ' + (item.title || '') })} disabled={deleteMutation.isPending} className="text-red-600 hover:underline disabled:opacity-50">삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}" 설교노트를 삭제하시겠습니까? 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget!.id, {
            onSuccess: () => { showToast('success', '삭제되었습니다.'); refetch(); },
            onError: () => showToast('error', '오류가 발생했습니다.'),
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
