import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast } from '../components';
import { MemberPicker, type PickMember } from '../components/MemberPicker';

/**
 * ED-02/03 차수 관리 · 출결 — 과정을 고르면 차수 목록, 차수를 열면 수강생 × 회차
 * 출결 격자. 셀을 눌러 참석/보강/불참을 바꾸고, 수료 기준을 채운 사람을 수료 확정
 * 하면 이수 이력에 남고 미소속·자동배치 과정이면 배치 대기 큐로 이어진다.
 */
type Term = Record<string, any>;
const ATT_CYCLE = ['present', 'makeup', 'absent'] as const;
const ATT_MARK: Record<string, { m: string; c: string }> = {
  present: { m: '✓', c: 'bg-emerald-500 text-white' },
  makeup: { m: '보', c: 'bg-blue-500 text-white' },
  absent: { m: '·', c: 'bg-gray-100 text-gray-400' },
  none: { m: '', c: 'bg-white text-gray-300 border border-dashed border-gray-200' },
};

export default function CourseTerms() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [courseId, setCourseId] = useState('');
  const [termId, setTermId] = useState<string | null>(null);
  const [showNewTerm, setShowNewTerm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [att, setAtt] = useState<Record<string, Record<number, string>>>({});
  const [addStudent, setAddStudent] = useState('');

  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/courses') as any).data as any[] });
  const termsQ = useQuery({
    queryKey: ['course-terms', courseId], enabled: !!courseId,
    queryFn: async () => (await api.get<{ data: Term[] }>(`/api/v1/course-terms?courseId=${courseId}`) as any).data as Term[],
  });
  const termQ = useQuery({
    queryKey: ['course-term', termId], enabled: !!termId,
    queryFn: async () => (await api.get<{ data: Term }>(`/api/v1/course-terms/${termId}`) as any).data as Term,
  });
  const membersQ = useQuery({ queryKey: ['members-lite'], queryFn: async () => ((await api.get<{ data: any }>('/api/v1/members?perPage=2000') as any).data?.items ?? []) as any[] });
  const pickMembers: PickMember[] = useMemo(() => (membersQ.data ?? []).map((m: any) => ({ id: m.id, name: m.name, position: m.position, householdRegion: m.householdRegion || m.region, regStatus: m.regStatus, phone: m.phone, photoUrl: m.photoUrl })), [membersQ.data]);

  const term = termQ.data;
  const totalSessions: number = term?.total_sessions ?? 0;
  const criteria: number = term?.criteria ?? 0;
  const enrollments: any[] = term?.enrollments ?? [];

  // 서버 출결 → 로컬 편집 상태.
  useEffect(() => {
    if (!term) return;
    const next: Record<string, Record<number, string>> = {};
    for (const e of term.enrollments ?? []) {
      next[e.id] = {};
      for (const s of e.sessions ?? []) next[e.id]![s.session_no] = s.status;
    }
    setAtt(next);
  }, [term]);

  const presentOf = (eid: string) => Object.values(att[eid] ?? {}).filter((s) => s === 'present' || s === 'makeup').length;

  const cycle = (eid: string, sess: number) => setAtt((prev) => {
    const cur = prev[eid]?.[sess];
    const next = cur === undefined ? 'present' : cur === 'absent' ? 'present' : ATT_CYCLE[(ATT_CYCLE.indexOf(cur as any) + 1) % ATT_CYCLE.length] ?? 'present';
    return { ...prev, [eid]: { ...(prev[eid] ?? {}), [sess]: next } };
  });

  const saveAtt = async () => {
    const entries: any[] = [];
    for (const [eid, sessions] of Object.entries(att)) for (const [sess, status] of Object.entries(sessions)) entries.push({ enrollmentId: eid, sessionNo: Number(sess), status });
    if (!entries.length) { showToast('error', '기록할 출결이 없습니다.'); return; }
    setBusy(true);
    try { await api.post('/api/v1/session-attendance', { entries }); qc.invalidateQueries({ queryKey: ['course-term', termId] }); showToast('success', '출결을 저장했습니다.'); }
    catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setBusy(false); }
  };

  const enrollStudent = async () => {
    if (!addStudent || !termId) return;
    setBusy(true);
    try { await api.post('/api/v1/enrollments', { termId, memberIds: [addStudent] }); setAddStudent(''); qc.invalidateQueries({ queryKey: ['course-term', termId] }); showToast('success', '수강생을 추가했습니다.'); }
    catch (e: any) { showToast('error', e?.message || '추가 실패'); }
    finally { setBusy(false); }
  };
  const removeStudent = async (eid: string, name: string) => {
    if (!window.confirm(`${name} 님을 이 차수에서 제외할까요?`)) return;
    try { await api.delete(`/api/v1/enrollments/${eid}`); qc.invalidateQueries({ queryKey: ['course-term', termId] }); } catch (e: any) { showToast('error', e?.message || '실패'); }
  };

  const complete = async () => {
    const below = enrollments.filter((e) => e.status !== 'completed' && presentOf(e.id) < criteria);
    const msg = below.length
      ? `기준 미달 ${below.length}명(${below.map((e) => e.member_name).join(', ')})이 있습니다.\n확인을 누르면 기준 충족자만 수료 확정합니다. (미달자 강제 수료는 아래 예외 승인)`
      : '기준 충족자를 수료 확정할까요?';
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const r = (await api.post<{ data: any }>(`/api/v1/course-terms/${termId}/complete`, { overrideBelow: false }) as any).data;
      qc.invalidateQueries({ queryKey: ['course-term', termId] }); qc.invalidateQueries({ queryKey: ['course-terms', courseId] });
      qc.invalidateQueries({ queryKey: ['group-queue'] });
      showToast('success', `${r.completed}명 수료 확정${r.below?.length ? ` · 미달 ${r.below.length}명 보류` : ''}`);
    } catch (e: any) { showToast('error', e?.message || '실패'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">차수 · 출결</h1>
        <p className="text-sm text-gray-500 mt-1">과정을 고르고 차수를 열어 회차별 출결을 기록하고 수료를 확정합니다.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <label className="flex-1 min-w-[220px]"><span className="text-xs font-medium text-gray-600">과정</span>
          <select className={inputClass} value={courseId} onChange={(e) => { setCourseId(e.target.value); setTermId(null); }}>
            <option value="">과정 선택</option>
            {(coursesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.stage ? ` · ${c.stage}` : ''}</option>)}
          </select></label>
        {courseId && <button onClick={() => setShowNewTerm((v) => !v)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{showNewTerm ? '닫기' : '+ 차수 추가'}</button>}
      </div>

      {showNewTerm && courseId && (
        <NewTermForm api={api} courseId={courseId} busy={busy} setBusy={setBusy} showToast={showToast}
          onDone={() => { setShowNewTerm(false); qc.invalidateQueries({ queryKey: ['course-terms', courseId] }); }} />
      )}

      {/* 차수 목록 */}
      {courseId && !termId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(termsQ.data ?? []).length === 0 ? <p className="text-sm text-gray-400 col-span-2 text-center py-6">아직 차수가 없습니다.</p>
            : (termsQ.data ?? []).map((tm) => (
              <button key={tm.id} onClick={() => setTermId(tm.id)} className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-300">
                <div className="flex items-center justify-between">
                  <b className="text-sm text-gray-800">{tm.course_name} {tm.name}</b>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${tm.status === 'done' ? 'bg-emerald-50 text-emerald-700' : tm.status === 'ongoing' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{tm.status === 'done' ? '종료' : tm.status === 'ongoing' ? '진행 중' : '예정'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{[tm.weekday, tm.time, tm.instructor].filter(Boolean).join(' · ') || '일정 미정'}</p>
                <p className="text-xs text-gray-500 mt-1">수강 {tm.enrolled_count ?? 0}{tm.capacity ? ` / 정원 ${tm.capacity}` : ''}</p>
              </button>
            ))}
        </div>
      )}

      {/* 차수 상세 · 출결 격자 */}
      {termId && term && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <button onClick={() => setTermId(null)} className="text-xs text-gray-400 hover:text-gray-600">← 차수 목록</button>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{term.course_name} {term.name}</h2>
              <p className="text-sm text-gray-500">{[term.weekday, term.time, term.place, term.instructor].filter(Boolean).join(' · ')} · 수강 {enrollments.length}{term.capacity ? ` / ${term.capacity}` : ''} · 수료 기준 {totalSessions}회 중 {criteria}회</p>
            </div>
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => void saveAtt()} className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50">출결 저장</button>
              <button disabled={busy} onClick={() => void complete()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">수료 확정</button>
            </div>
          </div>

          {/* 수강생 추가 */}
          <div className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-lg p-3">
            <div className="flex-1 min-w-[220px]"><span className="text-[11px] text-gray-500">수강생 추가</span>
              <MemberPicker members={pickMembers} value={addStudent} onChange={setAddStudent} placeholder="이름 검색으로 추가" /></div>
            <button disabled={busy || !addStudent} onClick={() => void enrollStudent()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">추가</button>
          </div>

          {enrollments.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">수강생이 없습니다.</p> : (
            <div className="overflow-x-auto">
              <table className="text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-xs text-gray-400">
                    <th className="text-left font-medium px-2 py-2 sticky left-0 bg-white min-w-[140px]">수강생</th>
                    {Array.from({ length: totalSessions }, (_, i) => <th key={i} className="font-medium px-1 py-2 text-center w-8">{i + 1}</th>)}
                    <th className="font-medium px-2 py-2 text-center">출석</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => {
                    const pc = presentOf(e.id);
                    const meets = pc >= criteria;
                    return (
                      <tr key={e.id}>
                        <td className="px-2 py-1.5 sticky left-0 bg-white">
                          <span className="font-medium text-gray-800">{e.member_name}</span>
                          <span className="block text-[11px] text-gray-400">{e.status === 'completed' ? '수료' : (e.group_name || '미소속')}</span>
                        </td>
                        {Array.from({ length: totalSessions }, (_, i) => {
                          const st = att[e.id]?.[i + 1];
                          const mk = ATT_MARK[st ?? 'none'] ?? { m: '', c: 'bg-white text-gray-300 border border-dashed border-gray-200' };
                          return <td key={i} className="px-0.5 py-0.5 text-center">
                            <button onClick={() => cycle(e.id, i + 1)} className={`w-7 h-7 rounded text-xs font-bold ${mk.c}`} title={`${i + 1}회차`}>{mk.m}</button>
                          </td>;
                        })}
                        <td className="px-2 py-1.5 text-center tabular-nums">
                          <span className={meets ? 'text-emerald-600 font-semibold' : e.status === 'completed' ? 'text-gray-500' : 'text-amber-600'}>{pc} / {criteria}</span>
                          <button onClick={() => void removeStudent(e.id, e.member_name)} className="block text-[10px] text-gray-300 hover:text-red-500 mt-0.5">제외</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[11px] text-gray-400 mt-2">셀을 눌러 참석(✓)·보강(보)·불참(·) 순으로 바꾼 뒤 <b>출결 저장</b>을 누르세요. 보강도 출석으로 셈합니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewTermForm({ api, courseId, busy, setBusy, showToast, onDone }: {
  api: any; courseId: string; busy: boolean; setBusy: (v: boolean) => void; showToast: (t: 'success' | 'error', m: string) => void; onDone: () => void;
}) {
  const [f, setF] = useState({ name: '', startDate: '', weekday: '', time: '', place: '', instructor: '', capacity: 0, status: 'planned' });
  const submit = async () => {
    setBusy(true);
    try { await api.post('/api/v1/course-terms', { courseId, ...f, capacity: Number(f.capacity) || 0 }); onDone(); showToast('success', '차수를 추가했습니다.'); }
    catch (e: any) { showToast('error', e?.message || '실패'); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <label className="block"><span className="text-[11px] text-gray-500">차수명</span><input className={inputClass} placeholder="예: 12기" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="block"><span className="text-[11px] text-gray-500">시작일</span><input type="date" className={inputClass} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
      <label className="block"><span className="text-[11px] text-gray-500">요일</span><input className={inputClass} placeholder="예: 수" value={f.weekday} onChange={(e) => setF({ ...f, weekday: e.target.value })} /></label>
      <label className="block"><span className="text-[11px] text-gray-500">시간</span><input className={inputClass} placeholder="예: 19:30" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
      <label className="block"><span className="text-[11px] text-gray-500">장소</span><input className={inputClass} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>
      <label className="block"><span className="text-[11px] text-gray-500">강사</span><input className={inputClass} value={f.instructor} onChange={(e) => setF({ ...f, instructor: e.target.value })} /></label>
      <label className="block"><span className="text-[11px] text-gray-500">정원</span><input type="number" className={inputClass} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></label>
      <div className="flex items-end"><button disabled={busy} onClick={() => void submit()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 w-full">추가</button></div>
    </div>
  );
}
