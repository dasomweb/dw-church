import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';

/**
 * 교적관리 — 출석 체크(AT-01) + 장기결석 관리(AT-03). 예배·날짜 선택 후 명단을
 * 큰 히트영역으로 체크하고 저장한다. 교회 행정 애드온('membership').
 */
type Svc = { id: string; name: string; weekday?: string; time?: string };
type Row = Record<string, any>;
const STATUSES: { key: string; label: string; cls: string }[] = [
  { key: 'present', label: '출석', cls: 'bg-green-600 text-white border-green-600' },
  { key: 'online', label: '온라인', cls: 'bg-blue-500 text-white border-blue-500' },
  { key: 'absent', label: '결석', cls: 'bg-gray-200 text-gray-600 border-gray-300' },
];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AttendanceManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'check' | 'absent'>('check');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newSvc, setNewSvc] = useState('');
  const [weeks, setWeeks] = useState(4);

  const servicesQ = useQuery({
    queryKey: ['member-services'],
    queryFn: async () => {
      const res = await api.get<{ data: Svc[] }>('/api/v1/member-services');
      return (res as any).data as Svc[];
    },
  });
  useEffect(() => {
    if (!serviceId && (servicesQ.data?.length ?? 0) > 0) setServiceId(servicesQ.data![0]!.id);
  }, [servicesQ.data, serviceId]);

  const sheetQ = useQuery({
    queryKey: ['attendance-sheet', serviceId, date],
    enabled: tab === 'check' && !!serviceId && !!date,
    queryFn: async () => {
      const res = await api.get<{ data: Row[] }>('/api/v1/attendance/sheet', { serviceId, date });
      return (res as any).data as Row[];
    },
  });
  // seed local marks from server sheet
  useEffect(() => {
    if (sheetQ.data) {
      const m: Record<string, string> = {};
      for (const r of sheetQ.data) if (r.status) m[r.memberId] = r.status;
      setMarks(m);
    }
  }, [sheetQ.data]);

  const absentQ = useQuery({
    queryKey: ['long-absent', weeks],
    enabled: tab === 'absent',
    queryFn: async () => {
      const res = await api.get<{ data: Row[] }>('/api/v1/attendance/long-absent', { weeks });
      return (res as any).data as Row[];
    },
  });

  const createService = async () => {
    if (!newSvc.trim()) return;
    try {
      const res = await api.post<{ data: Svc }>('/api/v1/member-services', { name: newSvc.trim() });
      setNewSvc('');
      await qc.invalidateQueries({ queryKey: ['member-services'] });
      setServiceId((res as any).data.id);
    } catch (e: any) { showToast('error', e?.message || '추가 실패'); }
  };

  const rows = sheetQ.data ?? [];
  const summary = useMemo(() => {
    let present = 0, online = 0, absent = 0;
    for (const r of rows) { const s = marks[r.memberId]; if (s === 'present') present++; else if (s === 'online') online++; else absent++; }
    return { present, online, absent };
  }, [rows, marks]);

  const save = async () => {
    if (!serviceId) { showToast('error', '예배를 선택하세요.'); return; }
    setSaving(true);
    try {
      const entries = rows.map((r) => ({ memberId: r.memberId, status: marks[r.memberId] || 'absent' }));
      await api.post('/api/v1/attendance', { serviceId, date, entries });
      showToast('success', `출석 저장 완료 (출석 ${summary.present} · 온라인 ${summary.online})`);
      void qc.invalidateQueries({ queryKey: ['attendance-sheet', serviceId, date] });
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setSaving(false); }
  };

  const cycle = (memberId: string) => {
    setMarks((m) => {
      const order = ['present', 'online', 'absent'];
      const cur = m[memberId] || 'absent';
      const next = order[(order.indexOf(cur) + 1) % order.length]!;
      return { ...m, [memberId]: next };
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">출석</h1>
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['check', 'absent'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t === 'check' ? '출석 체크' : '장기결석'}</button>
          ))}
        </div>
      </div>

      {tab === 'check' ? (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-2 items-center">
            <select className={`${inputClass} w-auto`} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">예배 선택</option>
              {(servicesQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.weekday ? ` (${s.weekday} ${s.time || ''})` : ''}</option>)}
            </select>
            <input type="date" className={`${inputClass} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
            {(servicesQ.data?.length ?? 0) === 0 && (
              <div className="flex gap-2 items-center">
                <input className={`${inputClass} w-auto`} placeholder="예배 추가 (예: 주일 1부)" value={newSvc} onChange={(e) => setNewSvc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createService()} />
                <button onClick={createService} className="text-sm text-blue-600">추가</button>
              </div>
            )}
            <div className="ml-auto text-sm text-gray-500">출석 <b className="text-green-600">{summary.present}</b> · 온라인 <b className="text-blue-600">{summary.online}</b> · 결석 <b className="text-gray-500">{summary.absent}</b></div>
          </div>

          {!serviceId ? <EmptyState icon="🗓️" title="예배를 선택하세요" description="예배와 날짜를 고르면 명단이 나타납니다." /> :
            sheetQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
            rows.length === 0 ? <EmptyState icon="🧑‍🤝‍🧑" title="대상 교인이 없습니다" description="교인 명부에 정착/새가족 교인을 등록하세요." /> : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {rows.map((r) => {
                    const st = marks[r.memberId] || 'absent';
                    const meta = STATUSES.find((s) => s.key === st)!;
                    return (
                      <button key={r.memberId} onClick={() => cycle(r.memberId)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                        {r.photoUrl ? <img src={r.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{(r.name || '·')[0]}</span>}
                        <span className="font-medium text-gray-800">{r.name}</span>
                        {r.position && <span className="text-xs text-gray-400">{r.position}</span>}
                        <span className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold border ${meta.cls}`} style={{ minWidth: 64, textAlign: 'center' }}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 py-3 flex justify-end">
                  <button disabled={saving} onClick={() => void save()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '출석 저장'}</button>
                </div>
              </>
            )}
        </>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-2 items-center">
            <span className="text-sm text-gray-600">최근</span>
            <select className={`${inputClass} w-auto`} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              {[4, 8, 12].map((w) => <option key={w} value={w}>{w}주 이상 결석</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {absentQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
              (absentQ.data?.length ?? 0) === 0 ? <EmptyState icon="✅" title="장기결석자가 없습니다" description="선택한 기간 기준 장기결석 교인이 없습니다." /> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="px-4 py-3 font-medium">이름</th><th className="px-4 py-3 font-medium">직분</th><th className="px-4 py-3 font-medium">전화</th><th className="px-4 py-3 font-medium">최근 출석</th></tr></thead>
                  <tbody>
                    {(absentQ.data ?? []).map((r) => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                        <td className="px-4 py-3 text-gray-600">{r.position || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{r.lastPresent ? String(r.lastPresent).slice(0, 10) : '기록 없음'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}
    </div>
  );
}
