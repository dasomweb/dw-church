import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast } from '../components';
import { serverErr } from '../lib/server-err';

/**
 * 교적관리 — 교적 코드 관리 (SE-01). 직분·신급·등록상태·심방유형·조직유형 코드를
 * 교회가 직접 편집한다. 교인 등록 폼의 직분/신급 드롭다운이 여기 값을 씀.
 */
type Code = { id: string; category: string; label: string; sortOrder: number; isActive: boolean };

const CATS: { key: string; label: string }[] = [
  { key: 'position', label: '직분' },
  { key: 'faith_level', label: '신급' },
  { key: 'reg_status', label: '등록상태' },
  { key: 'visit_type', label: '심방유형' },
  { key: 'org_type', label: '조직유형' },
];

export default function MemberCodeManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [cat, setCat] = useState('position');
  const [newLabel, setNewLabel] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const codesQ = useQuery({
    queryKey: ['member-codes-admin'],
    queryFn: async () => {
      const res = await api.get<{ data: Code[] }>('/api/v1/member-codes');
      return (res as any).data as Code[];
    },
  });

  const inCat = useMemo(
    () => (codesQ.data ?? []).filter((c) => c.category === cat).sort((a, b) => a.sortOrder - b.sortOrder),
    [codesQ.data, cat],
  );
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['member-codes-admin'] });
    void qc.invalidateQueries({ queryKey: ['member-codes'] }); // 교인 폼 드롭다운도 갱신
  };

  const add = useMutation({
    mutationFn: () => api.post('/api/v1/member-codes', { category: cat, label: newLabel.trim(), sortOrder: inCat.length }),
    onSuccess: () => { setNewLabel(''); invalidate(); },
    onError: (e: any) => showToast('error', e?.message || '추가 실패'),
  });

  const toggle = async (c: Code) => {
    try { await api.put(`/api/v1/member-codes/${c.id}`, { isActive: !c.isActive }); invalidate(); }
    catch (e) { showToast('error', serverErr(e, '변경 실패')); }
  };
  const remove = async (c: Code) => {
    if (!window.confirm(`'${c.label}' 코드를 삭제할까요? (사용 중이면 삭제되지 않습니다)`)) return;
    try { await api.delete(`/api/v1/member-codes/${c.id}`); invalidate(); }
    catch (e) { showToast('error', serverErr(e, '삭제 실패')); }
  };
  const startEdit = (c: Code) => { setEditId(c.id); setEditLabel(c.label); };
  const saveEdit = async (c: Code) => {
    const label = editLabel.trim();
    if (!label || label === c.label) { setEditId(null); return; }
    try {
      await api.put(`/api/v1/member-codes/${c.id}`, { label });
      setEditId(null);
      invalidate();
      void qc.invalidateQueries({ queryKey: ['members'] }); // 사용처 표기도 갱신
      showToast('success', '이름을 수정했습니다. 이 코드를 쓰던 교인/기록도 함께 반영됩니다.');
    } catch (e) { showToast('error', serverErr(e, '수정 실패')); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">교적 코드</h1>
        <p className="text-sm text-gray-500 mt-1">직분·신급 등 목록을 교회에 맞게 편집합니다. 교인 등록 폼의 드롭다운에 반영됩니다.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${cat === c.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex gap-2">
          <input className={`${inputClass} flex-1`} placeholder={`새 ${CATS.find((c) => c.key === cat)?.label} 추가`} value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newLabel.trim()) add.mutate(); }} />
          <button disabled={!newLabel.trim() || add.isPending} onClick={() => add.mutate()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">추가</button>
        </div>

        {codesQ.isLoading ? <div className="py-6 text-center text-sm text-gray-400">불러오는 중…</div> :
          inCat.length === 0 ? <div className="py-6 text-center text-sm text-gray-400">코드가 없습니다. 위에서 추가하세요.</div> : (
            <div className="divide-y divide-gray-50">
              {inCat.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  {editId === c.id ? (
                    <>
                      <input autoFocus className={`${inputClass} flex-1`} value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(c); if (e.key === 'Escape') setEditId(null); }} />
                      <button onClick={() => saveEdit(c)} className="text-xs font-medium text-blue-600 hover:text-blue-700">저장</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(c)} className={`flex-1 text-left text-sm ${c.isActive ? 'text-gray-800 hover:text-blue-600' : 'text-gray-400 line-through'}`} title="이름 수정">{c.label}</button>
                      <button onClick={() => toggle(c)} className="text-xs text-gray-400 hover:text-gray-700">{c.isActive ? '숨기기' : '사용'}</button>
                      <button onClick={() => remove(c)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
