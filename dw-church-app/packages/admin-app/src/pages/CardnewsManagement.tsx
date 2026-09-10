import { useState } from 'react';
import type { Cardnews } from '@dw-church/api-client';
import { useCardnews, useCreateCardnews, useUpdateCardnews, useDeleteCardnews, useDWChurchClient } from '@dw-church/api-client';
import { FormField, inputClass, selectClass, textareaClass, MultiImageUpload, useToast, ConfirmDialog, EmptyState, CardSkeleton } from '../components';

// 카드뉴스 관리 — Atlanta Koreatown 카드뉴스 레퍼런스 기반 "덱" 모델. 한 카드뉴스 =
// 한 주제를 여러 4:5 이미지 카드(이미지+캡션)로 넘겨 보는 묶음. 표지=첫 카드(자동).
// 홈페이지 "카드뉴스" 블록이 게시 덱을 표지 그리드/레일로 보여 주고, 누르면 뷰어가 열림.

type FormState = {
  title: string; category: string; description: string; linkUrl: string;
  sortOrder: number; status: 'published' | 'draft';
};
const EMPTY: FormState = { title: '', category: '', description: '', linkUrl: '', sortOrder: 0, status: 'published' };

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
  // 덱을 이루는 카드들 — 이미지 순서(MultiImageUpload가 순서변경·삭제·표지 관리) +
  // url 별 캡션(순서와 무관하게 url 키로 따라감).
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const setF = (p: Partial<FormState>) => setForm((s) => ({ ...s, ...p }));
  const decks = list ?? [];
  const categories = Array.from(new Set(decks.map((c) => c.category).filter(Boolean))) as string[];

  // 카드 이미지는 R2 로 업로드(클라이언트 리사이즈 2000px급 'content'). base64 폴백은 DB 초과.
  const uploadImage = async (file: File): Promise<string> => {
    const res = await apiClient!.uploadFile(file, 'cardnews');
    return res.url;
  };

  // 한 카드뉴스 행 → 편집용 카드 배열(레거시 flat 행은 image_url/description 으로 1장).
  const rowToCards = (c: Cardnews): { imageUrl: string; caption: string }[] => {
    if (Array.isArray(c.cards) && c.cards.length) return c.cards.map((x) => ({ imageUrl: x.imageUrl, caption: x.caption ?? '' }));
    if (c.imageUrl) return [{ imageUrl: c.imageUrl, caption: c.description ?? '' }];
    return [];
  };
  const cardCount = (c: Cardnews) => (Array.isArray(c.cards) && c.cards.length ? c.cards.length : (c.imageUrl ? 1 : 0));

  const openCreate = () => {
    setEditingId(null); setForm({ ...EMPTY, sortOrder: decks.length });
    setImageUrls([]); setCaptions({}); setView('edit');
  };
  const openEdit = (c: Cardnews) => {
    setEditingId(c.id);
    setForm({
      title: c.title ?? '', category: c.category ?? '', description: c.description ?? '',
      linkUrl: c.linkUrl ?? '', sortOrder: c.sortOrder ?? 0,
      status: (c.status as 'published' | 'draft') ?? 'published',
    });
    const cards = rowToCards(c);
    setImageUrls(cards.map((x) => x.imageUrl));
    setCaptions(Object.fromEntries(cards.map((x) => [x.imageUrl, x.caption])));
    setView('edit');
  };

  const save = () => {
    if (imageUrls.length === 0) { showToast('error', '카드 이미지를 한 장 이상 추가하세요.'); return; }
    const cards = imageUrls.map((u) => ({ imageUrl: u, caption: (captions[u] ?? '').trim() }));
    // 표지(imageUrl)는 서버가 첫 카드로 자동 동기화 — cards 만 보내면 됨.
    const payload = { ...form, category: form.category || null, cards };
    const cb = {
      onSuccess: () => { showToast('success', '저장되었습니다.'); setView('list'); },
      onError: () => { showToast('error', '오류가 발생했습니다.'); },
    };
    if (editingId) updateM.mutate({ id: editingId, data: payload }, cb);
    else createM.mutate(payload, cb);
  };

  const saving = createM.isPending || updateM.isPending;

  if (view === 'edit') {
    return (
      <div className="p-4 sm:p-6">
        <button onClick={() => setView('list')} className="mb-1 text-sm text-gray-400 hover:text-gray-600">← 카드뉴스 목록</button>
        <h2 className="mb-1 text-xl font-bold">{editingId ? '카드뉴스 수정' : '카드뉴스 추가'}</h2>
        <p className="mb-6 text-sm text-gray-500">한 주제를 여러 장의 카드로 만들어 넘겨 보게 합니다. 4:5(세로) 이미지를 권장하며, 첫 장이 표지가 됩니다.</p>

        <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
          <FormField label="카드 이미지 (여러 장 · 드래그로 순서 변경 · 첫 장이 표지)">
            <MultiImageUpload value={imageUrls} onChange={setImageUrls} onUpload={uploadImage} resize="content" max={40} />
          </FormField>

          {imageUrls.length > 0 && (
            <FormField label="카드별 설명 (선택 — 각 장 아래에 표시)">
              <div className="space-y-2.5">
                {imageUrls.map((u, i) => (
                  <div key={u} className="flex gap-3 rounded-xl border border-gray-200 p-2.5">
                    <div className="relative h-16 w-[52px] shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img src={u} alt="" className="h-full w-full object-cover" />
                      {i === 0 && <span className="absolute left-0.5 top-0.5 rounded bg-blue-600 px-1 py-0.5 text-[9px] font-bold text-white">표지</span>}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 text-[11px] font-semibold text-gray-400">{i + 1}장</div>
                      <textarea
                        className={textareaClass} rows={2}
                        value={captions[u] ?? ''}
                        onChange={(e) => setCaptions((s) => ({ ...s, [u]: e.target.value }))}
                        placeholder="이 카드에 대한 설명(선택)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </FormField>
          )}

          <FormField label="카테고리 (선택)">
            <input className={inputClass} list="cardnews-cats" value={form.category} onChange={(e) => setF({ category: e.target.value })} placeholder="예: 말씀 카드 · 모임 안내 (직접 입력하거나 기존에서 선택)" />
            <datalist id="cardnews-cats">{categories.map((cat) => <option key={cat} value={cat} />)}</datalist>
          </FormField>
          <FormField label="제목 (선택 — 표지·목록에 표시)">
            <input className={inputClass} value={form.title} onChange={(e) => setF({ title: e.target.value })} placeholder="예: 이번 주 말씀 카드뉴스" />
          </FormField>
          <FormField label="요약 설명 (한 줄 — 표지·목록에 표시)">
            <textarea className={textareaClass} rows={2} value={form.description} onChange={(e) => setF({ description: e.target.value })} placeholder="예: 이번 주 말씀을 카드로 한눈에" />
          </FormField>
          <FormField label="외부 링크 (선택 — 카드 대신 이 링크로 이동)">
            <input className={inputClass} value={form.linkUrl} onChange={(e) => setF({ linkUrl: e.target.value })} placeholder="https:// 또는 /bulletins (비우면 뷰어로 열림)" />
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
          <p className="mt-1 text-sm text-gray-500">한 주제를 여러 장의 카드로 전합니다. 홈페이지 "카드뉴스" 블록에 표지가 자동으로 표시됩니다.</p>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">＋ 카드뉴스 추가</button>
      </div>

      {isLoading && <CardSkeleton />}
      {error && <p className="text-red-500">오류가 발생했습니다.</p>}
      {list && decks.length === 0 && !isLoading && (
        <EmptyState icon="🗞️" title="등록된 카드뉴스가 없습니다" description="‘카드뉴스 추가’로 여러 장의 카드를 올려 보세요." />
      )}

      {decks.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {decks.map((c) => {
            const count = cardCount(c);
            return (
              <div key={c.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="relative bg-gray-100" style={{ aspectRatio: '4 / 5' }}>
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">🗞️</div>}
                  <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[11px] font-medium ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {c.status === 'published' ? '공개' : '임시'}
                  </span>
                  {count > 1 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gray-700 shadow-sm">{count}장</span>
                  )}
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
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="삭제 확인"
        message={`"${deleteTarget?.name || '제목 없음'}" 카드뉴스를 삭제하시겠습니까?`}
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
