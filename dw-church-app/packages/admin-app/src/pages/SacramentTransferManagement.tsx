import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';
import { MemberPicker } from '../components/MemberPicker';

/**
 * 교적관리 — 성례 대장(SC-01) + 교인 이동 대장(TR-01). 교회 행정 애드온.
 * 이동 처리 시 서버가 교인 등록상태를 자동 변경(전출/이명→전출, 별세→별세, 전입→정착).
 */
type Row = Record<string, any>;
// 교단별 기본 성례유형(코드 미설정 시 폴백) — 장로교·침례교 용어 모두 포함.
// 교적 코드 > 성례유형 에서 교회가 편집한다.
const SAC_TYPES_FALLBACK = ['세례', '침례', '유아세례', '헌아식', '입교', '성찬', '학습'];
const TR_TYPES: { key: string; label: string }[] = [
  { key: 'in', label: '전입' }, { key: 'out', label: '전출' }, { key: 'dismissal', label: '이명' }, { key: 'death', label: '별세' },
];
const trLabel = (k: string) => TR_TYPES.find((t) => t.key === k)?.label ?? k;

export default function SacramentTransferManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'sacrament' | 'transfer'>('sacrament');
  const [adding, setAdding] = useState(false);

  const membersQ = useQuery({
    queryKey: ['members-for-record'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Row[] } }>('/api/v1/members', { regStatus: 'all', perPage: 500 });
      return ((res as any).data.items ?? []) as Row[];
    },
  });
  // 성례유형은 교적 코드(sacrament_type)에서 관리 — 한 교회에 침례/세례가 공존하므로
  // 편집 가능한 목록으로 두고, 코드가 없으면 두 교단 용어를 모두 담은 폴백을 쓴다.
  const sacTypesQ = useQuery({
    queryKey: ['member-codes', 'sacrament_type'], enabled: tab === 'sacrament',
    queryFn: async () => {
      const res = await api.get<{ data: { label: string; isActive: boolean }[] }>('/api/v1/member-codes', { category: 'sacrament_type' });
      return ((res as any).data as { label: string; isActive: boolean }[]).filter((c) => c.isActive).map((c) => c.label);
    },
  });
  const sacTypes = (sacTypesQ.data && sacTypesQ.data.length > 0) ? sacTypesQ.data : SAC_TYPES_FALLBACK;
  const sacQ = useQuery({ queryKey: ['sacraments'], enabled: tab === 'sacrament', queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/member-sacraments') as any).data as Row[] });
  const trQ = useQuery({ queryKey: ['transfers'], enabled: tab === 'transfer', queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/member-transfers') as any).data as Row[] });

  // sacrament form
  const blankSac = { memberId: '', sacType: '세례', sacDate: '', officiant: '', place: '', certNo: '', recognized: true };
  const [sac, setSac] = useState(blankSac);
  const addSac = async () => {
    if (!sac.memberId) { showToast('error', '대상 교인을 선택하세요.'); return; }
    try {
      const body: any = { ...sac }; if (!body.sacDate) delete body.sacDate;
      await api.post('/api/v1/member-sacraments', body);
      showToast('success', '성례 기록을 등록했습니다.');
      setSac(blankSac); setAdding(false);
      void qc.invalidateQueries({ queryKey: ['sacraments'] });
    } catch (e: any) { showToast('error', e?.message || '등록 실패'); }
  };
  // transfer form
  const [tr, setTr] = useState({ memberId: '', trType: 'in', trDate: '', counterpart: '', reason: '' });
  const addTr = async () => {
    if (!tr.memberId) { showToast('error', '대상 교인을 선택하세요.'); return; }
    try {
      const body: any = { ...tr }; if (!body.trDate) delete body.trDate;
      await api.post('/api/v1/member-transfers', body);
      showToast('success', `이동 처리 완료 — 명부 상태가 자동 변경됩니다.`);
      setTr({ memberId: '', trType: 'in', trDate: '', counterpart: '', reason: '' }); setAdding(false);
      void qc.invalidateQueries({ queryKey: ['transfers'] });
      void qc.invalidateQueries({ queryKey: ['members'] });
    } catch (e: any) { showToast('error', e?.message || '처리 실패'); }
  };
  const removeSac = async (id: string) => { if (!window.confirm('삭제할까요?')) return; try { await api.delete(`/api/v1/member-sacraments/${id}`); void qc.invalidateQueries({ queryKey: ['sacraments'] }); } catch (e: any) { showToast('error', e?.message || '실패'); } };
  const removeTr = async (id: string) => { if (!window.confirm('삭제할까요? (명부 상태는 되돌려지지 않습니다)')) return; try { await api.delete(`/api/v1/member-transfers/${id}`); void qc.invalidateQueries({ queryKey: ['transfers'] }); } catch (e: any) { showToast('error', e?.message || '실패'); } };

  const memberSelect = (val: string, onChange: (v: string) => void) => (
    <MemberPicker members={(membersQ.data ?? []) as any} value={val} onChange={onChange} placeholder="이름 검색으로 교인 선택" />
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">성례 · 이동 대장</h1>
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['sacrament', 'transfer'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setAdding(false); }} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t === 'sacrament' ? '성례' : '이동'}</button>
          ))}
        </div>
        <button onClick={() => setAdding((v) => !v)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ 등록</button>
      </div>

      {adding && tab === 'sacrament' && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-1"><label className="block text-sm font-medium mb-1">교인 *</label>{memberSelect(sac.memberId, (v) => setSac({ ...sac, memberId: v }))}</div>
          <div><label className="block text-sm font-medium mb-1">성례</label><select className={inputClass} value={sac.sacType} onChange={(e) => setSac({ ...sac, sacType: e.target.value })}>{sacTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">일자</label><input type="date" className={inputClass} value={sac.sacDate} onChange={(e) => setSac({ ...sac, sacDate: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">집례자</label><input className={inputClass} value={sac.officiant} onChange={(e) => setSac({ ...sac, officiant: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">받은 교회</label><input className={inputClass} value={sac.place} onChange={(e) => setSac({ ...sac, place: e.target.value })} placeholder="타교회면 교회명" /></div>
          <div><label className="block text-sm font-medium mb-1">증서번호</label><input className={inputClass} placeholder="증서번호" value={sac.certNo} onChange={(e) => setSac({ ...sac, certNo: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={sac.recognized} onChange={(e) => setSac({ ...sac, recognized: e.target.checked })} className="rounded" /> 본 교회 인정</label>
          <div className="flex items-end"><button onClick={addSac} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap w-full">등록</button></div>
        </div>
      )}
      {adding && tab === 'transfer' && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div><label className="block text-sm font-medium mb-1">교인 *</label>{memberSelect(tr.memberId, (v) => setTr({ ...tr, memberId: v }))}</div>
          <div><label className="block text-sm font-medium mb-1">유형</label><select className={inputClass} value={tr.trType} onChange={(e) => setTr({ ...tr, trType: e.target.value })}>{TR_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">일자</label><input type="date" className={inputClass} value={tr.trDate} onChange={(e) => setTr({ ...tr, trDate: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">상대 교회</label><input className={inputClass} value={tr.counterpart} onChange={(e) => setTr({ ...tr, counterpart: e.target.value })} /></div>
          <div className="sm:col-span-2 flex gap-2"><input className={inputClass} placeholder="사유" value={tr.reason} onChange={(e) => setTr({ ...tr, reason: e.target.value })} /><button onClick={addTr} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap">처리</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {tab === 'sacrament' ? (
          sacQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
            (sacQ.data?.length ?? 0) === 0 ? <EmptyState icon="✝️" title="성례 기록이 없습니다" description="'+ 등록'으로 세례·입교 등을 기록하세요." /> : (
              <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="px-4 py-3 font-medium">교인</th><th className="px-4 py-3 font-medium">성례</th><th className="px-4 py-3 font-medium">일자</th><th className="px-4 py-3 font-medium">집례자</th><th className="px-4 py-3 font-medium">증서</th><th className="px-4 py-3 font-medium text-right">작업</th></tr></thead>
                <tbody>{(sacQ.data ?? []).map((r) => (<tr key={r.id} className="border-b border-gray-50"><td className="px-4 py-3 font-medium text-gray-800">{r.memberName}</td><td className="px-4 py-3 text-gray-600"><span className="inline-flex items-center gap-1.5">{r.sacType}{r.recognized === false && <span className="text-[11px] font-medium bg-amber-50 text-amber-700 rounded-full px-1.5 py-0.5">미인정</span>}{r.place ? <span className="text-xs text-gray-400">· {r.place}</span> : null}</span></td><td className="px-4 py-3 text-gray-600">{r.sacDate ? String(r.sacDate).slice(0, 10) : '—'}</td><td className="px-4 py-3 text-gray-600">{r.officiant || '—'}</td><td className="px-4 py-3 text-gray-500">{r.certNo || '—'}</td><td className="px-4 py-3 text-right"><button onClick={() => removeSac(r.id)} className="text-xs text-red-500 hover:text-red-600">삭제</button></td></tr>))}</tbody>
              </table>
            )
        ) : (
          trQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
            (trQ.data?.length ?? 0) === 0 ? <EmptyState icon="🔀" title="이동 기록이 없습니다" description="'+ 등록'으로 전입·전출·이명·별세를 처리하세요." /> : (
              <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="px-4 py-3 font-medium">교인</th><th className="px-4 py-3 font-medium">유형</th><th className="px-4 py-3 font-medium">일자</th><th className="px-4 py-3 font-medium">상대 교회</th><th className="px-4 py-3 font-medium">사유</th><th className="px-4 py-3 font-medium text-right">작업</th></tr></thead>
                <tbody>{(trQ.data ?? []).map((r) => (<tr key={r.id} className="border-b border-gray-50"><td className="px-4 py-3 font-medium text-gray-800">{r.memberName}</td><td className="px-4 py-3 text-gray-600">{trLabel(r.trType)}</td><td className="px-4 py-3 text-gray-600">{r.trDate ? String(r.trDate).slice(0, 10) : '—'}</td><td className="px-4 py-3 text-gray-600">{r.counterpart || '—'}</td><td className="px-4 py-3 text-gray-500">{r.reason || '—'}</td><td className="px-4 py-3 text-right"><button onClick={() => removeTr(r.id)} className="text-xs text-red-500 hover:text-red-600">삭제</button></td></tr>))}</tbody>
              </table>
            )
        )}
      </div>
    </div>
  );
}
