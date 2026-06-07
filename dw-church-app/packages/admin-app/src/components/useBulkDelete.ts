import { useState } from 'react';
import { useToast } from './index';

/**
 * Reusable multi-select + bulk-delete for the content management tables
 * (설교/주보/칼럼/앨범/행사/교역자/연혁/게시판). Each page passes its own
 * single-item delete (id => mutateAsync) and a refetch; the hook handles
 * selection state, select-all, confirm, parallel delete, and toasts.
 */
export function useBulkDelete<T extends { id: string }>(opts: {
  deleteOne: (id: string) => Promise<unknown>;
  onDone?: () => void;
}) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const toggleAll = (items: T[]) =>
    setSelected((p) => {
      const ids = items.map((i) => i.id);
      const all = ids.length > 0 && ids.every((id) => p.has(id));
      const n = new Set(p);
      if (all) ids.forEach((id) => n.delete(id)); else ids.forEach((id) => n.add(id));
      return n;
    });

  const isAllSelected = (items: T[]) => items.length > 0 && items.every((i) => selected.has(i.id));
  const has = (id: string) => selected.has(id);
  const clear = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (selected.size === 0 || busy) return;
    if (!window.confirm(`선택한 ${selected.size}개를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    const ids = [...selected];
    let ok = 0;
    await Promise.all(
      ids.map(async (id) => { try { await opts.deleteOne(id); ok++; } catch { /* tallied below */ } }),
    );
    setBusy(false);
    clear();
    if (ok === ids.length) showToast('success', `${ok}개 삭제되었습니다.`);
    else showToast('error', `${ok}/${ids.length}개만 삭제됨 (일부 실패)`);
    opts.onDone?.();
  };

  return { selected, has, toggle, toggleAll, isAllSelected, clear, deleteSelected, busy, count: selected.size };
}
