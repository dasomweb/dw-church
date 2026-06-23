import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner } from '../shared/admin-ui';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Reference Data (참조 데이터 — 교단 대조 목록 관리) ───
// ═══════════════════════════════════════════════════════════
type RefDenomStatus = 'recognized' | 'watch' | 'cult';

interface RefDenom {
  id: string;
  name: string;
  country: 'KR' | 'US' | '';
  status: RefDenomStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const REF_STATUS_META: Record<RefDenomStatus, { label: string; headerCls: string; badgeCls: string }> = {
  recognized: { label: '정규 교단', headerCls: 'bg-green-50 text-green-800 border-green-200', badgeCls: 'bg-green-100 text-green-700' },
  watch: { label: '주의', headerCls: 'bg-amber-50 text-amber-800 border-amber-200', badgeCls: 'bg-amber-100 text-amber-700' },
  cult: { label: '이단', headerCls: 'bg-red-50 text-red-800 border-red-200', badgeCls: 'bg-red-100 text-red-700' },
};

const REF_STATUS_ORDER: RefDenomStatus[] = ['recognized', 'watch', 'cult'];

function countryLabel(c: string): string {
  if (c === 'KR') return '한국';
  if (c === 'US') return '미국';
  return '공통';
}

export default function ReferenceDataTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [items, setItems] = useState<RefDenom[]>([]);
  const [loading, setLoading] = useState(true);

  // 추가 폼 상태
  const [form, setForm] = useState<{ name: string; country: 'KR' | 'US' | ''; status: RefDenomStatus; note: string }>({
    name: '',
    country: '',
    status: 'recognized',
    note: '',
  });
  const [adding, setAdding] = useState(false);

  // 인라인 편집 상태 (편집 중인 행 id 와 임시 값)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; country: 'KR' | 'US' | ''; status: RefDenomStatus; note: string }>({
    name: '',
    country: '',
    status: 'recognized',
    note: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: RefDenom[] } | RefDenom[]>('/reference-denominations');
      setItems(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '참조 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || adding) return;
    setAdding(true);
    try {
      await apiFetch('/reference-denominations', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          country: form.country,
          status: form.status,
          note: form.note.trim() || null,
        }),
      });
      showToast('success', '추가되었습니다.');
      setForm({ name: '', country: '', status: 'recognized', note: '' });
      void fetchItems();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: RefDenom) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      country: item.country,
      status: item.status,
      note: item.note ?? '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/reference-denominations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          country: editForm.country,
          status: editForm.status,
          note: editForm.note.trim() || null,
        }),
      });
      showToast('success', '수정되었습니다.');
      setEditingId(null);
      void fetchItems();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '수정 실패');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (item: RefDenom) => {
    if (!window.confirm(`"${item.name}"을(를) 참조 목록에서 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(`/reference-denominations/${item.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      void fetchItems();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const grouped = (status: RefDenomStatus) => items.filter((i) => i.status === status);

  return (
    <div className="space-y-5">
      {/* 설명 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        신청서의 교단·교회명을 이 목록과 자동 대조해 배지를 표시합니다. 최종 판단은 직접 하세요.
      </div>

      {/* 추가 폼 */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">이름 *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="대한예수교장로회 (합동)"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-500 mb-1">국가</label>
          <select
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value as 'KR' | 'US' | '' }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">공통</option>
            <option value="KR">한국</option>
            <option value="US">미국</option>
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">분류</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as RefDenomStatus }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {REF_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {REF_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
          <input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="비고 (선택)"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !form.name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? '추가 중...' : '추가'}
        </button>
      </form>

      {/* 그룹별 섹션 */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {REF_STATUS_ORDER.map((s) => {
            const rows = grouped(s);
            const meta = REF_STATUS_META[s];
            return (
              <div key={s} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`px-4 py-2.5 border-b text-sm font-semibold flex items-center justify-between ${meta.headerCls}`}>
                  <span>{meta.label}</span>
                  <span className="text-xs font-medium">{rows.length}개</span>
                </div>
                {rows.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-400">등록된 항목이 없습니다.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {rows.map((item) =>
                      editingId === item.id ? (
                        <div key={item.id} className="px-4 py-3 flex flex-wrap items-end gap-2 bg-blue-50/40">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={editForm.country}
                            onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value as 'KR' | 'US' | '' }))}
                            className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">공통</option>
                            <option value="KR">한국</option>
                            <option value="US">미국</option>
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as RefDenomStatus }))}
                            className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {REF_STATUS_ORDER.map((st) => (
                              <option key={st} value={st}>
                                {REF_STATUS_META[st].label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={editForm.note}
                            onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                            placeholder="메모"
                            className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={savingEdit || !editForm.name.trim()}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingEdit ? '저장 중...' : '저장'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                              <span className="text-xs text-gray-400">{countryLabel(item.country)}</span>
                            </div>
                            {item.note && <p className="text-xs text-gray-500 mt-0.5 break-all">{item.note}</p>}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => startEdit(item)}
                              className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
