import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';

/**
 * 교적관리 — 출석 체크(AT-01, 화면 시안 그대로) + 장기결석(AT-03).
 * 예배·날짜를 고르면 명단이 큰 히트영역(출석/온라인/결석) 3버튼으로 나온다.
 * 저장은 명시적 '출석 저장' 버튼(자동저장 안 함 — 시안의 자동저장 배지는 미구현,
 * 대신 미저장 안내로 대체). 온라인=teal(#12b5a5)·출석=brand·결석=danger.
 */
type Svc = { id: string; name: string; weekday?: string; time?: string };
type Row = Record<string, any>;

const C = {
  brand: '#1466d6', brandHover: '#0f4fa8', brandBg: '#e8f0fe', teal: '#12b5a5', danger: '#dc2626',
  ink: '#16181d', text: '#3c4353', muted: '#61697a', faint: '#8b93a3', faintest: '#a3aab8',
  border: '#e5e7eb', border2: '#dfe3ea', line: '#eef0f4', line2: '#f2f4f7', surface: '#f7f8fa', surface2: '#fafbfc',
  track: '#eef1f5', warn: '#b98307', avatarBg: '#dfe3ea',
};
const STATUS_META: Record<string, { label: string; color: string }> = {
  present: { label: '출석', color: C.brand }, online: { label: '온라인', color: C.teal }, absent: { label: '결석', color: C.danger },
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const initial = (n?: string) => (n || '·').trim().charAt(0) || '·';

export default function AttendanceManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'check' | 'absent'>('check');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSvc, setNewSvc] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [showSvcMgr, setShowSvcMgr] = useState(false);
  const [nameQ, setNameQ] = useState('');
  const { slug = '' } = useParams<{ slug: string }>();
  const checkinUrl = `${window.location.origin}/t/${slug}/checkin`;
  const shareCheckin = async () => {
    try { await navigator.clipboard.writeText(checkinUrl); showToast('success', '모바일 출석 링크를 복사했습니다. 구역 리더에게 보내세요.'); }
    catch { showToast('error', checkinUrl); }
    window.open(checkinUrl, '_blank');
  };

  const servicesQ = useQuery({
    queryKey: ['member-services'],
    queryFn: async () => (await api.get<{ data: Svc[] }>('/api/v1/member-services') as any).data as Svc[],
  });
  useEffect(() => { if (!serviceId && (servicesQ.data?.length ?? 0) > 0) setServiceId(servicesQ.data![0]!.id); }, [servicesQ.data, serviceId]);

  const sheetQ = useQuery({
    queryKey: ['attendance-sheet', serviceId, date],
    enabled: tab === 'check' && !!serviceId && !!date,
    queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/attendance/sheet', { serviceId, date }) as any).data as Row[],
  });
  useEffect(() => {
    if (sheetQ.data) {
      const m: Record<string, string> = {};
      for (const r of sheetQ.data) if (r.status) m[r.memberId] = r.status;
      setMarks(m); setDirty(false);
    }
  }, [sheetQ.data]);

  const absentQ = useQuery({
    queryKey: ['long-absent', weeks],
    enabled: tab === 'absent',
    queryFn: async () => (await api.get<{ data: Row[] }>('/api/v1/attendance/long-absent', { weeks }) as any).data as Row[],
  });

  const createService = async () => {
    if (!newSvc.trim()) return;
    try {
      const res = await api.post<{ data: Svc }>('/api/v1/member-services', { name: newSvc.trim() });
      setNewSvc(''); await qc.invalidateQueries({ queryKey: ['member-services'] }); setServiceId((res as any).data.id);
    } catch (e: any) { showToast('error', e?.message || '추가 실패'); }
  };
  const deleteService = async (s: Svc) => {
    if (!window.confirm(`'${s.name}' 예배를 삭제할까요? 이 예배의 모든 출석 기록도 함께 삭제됩니다.`)) return;
    try {
      await api.delete(`/api/v1/member-services/${s.id}`);
      if (serviceId === s.id) setServiceId('');
      await qc.invalidateQueries({ queryKey: ['member-services'] });
      showToast('success', '예배를 삭제했습니다.');
    } catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  const rows = sheetQ.data ?? [];
  const shown = useMemo(() => nameQ.trim() ? rows.filter((r) => String(r.name || '').includes(nameQ.trim())) : rows, [rows, nameQ]);
  const checked = useMemo(() => rows.filter((r) => marks[r.memberId] === 'present' || marks[r.memberId] === 'online').length, [rows, marks]);
  const unchecked = rows.length - checked;

  const setMark = (memberId: string, status: string) => { setMarks((m) => ({ ...m, [memberId]: status })); setDirty(true); };
  const markAll = (status: string) => { setMarks(Object.fromEntries(rows.map((r) => [r.memberId, status]))); setDirty(true); };
  const save = async () => {
    if (!serviceId) { showToast('error', '예배를 선택하세요.'); return; }
    setSaving(true);
    try {
      const entries = rows.map((r) => ({ memberId: r.memberId, status: marks[r.memberId] || 'absent' }));
      await api.post('/api/v1/attendance', { serviceId, date, entries });
      setDirty(false);
      showToast('success', `출석 저장 완료 (출석 ${checked}명 · 미체크 ${unchecked}명 결석 처리)`);
      void qc.invalidateQueries({ queryKey: ['attendance-sheet', serviceId, date] });
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setSaving(false); }
  };

  const pct = rows.length ? Math.round((checked / rows.length) * 100) : 0;

  return (
    <div style={{ color: C.ink }}>
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 flex-wrap mb-5">
        <b className="text-[17px]">출석 체크</b>
        <button onClick={() => void shareCheckin()} className="text-[13px] font-bold rounded-[9px] px-3 py-2" style={{ color: C.text, border: `1px solid ${C.border2}` }}>📱 모바일 출석 링크</button>
        {tab === 'check' && (
          dirty
            ? <span className="text-[12px] font-bold rounded-full px-2.5 py-1" style={{ color: C.warn, background: '#fdf4e0' }}>저장 안 됨 · ‘출석 저장’을 누르세요</span>
            : <span className="text-[12px] font-bold rounded-full px-2.5 py-1" style={{ color: '#0e9a8d', background: '#e7f7f5' }}>저장됨</span>
        )}
        <div className="ml-auto flex gap-1 rounded-lg p-1" style={{ background: C.line2 }}>
          {(['check', 'absent'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-md text-[13px] font-bold"
              style={tab === t ? { background: '#fff', color: C.ink, boxShadow: '0 1px 2px rgba(0,0,0,.06)' } : { color: C.faint }}>{t === 'check' ? '출석 체크' : '장기결석'}</button>
          ))}
        </div>
      </div>

      {tab === 'check' ? (
        <div className="max-w-[900px]">
          {/* 필터 + 진행률 */}
          <div className="bg-white rounded-[13px] mb-3.5" style={{ border: `1px solid ${C.border}`, padding: '16px 18px' }}>
            <div className="flex flex-wrap gap-3 mb-3.5">
              <label className="flex-1 min-w-[180px]"><span className="block text-[12px] font-bold mb-1.5" style={{ color: C.faint }}>예배</span>
                <select className={inputClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">예배 선택</option>
                  {(servicesQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.weekday ? ` (${s.weekday} ${s.time || ''})` : ''}</option>)}
                </select></label>
              <label className="flex-1 min-w-[150px]"><span className="block text-[12px] font-bold mb-1.5" style={{ color: C.faint }}>날짜</span>
                <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <div className="flex items-end"><button onClick={() => setShowSvcMgr((v) => !v)} className="text-[13px] font-bold px-3 py-2.5" style={{ color: C.muted }}>예배 관리</button></div>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: C.track }}><div className="h-full" style={{ width: `${pct}%`, background: C.brand }} /></div>
              <b className="text-[14px] shrink-0">{checked} / {rows.length} 체크</b>
            </div>
            {(showSvcMgr || (servicesQ.data?.length ?? 0) === 0) && (
              <div className="pt-3 mt-3 space-y-2" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex gap-2 items-center">
                  <input className={`${inputClass} flex-1`} placeholder="예배 추가 (예: 주일 1부 / 수요예배)" value={newSvc} onChange={(e) => setNewSvc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createService()} />
                  <button onClick={createService} className="text-[13px] font-bold text-white rounded-[9px] px-4 py-2.5 whitespace-nowrap" style={{ background: C.brand }}>예배 추가</button>
                </div>
                {(servicesQ.data ?? []).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-[13px]"><span className="flex-1" style={{ color: C.text }}>{s.name}{s.weekday ? ` · ${s.weekday} ${s.time || ''}` : ''}</span><button onClick={() => deleteService(s)} className="text-xs" style={{ color: C.danger }}>삭제</button></div>
                ))}
                <p className="text-xs" style={{ color: C.faint }}>예배를 삭제하면 그 예배의 모든 출석 기록도 함께 삭제됩니다.</p>
              </div>
            )}
          </div>

          {!serviceId ? <EmptyState icon="🗓️" title="예배를 선택하세요" description="예배와 날짜를 고르면 명단이 나타납니다." /> :
            sheetQ.isLoading ? <div className="p-8 text-center text-sm" style={{ color: C.faint }}>불러오는 중…</div> :
            rows.length === 0 ? <EmptyState icon="🧑‍🤝‍🧑" title="대상 교인이 없습니다" description="교인 명부에 재적/새가족 교인을 등록하세요." /> : (
              <>
                <div className="bg-white rounded-[13px] overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  {/* 검색 + 전체 출석 */}
                  <div className="flex items-center gap-3 p-3.5" style={{ background: C.surface2, borderBottom: `1px solid ${C.line}` }}>
                    <input className={`${inputClass} flex-1`} placeholder="이름 검색" value={nameQ} onChange={(e) => setNameQ(e.target.value)} />
                    <button onClick={() => markAll('present')} className="text-[13px] font-bold rounded-[9px] px-3.5 py-2.5 whitespace-nowrap" style={{ color: C.brand, background: C.brandBg }}>전체 출석</button>
                  </div>
                  {shown.map((r) => {
                    const cur = marks[r.memberId];
                    return (
                      <div key={r.memberId} className="flex items-center gap-3.5 px-4 py-3" style={{ borderBottom: `1px solid ${C.line2}` }}>
                        {r.photoUrl ? <img src={r.photoUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: 40, height: 40 }} />
                          : <span className="rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0" style={{ width: 40, height: 40, background: C.avatarBg, color: C.muted }}>{initial(r.name)}</span>}
                        <div className="flex-1 min-w-0">
                          <b className="text-[15px] block truncate">{r.name}</b>
                          <span className="text-[12.5px]" style={{ color: r.longAbsent ? C.warn : C.faint, fontWeight: r.longAbsent ? 700 : 400 }}>{[r.position, r.longAbsent ? `최근 ${weeks}주 결석` : ''].filter(Boolean).join(' · ') || ' '}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(['present', 'online', 'absent'] as const).map((st) => {
                            const on = cur === st; const meta = STATUS_META[st]!;
                            return (
                              <button key={st} onClick={() => setMark(r.memberId, st)}
                                className="rounded-[11px] flex items-center justify-center text-[14px] transition-colors"
                                style={{ width: 72, height: 52, fontWeight: on ? 700 : 600, ...(on ? { background: meta.color, color: '#fff' } : { color: C.muted, border: `1px solid ${C.border2}` }) }}>{meta.label}</button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="sticky bottom-0 mt-3 flex items-center gap-4 rounded-[13px]" style={{ background: '#fff', border: `1px solid ${C.border}`, padding: '14px 18px' }}>
                  <span className="text-[13px]" style={{ color: C.muted }}>미체크 {unchecked}명은 결석으로 저장됩니다</span>
                  <button disabled={saving} onClick={() => void save()} className="ml-auto text-[14.5px] font-bold text-white rounded-[10px] px-7 py-3 disabled:opacity-50" style={{ background: C.brand }}>{saving ? '저장 중…' : '출석 저장'}</button>
                </div>
              </>
            )}
        </div>
      ) : (
        <div className="max-w-[900px]">
          <div className="bg-white rounded-[13px] flex gap-2 items-center mb-3.5" style={{ border: `1px solid ${C.border}`, padding: '14px 16px' }}>
            <span className="text-sm" style={{ color: C.muted }}>최근</span>
            <select className={`${inputClass} w-auto`} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>{[4, 8, 12].map((w) => <option key={w} value={w}>{w}주 이상 결석</option>)}</select>
          </div>
          <div className="bg-white rounded-[13px] overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {absentQ.isLoading ? <div className="p-8 text-center text-sm" style={{ color: C.faint }}>불러오는 중…</div> :
              (absentQ.data?.length ?? 0) === 0 ? <EmptyState icon="✅" title="장기결석자가 없습니다" description="선택한 기간 기준 장기결석 교인이 없습니다." /> : (
                <table className="w-full text-sm">
                  <thead><tr style={{ borderBottom: `1px solid ${C.line}` }} className="text-left text-[11.5px] font-extrabold" ><th className="px-4 py-3" style={{ color: C.faint }}>이름</th><th className="px-4 py-3" style={{ color: C.faint }}>직분</th><th className="px-4 py-3" style={{ color: C.faint }}>전화</th><th className="px-4 py-3" style={{ color: C.faint }}>최근 출석</th></tr></thead>
                  <tbody>
                    {(absentQ.data ?? []).map((r) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.line2}` }}>
                        <td className="px-4 py-3 font-bold">{r.name}</td>
                        <td className="px-4 py-3" style={{ color: C.muted }}>{r.position || '—'}</td>
                        <td className="px-4 py-3" style={{ color: C.muted }}>{r.phone || '—'}</td>
                        <td className="px-4 py-3" style={{ color: C.faint }}>{r.lastPresent ? String(r.lastPresent).slice(0, 10) : '기록 없음'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
