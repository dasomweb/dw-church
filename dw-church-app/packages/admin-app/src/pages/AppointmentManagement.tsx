import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';
import { MemberPicker } from '../components/MemberPicker';

/**
 * 교적관리 — 직분 임명. 나중에 직분을 받았거나, 연초 서리집사 임명처럼 여러 명을
 * 한 번에 임명하는 워크플로. 검색으로 대상 교인을 여러 명 담고, 직분·임명일을 골라
 * 일괄 적용 → 각 교인의 현재 직분(본 교회 임명)이 갱신되고 임명 이력이 남는다.
 */
type Row = Record<string, any>;

export default function AppointmentManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [position, setPosition] = useState('');
  const [appointedOn, setAppointedOn] = useState(new Date().toISOString().slice(0, 10));
  const [courtesy, setCourtesy] = useState(false);
  const [note, setNote] = useState('');
  const [staged, setStaged] = useState<Row[]>([]);
  const [applying, setApplying] = useState(false);

  const membersQ = useQuery({
    queryKey: ['members-for-appoint'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Row[] } }>('/api/v1/members', { regStatus: 'all', perPage: 2000 });
      return ((res as any).data.items ?? []) as Row[];
    },
  });
  const codesQ = useQuery({
    queryKey: ['member-codes'],
    queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/member-codes') as any).data as Row[],
  });
  const positions = useMemo(
    () => (codesQ.data ?? []).filter((c) => c.category === 'position' && c.isActive !== false).map((c) => c.label as string),
    [codesQ.data],
  );
  const apptQ = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/member-appointments') as any).data as Row[],
  });

  const addStaged = (id: string) => {
    const m = (membersQ.data ?? []).find((x) => x.id === id);
    if (m && !staged.some((s) => s.id === id)) setStaged((prev) => [...prev, m]);
  };
  const removeStaged = (id: string) => setStaged((prev) => prev.filter((s) => s.id !== id));

  const apply = async () => {
    if (!position) { showToast('error', '직분을 선택하세요.'); return; }
    if (staged.length === 0) { showToast('error', '대상 교인을 추가하세요.'); return; }
    setApplying(true);
    try {
      const res = await api.post<{ data: { count: number } }>('/api/v1/members/appoint', {
        memberIds: staged.map((s) => s.id), position, courtesy, appointedOn, note: note.trim() || undefined,
      });
      showToast('success', `${(res as any).data.count}명을 '${position}'(으)로 임명했습니다.`);
      setStaged([]); setNote('');
      void qc.invalidateQueries({ queryKey: ['appointments'] });
      void qc.invalidateQueries({ queryKey: ['members'] });
      void qc.invalidateQueries({ queryKey: ['member-stats'] });
    } catch (e: any) { showToast('error', e?.message || '임명 실패'); }
    finally { setApplying(false); }
  };

  const meta = (m: Row) => [m.householdRegion, m.position ? `현: ${m.position}` : '', m.regStatus === 'newcomer' ? '새가족' : ''].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">직분 임명</h1>
        <p className="text-sm text-gray-500 mt-1">나중에 직분을 받았거나 연초 서리집사 임명처럼 여러 명을 한 번에 임명합니다. 검색으로 대상을 담고 직분·임명일을 골라 적용하세요.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">임명 직분 *</label>
            <select className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">직분 선택</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">임명일</label><input type="date" className={inputClass} value={appointedOn} onChange={(e) => setAppointedOn(e.target.value)} /></div>
          <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm" title="본 교회 임명이 아니라 타 교회에서 받은 직분으로 기록"><input type="checkbox" checked={courtesy} onChange={(e) => setCourtesy(e.target.checked)} className="rounded" /> 타 교회에서 받은 직분</label></div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">메모 (선택)</label>
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 2026년 서리집사 임명" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">대상 교인 추가</label>
          <MemberPicker members={(membersQ.data ?? []) as any} value="" onChange={addStaged} placeholder="이름 검색으로 대상 교인을 추가 (여러 명)" />
          {staged.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {staged.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full pl-3 pr-2 py-1 text-sm">
                  <span className="font-medium text-gray-800">{m.name}</span>
                  {meta(m) && <span className="text-xs text-blue-600/70">{meta(m)}</span>}
                  <button onClick={() => removeStaged(m.id)} className="text-blue-400 hover:text-red-500" aria-label="제거">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button disabled={applying || !position || staged.length === 0} onClick={() => void apply()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {applying ? '임명 중…' : `${staged.length}명 임명`}
          </button>
          {staged.length > 0 && <button onClick={() => setStaged([])} className="text-sm text-gray-500 hover:text-gray-700">비우기</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50"><h2 className="text-sm font-semibold text-gray-700">임명 내역</h2></div>
        {apptQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
          (apptQ.data?.length ?? 0) === 0 ? <EmptyState icon="🕊️" title="임명 내역이 없습니다" description="위에서 교인을 담아 직분을 임명하세요." /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="px-4 py-3 font-medium">교인</th><th className="px-4 py-3 font-medium">직분</th><th className="px-4 py-3 font-medium">임명일</th><th className="px-4 py-3 font-medium">구분</th><th className="px-4 py-3 font-medium">메모</th></tr></thead>
              <tbody>
                {(apptQ.data ?? []).map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.memberName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.position}</td>
                    <td className="px-4 py-3 text-gray-600">{a.appointedOn ? String(a.appointedOn).slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium rounded-full px-2 py-0.5 ${a.courtesy ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>{a.courtesy ? '타교회' : '본교회'}</span></td>
                    <td className="px-4 py-3 text-gray-500">{a.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
