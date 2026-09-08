import { useState } from 'react';
import type { Cardnews } from '@dw-church/api-client';
import { useCardnews, useCreateCardnews, useUpdateCardnews, useDeleteCardnews, useDWChurchClient } from '@dw-church/api-client';
import { FormField, inputClass, selectClass, textareaClass, ImageUpload, MultiImageUpload, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 카드뉴스 관리 — 정사각 이미지 카드로 매주 소식을 전달(Claude Design 15a).
// 홈페이지 "카드뉴스" 블록이 여기 등록된 게시 카드를 자동으로 불러와 표시합니다.

type FormState = {
  title: string; category: string; description: string; imageUrl: string; linkUrl: string;
  sortOrder: number; status: 'published' | 'draft';
};
const EMPTY: FormState = { title: '', category: '', description: '', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'published' };

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
  // 멀티파일 업로드 — 여러 이미지를 스테이징 후 각 장을 카드로 생성.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUrls, setBulkUrls] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const setF = (p: Partial<FormState>) => setForm((s) => ({ ...s, ...p }));
  const cards = list ?? [];
  // 기존 카드에서 쓰인 카테고리 목록(자동완성용).
  const categories = Array.from(new Set(cards.map((c) => c.category).filter(Boolean))) as string[];

  // 카드 이미지는 R2 로 업로드(정사각, 클라이언트 리사이즈). base64 폴백은 DB 길이 초과.
  const uploadImage = async (file: File): Promise<string> => {
    const res = await apiClient!.uploadFile(file, 'cardnews');
    return res.url;
  };

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY, sortOrder: cards.length }); setView('edit'); };
  const openEdit = (c: Cardnews) => {
    setEditingId(c.id);
    setForm({
      title: c.title ?? '', category: c.category ?? '', description: c.description ?? '', imageUrl: c.imageUrl ?? '',
      linkUrl: c.linkUrl ?? '', sortOrder: c.sortOrder ?? 0,
      status: (c.status as 'published' | 'draft') ?? 'published',
    });
    setView('edit');
  };

  const save = () => {
    if (!form.title.trim() && !form.imageUrl) { showToast('error', '제목이나 이미지를 넣어주세요.'); return; }
    const cb = {
      onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
      onError: () => { showToast('error', '오류가 발생했습니다.'); },
    };
    if (editingId) updateM.mutate({ id: editingId, data: form }, cb);
    else createM.mutate(form, cb);
  };

  // 멀티파일 업로드 — 스테이징된 이미지 각각을 카드뉴스로 생성(제목 없이, 나중에 편집).
  const bulkCreate = async () => {
    if (!bulkUrls.length) { showToast('error', '업로드된 이미지가 없습니다.'); return; }
    setBulkSaving(true);
    try {
      for (let k = 0; k < bulkUrls.length; k++) {
        await createM.mutateAsync({ imageUrl: bulkUrls[k], title: '', category: bulkCategory || undefined, status: 'published', sortOrder: cards.length + k });
      }
      showToast('success', `${bulkUrls.length}장을 카드뉴스로 추가했습니다.`);
      setBulkUrls([]); setBulkCategory(''); setBulkOpen(false);
    } catch { showToast('error', '일부 업로드에 실패했습니다.'); }
    setBulkSaving(false);
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
          <FormField label="카테고리 (선택)">
            <input className={inputClass} list="cardnews-cats" value={form.category} onChange={(e) => setF({ category: e.target.value })} placeholder="예: 말씀 카드 · 모임 안내 (직접 입력하거나 기존에서 선택)" />
            <datalist id="cardnews-cats">{categories.map((cat) => <option key={cat} value={cat} />)}</datalist>
          </FormField>
          <FormField label="제목 (선택)">
            <input className={inputClass} value={form.title} onChange={(e) => setF({ title: e.target.value })} placeholder="예: 이번 주 말씀 한 장" />
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
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setBulkOpen((v) => !v)} className="rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50">📷 여러 장 업로드</button>
          <button onClick={openCreate} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ 카드 추가</button>
        </div>
      </div>

      {bulkOpen && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
          <div className="mb-1 text-sm font-semibold text-gray-800">여러 장 한번에 업로드</div>
          <p className="mb-3 text-xs text-gray-500">이미지를 한꺼번에 선택하면 각 장이 카드뉴스 한 장으로 등록됩니다. 제목·설명은 나중에 카드별로 수정할 수 있어요.</p>
          <div className="mb-3">
            <input className={inputClass} list="cardnews-cats" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} placeholder="카테고리 (선택) — 업로드하는 모든 장에 적용. 예: 모임 안내" />
            <datalist id="cardnews-cats">{categories.map((cat) => <option key={cat} value={cat} />)}</datalist>
          </div>
          <MultiImageUpload value={bulkUrls} onChange={setBulkUrls} onUpload={uploadImage} resize="content" max={30} />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button onClick={() => { setBulkUrls([]); setBulkOpen(false); }} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
            <button onClick={bulkCreate} disabled={bulkSaving || bulkUrls.length === 0} className="rounded-xl bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {bulkSaving ? '추가 중…' : `이 이미지로 카드 만들기${bulkUrls.length ? ` (${bulkUrls.length}장)` : ''}`}
            </button>
          </div>
        </div>
      )}

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
                {c.category && <div className="mb-1"><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600">{c.category}</span></div>}
                <div className="truncate text-sm font-semibold text-gray-800">{c.title || <span className="font-normal text-gray-400">(제목 없음)</span>}</div>
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
