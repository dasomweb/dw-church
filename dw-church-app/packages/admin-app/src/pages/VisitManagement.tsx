import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, useToast, useConfirm, EmptyState } from '../components';
import { MemberPicker } from '../components/MemberPicker';

/**
 * 교적관리 — 심방·상담 목록(VS-01) + 기록 작성(VS-02, 화면 시안 그대로).
 * 대상 교인 카드 + 유형(심방/전화/상담) 버튼 + 일시 + 내용 + 기도제목 +
 * 공개 범위(본인만/교역자/전체) 버튼. 범위 제한(scoped access)은 다음 단계.
 */
type Row = Record<string, any>;
const TYPE_OPTS: [string, string][] = [['심방', '심방'], ['전화심방', '전화'], ['상담', '상담']];
// 목록 표시 라벨 = 폼 버튼 라벨과 동일(저장값 '전화심방'→'전화'). 미상 값은 원본 표시.
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTS.map(([v, l]) => [v, l]));
const VIS_OPTS: [string, string][] = [['self', '본인만'], ['pastors', '교역자'], ['all', '전체']];
const VIS_LABEL: Record<string, string> = { self: '본인만', pastors: '교역자', all: '전체' };
const emptyForm = { memberId: '', visitor: '', visitDate: '', visitType: '심방', content: '', prayer: '', followup: '', visibility: 'pastors', status: 'done' };
type Form = typeof emptyForm;

const C = {
  brand: '#1466d6', brandBg: '#e8f0fe', brandBg2: '#c8dcfa', ink: '#16181d', text: '#3c4353',
  muted: '#61697a', faint: '#8b93a3', border: '#e5e7eb', border2: '#dfe3ea', line2: '#f2f4f7',
  surface: '#f7f8fa', warn: '#b98307', danger: '#dc2626', avatarBg: '#dfe3ea',
};
const initial = (n?: string) => (n || '·').trim().charAt(0) || '·';
const ymd = (d?: string) => (d ? String(d).slice(0, 10) : '');

export default function VisitManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [statusFilter, setStatusFilter] = useState('');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const listQ = useQuery({
    queryKey: ['visits', statusFilter],
    queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/member-visits', statusFilter ? { status: statusFilter } : {}) as any).data as Row[],
  });
  const membersQ = useQuery({
    queryKey: ['members-for-visit'],
    enabled: view === 'edit',
    queryFn: async () => ((await api.get<{ data: { items: Row[] } }>('/api/v1/members', { regStatus: 'all', perPage: 500 }) as any).data.items ?? []) as Row[],
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
    setForm({ memberId: r.memberId, visitor: r.visitor ?? '', visitDate: ymd(r.visitDate), visitType: r.visitType ?? '심방', content: r.content ?? '', prayer: r.prayer ?? '', followup: r.followup ?? '', visibility: r.visibility ?? 'pastors', status: r.status ?? 'done' });
    setView('edit');
  };
  const remove = async (r: Row) => {
    if (!(await confirm({ message: '이 심방 기록을 삭제할까요?', variant: 'danger', confirmLabel: '삭제' }))) return;
    try { await api.delete(`/api/v1/member-visits/${r.id}`); void invalidate(); } catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  const selMember = useMemo(() => (membersQ.data ?? []).find((m) => m.id === form.memberId), [membersQ.data, form.memberId]);

  // ── VS-02 작성/수정 ──
  if (view === 'edit') {
    const seg = (active: boolean) => active
      ? { background: C.brand, color: '#fff', fontWeight: 700 as const, border: 'none' }
      : { color: C.muted, fontWeight: 600 as const, border: `1px solid ${C.border2}`, background: '#fff' };
    return (
      <div className="max-w-[560px]" style={{ color: C.ink }}>
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => setView('list')} className="text-[17px]" style={{ color: C.text }}>←</button>
          <b className="text-[16px]">{editingId ? '심방 기록 수정' : '심방 기록'}</b>
        </div>

        <div className="flex flex-col gap-3">
          {/* 대상 교인 */}
          <div className="bg-white rounded-[13px] p-3.5" style={{ border: `1px solid ${C.border}` }}>
            {selMember ? (
              <div className="flex items-center gap-3">
                {selMember.photoUrl ? <img src={selMember.photoUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: 42, height: 42 }} />
                  : <span className="rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0" style={{ width: 42, height: 42, background: C.avatarBg, color: C.muted }}>{initial(selMember.name)}</span>}
                <div className="flex-1 min-w-0"><b className="text-[15px] block">{selMember.name}{selMember.position ? ` ${selMember.position}` : ''}</b><span className="text-[12.5px]" style={{ color: C.faint }}>{[selMember.householdRegion, selMember.phone].filter(Boolean).join(' · ') || '교적 정보'}</span></div>
                {!editingId && <button onClick={() => set('memberId', '')} className="text-[12.5px] font-bold shrink-0" style={{ color: C.brand }}>변경</button>}
              </div>
            ) : (
              <div><span className="block text-[12.5px] font-bold mb-1.5">대상 교인 <span style={{ color: C.danger }}>*</span></span>
                <MemberPicker members={(membersQ.data ?? []) as any} value={form.memberId} onChange={(id) => set('memberId', id)} disabled={!!editingId} placeholder="이름 검색으로 대상 교인 선택" /></div>
            )}
          </div>

          {/* 본문 */}
          <div className="bg-white rounded-[13px] p-4 flex flex-col gap-3.5" style={{ border: `1px solid ${C.border}` }}>
            <div>
              <span className="block text-[12.5px] font-bold mb-2">유형</span>
              <div className="flex gap-2">
                {TYPE_OPTS.map(([val, label]) => (
                  <button key={val} type="button" onClick={() => set('visitType', val)} className="flex-1 h-[42px] rounded-[10px] text-[13.5px]" style={seg(form.visitType === val)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><span className="block text-[12.5px] font-bold mb-2">일자</span><input type="date" className={inputClass} value={form.visitDate} onChange={(e) => set('visitDate', e.target.value)} /></label>
              <label className="block"><span className="block text-[12.5px] font-bold mb-2">담당자</span><input className={inputClass} value={form.visitor} onChange={(e) => set('visitor', e.target.value)} placeholder="심방자" /></label>
            </div>
            <label className="block"><span className="block text-[12.5px] font-bold mb-2">내용</span><textarea rows={4} className={textareaClass} value={form.content} onChange={(e) => set('content', e.target.value)} placeholder="나눔·상황·약속 등" /></label>
            <label className="block"><span className="block text-[12.5px] font-bold mb-2">기도제목</span><input className={inputClass} value={form.prayer} onChange={(e) => set('prayer', e.target.value)} placeholder="한 줄로 입력" /></label>
            <label className="block"><span className="block text-[12.5px] font-bold mb-2">후속조치</span><input className={inputClass} value={form.followup} onChange={(e) => set('followup', e.target.value)} placeholder="다음 조치 (선택)" /></label>
            <div>
              <span className="block text-[12.5px] font-bold mb-2">공개 범위</span>
              <div className="flex gap-2">
                {VIS_OPTS.map(([val, label]) => {
                  const on = form.visibility === val;
                  return <button key={val} type="button" onClick={() => set('visibility', val)} className="flex-1 h-[42px] rounded-[10px] text-[13px]"
                    style={on ? { background: C.brandBg, color: C.brand, border: `1px solid ${C.brandBg2}`, fontWeight: 700 } : { color: C.muted, border: `1px solid ${C.border2}`, fontWeight: 600, background: '#fff' }}>{label}</button>;
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-[13px]" style={{ color: C.text }}>
              <input type="checkbox" checked={form.status === 'planned'} onChange={(e) => set('status', e.target.checked ? 'planned' : 'done')} className="rounded" /> 예정(아직 진행 전)
            </label>
          </div>

          {/* 하단 액션 */}
          <div className="flex gap-2.5">
            <button onClick={() => setView('list')} className="text-[14.5px] font-bold rounded-[11px] px-5 py-3" style={{ color: C.text, border: `1px solid ${C.border2}` }}>취소</button>
            <button disabled={saveMutation.isPending || !form.memberId} onClick={() => { if (!form.memberId) { showToast('error', '대상 교인을 선택하세요.'); return; } saveMutation.mutate(); }}
              className="flex-1 text-[15px] font-bold text-white rounded-[11px] py-3 disabled:opacity-50" style={{ background: C.brand }}>{saveMutation.isPending ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── VS-01 목록 ──
  const rows = listQ.data ?? [];
  return (
    <div style={{ color: C.ink }}>
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <b className="text-[17px]">심방 · 상담</b>
        <div className="ml-auto flex gap-2.5">
          <select className={`${inputClass} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">전체</option><option value="done">완료</option><option value="planned">예정</option></select>
          <button onClick={openCreate} className="text-[13.5px] font-bold text-white rounded-[9px] px-4 py-2.5 whitespace-nowrap" style={{ background: C.brand }}>+ 심방 기록</button>
        </div>
      </div>
      <div className="bg-white rounded-[13px] overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        {listQ.isLoading ? <div className="p-8 text-center text-sm" style={{ color: C.faint }}>불러오는 중…</div> :
          rows.length === 0 ? <EmptyState icon="🙏" title="심방 기록이 없습니다" description="'심방 기록'으로 첫 기록을 작성하세요." actionLabel="심방 기록" onAction={openCreate} /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.line2}` }} className="text-left text-[11.5px] font-extrabold">{['교인', '일자', '유형', '담당', '공개', '상태', ''].map((h, i) => <th key={i} className="px-4 py-3" style={{ color: C.faint }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.line2}` }} className="hover:bg-[#f7f8fa]">
                    <td className="px-4 py-3 font-bold cursor-pointer" onClick={() => openEdit(r)}>{r.memberName}</td>
                    <td className="px-4 py-3" style={{ color: C.muted }}>{ymd(r.visitDate) || '—'}</td>
                    <td className="px-4 py-3" style={{ color: C.muted }}>{TYPE_LABEL[r.visitType] ?? r.visitType}</td>
                    <td className="px-4 py-3" style={{ color: C.muted }}>{r.visitor || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: C.faint }}>{VIS_LABEL[r.visibility] ?? r.visibility}</td>
                    <td className="px-4 py-3"><span className="text-xs font-bold" style={{ color: r.status === 'planned' ? C.warn : C.muted }}>{r.status === 'planned' ? '예정' : '완료'}</span></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap"><button onClick={() => openEdit(r)} className="text-xs mr-3" style={{ color: C.muted }}>수정</button><button onClick={() => remove(r)} className="text-xs" style={{ color: C.danger }}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
      </div>
    </div>
  );
}
