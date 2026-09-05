import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, useToast, EmptyState } from '../components';
import { MemberPicker } from '../components/MemberPicker';

/**
 * 교적관리 — 심방 · 상담 목록(VS-01) + 기록 작성(VS-02). 교회 행정 애드온.
 * 공개범위(visibility)를 저장하지만 범위 제한(scoped access, SE-02)은 다음 단계.
 */
type Row = Record<string, any>;
const TYPE_OPTS = ['심방', '전화심방', '상담'];
const VIS_LABEL: Record<string, string> = { self: '본인만', pastors: '교역자', all: '전체' };
const emptyForm = { memberId: '', visitor: '', visitDate: '', visitType: '심방', content: '', prayer: '', followup: '', visibility: 'pastors', status: 'done' };
type Form = typeof emptyForm;

export default function VisitManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [statusFilter, setStatusFilter] = useState('');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const listQ = useQuery({
    queryKey: ['visits', statusFilter],
    queryFn: async () => {
      const res = await api.get<{ data: Row[] }>('/api/v1/member-visits', statusFilter ? { status: statusFilter } : {});
      return (res as any).data as Row[];
    },
  });
  const membersQ = useQuery({
    queryKey: ['members-for-visit'],
    enabled: view === 'edit',
    queryFn: async () => {
      const res = await api.get<{ data: { items: Row[] } }>('/api/v1/members', { regStatus: 'all', perPage: 500 });
      return ((res as any).data.items ?? []) as Row[];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['visits'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { ...form };
      if (!body.visitDate) delete body.visitDate;
      if (editingId) { const { memberId, ...rest } = body; return api.put(`/api/v1/member-visits/${editingId}`, rest); }
      return api.post('/api/v1/member-visits', body);
    },
    onSuccess: () => { showToast('success', editingId ? '수정되었습니다.' : '심방 기록을 저장했습니다.'); void invalidate(); setView('list'); },
    onError: (e: any) => showToast('error', e?.message || '저장 실패'),
  });

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, visitDate: new Date().toISOString().slice(0, 10) }); setView('edit'); };
  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({ memberId: r.memberId, visitor: r.visitor ?? '', visitDate: (r.visitDate ?? '').slice(0, 10), visitType: r.visitType ?? '심방', content: r.content ?? '', prayer: r.prayer ?? '', followup: r.followup ?? '', visibility: r.visibility ?? 'pastors', status: r.status ?? 'done' });
    setView('edit');
  };
  const remove = async (r: Row) => {
    if (!window.confirm('이 심방 기록을 삭제할까요?')) return;
    try { await api.delete(`/api/v1/member-visits/${r.id}`); void invalidate(); } catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  if (view === 'edit') {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 심방 목록으로</button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold">{editingId ? '심방 기록 수정' : '심방 기록 작성'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">대상 교인 *</label>
              <MemberPicker members={(membersQ.data ?? []) as any} value={form.memberId} onChange={(id) => set('memberId', id)} disabled={!!editingId} placeholder="이름 검색으로 대상 교인 선택" />
            </div>
            <div><label className="block text-sm font-medium mb-1">담당자</label><input className={inputClass} value={form.visitor} onChange={(e) => set('visitor', e.target.value)} placeholder="심방자" /></div>
            <div><label className="block text-sm font-medium mb-1">일자</label><input type="date" className={inputClass} value={form.visitDate} onChange={(e) => set('visitDate', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">유형</label>
              <select className={inputClass} value={form.visitType} onChange={(e) => set('visitType', e.target.value)}>{TYPE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">공개범위</label>
              <select className={inputClass} value={form.visibility} onChange={(e) => set('visibility', e.target.value)}><option value="self">본인만</option><option value="pastors">교역자</option><option value="all">전체</option></select></div>
            <div><label className="block text-sm font-medium mb-1">상태</label>
              <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}><option value="done">완료</option><option value="planned">예정</option></select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">내용</label><textarea rows={4} className={textareaClass} value={form.content} onChange={(e) => set('content', e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">기도제목</label><textarea rows={2} className={textareaClass} value={form.prayer} onChange={(e) => set('prayer', e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">후속조치</label><textarea rows={2} className={textareaClass} value={form.followup} onChange={(e) => set('followup', e.target.value)} /></div>
          <div className="flex gap-2 pt-1">
            <button disabled={saveMutation.isPending || !form.memberId} onClick={() => { if (!form.memberId) { showToast('error', '대상 교인을 선택하세요.'); return; } saveMutation.mutate(); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saveMutation.isPending ? '저장 중…' : '저장'}</button>
            <button onClick={() => setView('list')} className="px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">취소</button>
          </div>
        </div>
      </div>
    );
  }

  const rows = listQ.data ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">심방 · 상담</h1>
        <div className="flex gap-2">
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">전체</option><option value="done">완료</option><option value="planned">예정</option></select>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap">+ 심방 기록</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {listQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
          rows.length === 0 ? <EmptyState icon="🙏" title="심방 기록이 없습니다" description="'심방 기록'으로 첫 기록을 작성하세요." actionLabel="심방 기록" onAction={openCreate} /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="px-4 py-3 font-medium">교인</th><th className="px-4 py-3 font-medium">일자</th><th className="px-4 py-3 font-medium">유형</th><th className="px-4 py-3 font-medium">담당</th><th className="px-4 py-3 font-medium">공개</th><th className="px-4 py-3 font-medium">상태</th><th className="px-4 py-3 font-medium text-right">작업</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.memberName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.visitDate ? String(r.visitDate).slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.visitType}</td>
                    <td className="px-4 py-3 text-gray-600">{r.visitor || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{VIS_LABEL[r.visibility] ?? r.visibility}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium ${r.status === 'planned' ? 'text-amber-600' : 'text-gray-500'}`}>{r.status === 'planned' ? '예정' : '완료'}</span></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="text-xs text-gray-500 hover:text-gray-700 mr-3">수정</button>
                      <button onClick={() => remove(r)} className="text-xs text-red-500 hover:text-red-600">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
