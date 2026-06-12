import { useEffect, useState, useCallback } from 'react';
import { useToast } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

// A category as seen by the manager. The api-client returns these (camelCased)
// from the dedicated *-categories endpoints; extra fields (createdAt, count)
// are ignored — we only read/write id/name/slug.
export interface CategoryManagerItem {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryManagerProps {
  /** Heading shown at the top of the panel, e.g. "앨범 카테고리". */
  title?: string;
  list: () => Promise<CategoryManagerItem[]>;
  create: (name: string, slug: string) => Promise<unknown>;
  update: (id: string, patch: { name?: string; slug?: string }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  onClose: () => void;
  /** Fired after any successful create/update/delete so the parent can refetch
   * its own category dropdown. */
  onChanged?: () => void;
}

const SLUG_RE = /^[a-z0-9-]+$/;

// Auto-derive an ascii slug from a (possibly Korean) name. Non-ascii chars are
// stripped, so a Korean-only name yields an empty slug — the operator must then
// type one explicitly (validated against SLUG_RE before submit).
function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CategoryManager({
  title = '카테고리 관리',
  list,
  create,
  update,
  remove,
  onClose,
  onChanged,
}: CategoryManagerProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<CategoryManagerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Inline edit state (one row at a time).
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  // Add-row state.
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  // Delete confirm.
  const [deleteTarget, setDeleteTarget] = useState<CategoryManagerItem | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await list();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '카테고리를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [list, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startEdit = (item: CategoryManagerItem) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditSlug(item.slug);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditSlug('');
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    const slug = (editSlug.trim() || slugify(name));
    if (!name) { showToast('error', '카테고리 이름을 입력하세요.'); return; }
    if (!SLUG_RE.test(slug)) {
      showToast('error', '슬러그는 영문 소문자/숫자/하이픈만 가능합니다. (예: sunday-sermon)');
      return;
    }
    setBusy(true);
    try {
      await update(id, { name, slug });
      showToast('success', '수정되었습니다.');
      cancelEdit();
      await reload();
      onChanged?.();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '수정에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const addCategory = async () => {
    const name = newName.trim();
    const slug = (newSlug.trim() || slugify(name));
    if (!name) { showToast('error', '카테고리 이름을 입력하세요.'); return; }
    if (!SLUG_RE.test(slug)) {
      showToast('error', '슬러그는 영문 소문자/숫자/하이픈만 가능합니다. (예: sunday-sermon)');
      return;
    }
    setBusy(true);
    try {
      await create(name, slug);
      showToast('success', `카테고리 "${name}" 추가됨`);
      setNewName('');
      setNewSlug('');
      await reload();
      onChanged?.();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '추가에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBusy(true);
    try {
      await remove(target.id);
      showToast('success', '삭제되었습니다.');
      await reload();
      onChanged?.();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 py-6 text-center">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">등록된 카테고리가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="py-2">
                  {editId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="이름"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        placeholder="슬러그"
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => void saveEdit(item.id)}
                        disabled={busy || !editName.trim()}
                        className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        className="shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{item.slug}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={busy}
                        className="shrink-0 text-sm text-blue-600 hover:underline disabled:opacity-50"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        disabled={busy}
                        className="shrink-0 text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">새 카테고리 추가 (슬러그를 비우면 이름에서 자동 생성)</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름 (예: 주일설교)"
              className={inputCls}
            />
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="슬러그 (예: sunday-sermon)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => void addCategory()}
              disabled={busy || !newName.trim()}
              className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              + 추가
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="카테고리 삭제"
        message={`"${deleteTarget?.name}" 카테고리를 삭제하시겠습니까? 이 카테고리를 사용하는 항목은 분류가 해제됩니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
