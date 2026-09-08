import { useState } from 'react';
import type { Cardnews } from '@dw-church/api-client';
import { useCardnews, useCreateCardnews, useUpdateCardnews, useDeleteCardnews, useDWChurchClient } from '@dw-church/api-client';
import { FormField, inputClass, selectClass, textareaClass, ImageUpload, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 카드뉴스 관리 — 정사각 이미지 카드로 매주 소식을 전달(Claude Design 15a).
// 홈페이지 "카드뉴스" 블록이 여기 등록된 게시 카드를 자동으로 불러와 표시합니다.

type FormState = {
  title: string; description: string; imageUrl: string; linkUrl: string;
  sortOrder: number; status: 'published' | 'draft';
};
const EMPTY: FormState = { title: '', description: '', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'published' };

export default function CardnewsManagement() {
  const { data: list, isLoading, error } = useCardnews();
  const createM = useCreateCardnews();
  const updateM = useUpdateCardnews();
  const deleteM = useDeleteCardnews();
  const apiClient = useDWChurchClient();
  const { showToast } = useToast();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const setF = (p: Partial<FormState>) => setForm((s) => ({ ...s, ...p }));
  const cards = list ?? [];

  // 카드 이미지는 R2 로 업로드(정사각, 클라이언트 리사이즈). base64 폴백은 DB 길이 초과.
  const uploadImage = async (file: File): Promise<string> => {
    const res = await apiClient!.uploadFile(file, 'cardnews');
    return res.url;
  };

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY, sortOrder: cards.length }); setView('edit'); };
  const openEdit = (c: Cardnews) => {
    setEditingId(c.id);
    setForm({
      title: c.title ?? '', description: c.description ?? '', imageUrl: c.imageUrl ?? '',
      linkUrl: c.linkUrl ?? '', sortOrder: c.sortOrder ?? 0,
      status: (c.status as 'published' | 'draft') ?? 'published',
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
        <button onClick={() => setView('list')} className="mb-1 text-sm text-gray-400 hover:text-gray-600">← 카드뉴스 목록</button>
        <h2 className="mb-1 text-xl font-bold">{editingId ? '카드뉴스 수정' : '카드뉴스 추가'}</h2>
        <p className="mb-6 text-sm text-gray-500">정사각 이미지 카드 한 장을 등록하세요. 홈페이지 "카드뉴스"에 자동으로 표시됩니다.</p>

        <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
          <FormField label="카드 이미지 (정사각 권장)">
            <ImageUpload
              label=""
              value={form.imageUrl}
              onChange={(url) => setF({ imageUrl: url })}
              onUpload={uploadImage}
              aspectRatio="1/1"
              resize="content"
            />
          </FormField>
          <FormField label="제목 *">
            <input className={inputClass} value={form.title} onChange={(e) => setF({ title: e.target.value })} placeholder="예: 말씀 카드" />
          </FormField>
          <FormField label="설명 (한 줄)">
            <textarea className={textareaClass} rows={2} value={form.description} onChange={(e) => setF({ description: e.target.value })} placeholder="예: 이번 주 말씀을 한 장으로" />
          </FormField>
          <FormField label="링크 URL (선택 — 클릭 시 이동)">
            <input className={inputClass} value={form.linkUrl} onChange={(e) => setF({ linkUrl: e.target.value })} placeholder="https:// 또는 /bulletins (비우면 이동 없음)" />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="정렬 순서">
              <input type="number" className={inputClass} value={form.sortOrder} onChange={(e) => setF({ sortOrder: Number(e.target.value) || 0 })} />
            </FormField>
            <FormField label="상태">
              <select className={selectClass} value={form.status} onChange={(e) => setF({ status: e.target.value as 'published' | 'draft' })}>
                <option value="published">공개</option>
                <option value="draft">임시저장</option>
              </select>
            </FormField>
          </div>

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
          <h2 className="text-xl font-bold">카드뉴스</h2>
          <p className="mt-1 text-sm text-gray-500">정사각 이미지 카드로 소식을 전합니다. 홈페이지 "카드뉴스" 블록에 자동으로 표시됩니다.</p>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ 카드 추가</button>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}
      {list && cards.length === 0 && !isLoading && (
        <EmptyState icon="🗞️" title="등록된 카드뉴스가 없습니다" description="‘카드 추가’로 정사각 이미지 카드를 등록하세요." />
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="relative aspect-square bg-gray-100">
                {c.imageUrl
                  ? <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">🗞️</div>}
                <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[11px] font-medium ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {c.status === 'published' ? '공개' : '임시'}
                </span>
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-semibold text-gray-800">{c.title}</div>
                {c.description && <div className="mt-0.5 truncate text-xs text-gray-400">{c.description}</div>}
                <div className="mt-2 flex justify-end gap-3">
                  <button onClick={() => openEdit(c)} className="text-xs font-medium text-blue-600 hover:underline">수정</button>
                  <button onClick={() => setDeleteTarget({ id: c.id, name: c.title || '' })} className="text-xs text-red-600 hover:underline">삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name}" 카드를 삭제하시겠습니까?`}
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
