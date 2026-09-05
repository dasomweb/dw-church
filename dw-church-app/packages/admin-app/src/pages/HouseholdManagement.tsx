import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, useToast, EmptyState } from '../components';

/**
 * 교적관리 — 세대(가족) 관리 (FM-01 목록 · FM-02 상세). 세대는 가족 단위이며
 * 교인(members)이 household_id 로 소속된다. 세대주는 세대 상세에서 구성원 중
 * 지정한다. 교회 행정 애드온('membership').
 */
type HH = Record<string, any>;

const emptyForm = { name: '', region: '', address: '', phone: '', memo: '' };
type Form = typeof emptyForm;

export default function HouseholdManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [q, setQ] = useState('');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const listQ = useQuery({
    queryKey: ['households', q],
    queryFn: async () => {
      const params: Record<string, unknown> = { perPage: 200 };
      if (q.trim()) params.q = q.trim();
      const res = await api.get<{ data: { items: HH[]; total: number } }>('/api/v1/households', params);
      return (res as any).data as { items: HH[]; total: number };
    },
  });

  const detailQ = useQuery({
    queryKey: ['household', detailId],
    enabled: !!detailId && view === 'detail',
    queryFn: async () => {
      const res = await api.get<{ data: HH }>(`/api/v1/households/${detailId}`);
      return (res as any).data as HH;
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['households'] });
    void qc.invalidateQueries({ queryKey: ['households-select'] });
    if (detailId) void qc.invalidateQueries({ queryKey: ['household', detailId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return api.put(`/api/v1/households/${editingId}`, form);
      return api.post('/api/v1/households', form);
    },
    onSuccess: () => { showToast('success', editingId ? '수정되었습니다.' : '세대를 등록했습니다.'); invalidate(); setView('list'); },
    onError: (e: any) => showToast('error', e?.message || '저장 실패'),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setView('edit'); };
  const openEdit = (h: HH) => {
    setEditingId(h.id);
    setForm({ name: h.name ?? '', region: h.region ?? '', address: h.address ?? '', phone: h.phone ?? '', memo: h.memo ?? '' });
    setView('edit');
  };
  const openDetail = (id: string) => { setDetailId(id); setView('detail'); };

  const remove = async (h: HH) => {
    if (!window.confirm(`${h.name || '이 세대'}를 삭제할까요? (구성원 교인은 삭제되지 않고 세대만 해제됩니다)`)) return;
    try { await api.delete(`/api/v1/households/${h.id}`); showToast('success', '삭제되었습니다.'); invalidate(); }
    catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  const setHead = async (hhId: string, memberId: string) => {
    try {
      await api.put(`/api/v1/households/${hhId}`, { headMemberId: memberId });
      await api.put(`/api/v1/members/${memberId}`, { isHead: true });
      showToast('success', '세대주를 지정했습니다.');
      invalidate();
    } catch (e: any) { showToast('error', e?.message || '지정 실패'); }
  };

  // ── DETAIL ──
  if (view === 'detail') {
    const h = detailQ.data;
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 세대 목록으로</button>
        {!h ? <div className="p-8 text-center text-gray-400 text-sm">불러오는 중…</div> : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{h.name || '(무제 세대)'}</h2>
                <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-y-1 gap-x-6 max-w-lg">
                  <span>구역 · {h.region || '—'}</span><span>전화 · {h.phone || '—'}</span>
                  <span className="col-span-2">주소 · {h.address || '—'}</span>
                </div>
                {h.memo && <p className="mt-2 text-sm text-gray-500 whitespace-pre-wrap">{h.memo}</p>}
              </div>
              <button onClick={() => openEdit(h)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">수정</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">구성원 {(h.members ?? []).length}명</h3>
              {(h.members ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">구성원이 없습니다. 교인 명부에서 교인의 &lsquo;세대&rsquo;를 이 세대로 지정하세요.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {(h.members ?? []).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 py-2.5">
                      {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{(m.name || '·')[0]}</span>}
                      <span className="font-medium text-gray-800">{m.name}</span>
                      {m.position && <span className="text-xs text-gray-500">{m.position}</span>}
                      {m.isHead ? <span className="text-xs font-medium bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">세대주</span>
                        : <button onClick={() => setHead(h.id, m.id)} className="ml-auto text-xs text-gray-400 hover:text-blue-600">세대주 지정</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── EDIT ──
  if (view === 'edit') {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 세대 목록으로</button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold">{editingId ? '세대 수정' : '세대 등록'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">세대명</label><input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 김철수 세대" /></div>
            <div><label className="block text-sm font-medium mb-1">구역</label><input className={inputClass} value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="예: 1구역" /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">주소</label><input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">전화</label><input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(201) 555-0000" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">메모</label><textarea rows={3} className={textareaClass} value={form.memo} onChange={(e) => set('memo', e.target.value)} /></div>
          <div className="flex gap-2 pt-1">
            <button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saveMutation.isPending ? '저장 중…' : '저장'}</button>
            <button onClick={() => setView('list')} className="px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">취소</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST ──
  const items = listQ.data?.items ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">세대 · 가족</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ 세대 등록</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <input className={inputClass} placeholder="세대명 · 주소 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {listQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
          items.length === 0 ? <EmptyState icon="🏠" title="세대가 없습니다" description="'세대 등록'으로 가족 단위를 추가하세요." actionLabel="세대 등록" onAction={openCreate} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">세대명</th><th className="px-4 py-3 font-medium">구역</th><th className="px-4 py-3 font-medium">세대주</th><th className="px-4 py-3 font-medium">구성원</th><th className="px-4 py-3 font-medium">전화</th><th className="px-4 py-3 font-medium text-right">작업</th>
                </tr></thead>
                <tbody>
                  {items.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3"><button onClick={() => openDetail(h.id)} className="font-medium text-gray-800 hover:text-blue-600">{h.name || '(무제)'}</button></td>
                      <td className="px-4 py-3 text-gray-600">{h.region || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{h.headName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{h.memberCount ?? 0}명</td>
                      <td className="px-4 py-3 text-gray-600">{h.phone || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(h)} className="text-xs text-gray-500 hover:text-gray-700 mr-3">수정</button>
                        <button onClick={() => remove(h)} className="text-xs text-red-500 hover:text-red-600">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <p className="text-xs text-gray-400">총 {listQ.data?.total ?? 0}세대</p>
    </div>
  );
}
