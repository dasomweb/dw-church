import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast } from '../components';

/**
 * ED-01 과정 관리 · 이수과목 셋업 — 교회가 양육 과정 체계를 직접 정의한다.
 * 과정마다 회차·수료 기준·구분(필수/선택/리더)·선수 과정·대상, 그리고 수료 시
 * 동작(이수 이력 기록 · 미소속이면 배치 대기 · 수료증). 프리셋 기본값 불러오기 제공.
 */
type Course = Record<string, any>;
const REQUIRED_LABEL: Record<string, string> = { required: '필수', optional: '선택', leader: '리더', none: '해당 없음' };

const blank = (sort: number): Course => ({
  name: '', stage: '', prereqCourseId: '', totalSessions: 8, criteria: 6, required: 'optional',
  target: [], recordHistory: true, autoQueue: false, certEnabled: false, sortOrder: sort, isActive: true,
});

export default function CourseManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);

  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get<{ data: Course[] }>('/api/v1/courses') as any).data as Course[] });
  const courses = coursesQ.data ?? [];

  const seedDefaults = async () => {
    if (!window.confirm('현재 운영 모델의 기본 과정을 불러올까요? (이미 있는 이름은 건너뜁니다)')) return;
    setBusy(true);
    try {
      const r = (await api.post<{ data: any }>('/api/v1/courses/seed-defaults', {}) as any).data;
      qc.invalidateQueries({ queryKey: ['courses'] });
      showToast('success', `기본 과정 ${r.created}개를 추가했습니다.`);
    } catch (e: any) { showToast('error', e?.message || '실패'); }
    finally { setBusy(false); }
  };

  const save = async (c: Course) => {
    if (!c.name?.trim()) { showToast('error', '과정 이름을 입력하세요.'); return; }
    setBusy(true);
    const payload = { ...c, prereqCourseId: c.prereqCourseId || null };
    try {
      if (c.id) await api.put(`/api/v1/courses/${c.id}`, payload);
      else await api.post('/api/v1/courses', payload);
      qc.invalidateQueries({ queryKey: ['courses'] });
      setEditing(null);
      showToast('success', '저장했습니다.');
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setBusy(false); }
  };
  const del = async (c: Course) => {
    if (!window.confirm(`${c.name} 과정을 삭제할까요? 진행된 차수·이수 기록도 함께 삭제됩니다.`)) return;
    try { await api.delete(`/api/v1/courses/${c.id}`); qc.invalidateQueries({ queryKey: ['courses'] }); if (editing?.id === c.id) setEditing(null); showToast('success', '삭제했습니다.'); }
    catch (e: any) { showToast('error', e?.message || '실패'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">과정 관리</h1>
          <p className="text-sm text-gray-500 mt-1">양육·훈련 과정을 정의합니다. 회차·수료 기준·선수 과정을 교회가 직접 정합니다.</p>
        </div>
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => void seedDefaults()} className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50">기본값 불러오기</button>
          <button onClick={() => setEditing(blank(courses.length))} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ 과정 추가</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        {/* 목록 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {coursesQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>
            : courses.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">아직 과정이 없습니다. ‘기본값 불러오기’로 시작하세요.</div>
            : (
              <table className="min-w-full text-sm">
                <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium px-4 py-2.5">과정</th>
                  <th className="font-medium px-2 py-2.5 text-center">회차</th>
                  <th className="font-medium px-2 py-2.5 text-center">수료</th>
                  <th className="font-medium px-2 py-2.5 text-center">구분</th>
                  <th className="px-2"></th>
                </tr></thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer ${editing?.id === c.id ? 'bg-blue-50/50' : ''}`} onClick={() => setEditing({ ...c, target: c.target ?? [], prereqCourseId: c.prereq_course_id ?? '', totalSessions: c.total_sessions, recordHistory: c.record_history, autoQueue: c.auto_queue, certEnabled: c.cert_enabled, sortOrder: c.sort_order, isActive: c.is_active })}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-800">{c.name}</span>
                        <span className="block text-[11px] text-gray-400">{[c.stage, c.prereq_name ? `선수: ${c.prereq_name}` : '', c.term_count ? `차수 ${c.term_count}` : ''].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">{c.total_sessions}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">{c.criteria}</td>
                      <td className="px-2 py-2.5 text-center"><span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{REQUIRED_LABEL[c.required] ?? c.required}</span></td>
                      <td className="px-2 py-2.5 text-right"><button onClick={(e) => { e.stopPropagation(); void del(c); }} className="text-xs text-gray-300 hover:text-red-600">삭제</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* 편집 */}
        {editing && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 h-fit">
            <h2 className="text-sm font-semibold text-gray-800">{editing.id ? '과정 수정' : '새 과정'}</h2>
            <label className="block"><span className="text-xs font-medium text-gray-600">과정 이름 *</span>
              <input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-medium text-gray-600">단계</span>
                <input className={inputClass} value={editing.stage} placeholder="예: 1단계" onChange={(e) => setEditing({ ...editing, stage: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">구분</span>
                <select className={inputClass} value={editing.required} onChange={(e) => setEditing({ ...editing, required: e.target.value })}>
                  {Object.entries(REQUIRED_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">총 회차</span>
                <input type="number" className={inputClass} value={editing.totalSessions} onChange={(e) => setEditing({ ...editing, totalSessions: Number(e.target.value) })} /></label>
              <label className="block"><span className="text-xs font-medium text-gray-600">수료 기준 (출석)</span>
                <input type="number" className={inputClass} value={editing.criteria} onChange={(e) => setEditing({ ...editing, criteria: Number(e.target.value) })} /></label>
            </div>
            <label className="block"><span className="text-xs font-medium text-gray-600">선수 과정</span>
              <select className={inputClass} value={editing.prereqCourseId} onChange={(e) => setEditing({ ...editing, prereqCourseId: e.target.value })}>
                <option value="">— 없음 —</option>
                {courses.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <div className="space-y-2 pt-1 border-t border-gray-50">
              <span className="text-xs font-medium text-gray-500">수료하면 자동으로</span>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.recordHistory} onChange={(e) => setEditing({ ...editing, recordHistory: e.target.checked })} className="rounded" /> 교인 카드 이수 이력에 기록</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.autoQueue} onChange={(e) => setEditing({ ...editing, autoQueue: e.target.checked })} className="rounded" /> 미소속이면 배치 대기 큐에 추가</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.certEnabled} onChange={(e) => setEditing({ ...editing, certEnabled: e.target.checked })} className="rounded" /> 수료증 번호 발급</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button disabled={busy} onClick={() => void save(editing)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">저장</button>
              <button onClick={() => setEditing(null)} className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
