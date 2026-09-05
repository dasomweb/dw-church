import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, useToast } from '../components';

/**
 * RP-01/04 모임 리포트 작성 · 열람 · 확인. 조직과 모임일을 고르면 초안을 불러와
 * 참석 체크 + 프리셋이 정한 리포트 항목(나눔·기도제목·돌봄 요청 등)을 채운다.
 * 임시저장 → 제출 → (교역자) 확인. 돌봄 요청은 교역자만 보는 비공개 항목.
 */
type Preset = Record<string, any>;
const ATT_CYCLE = ['present', 'online', 'absent'] as const;
const ATT_LABEL: Record<string, string> = { present: '참석', online: '온라인', absent: '불참' };
const ATT_COLOR: Record<string, string> = { present: 'bg-emerald-500 text-white', online: 'bg-blue-500 text-white', absent: 'bg-gray-200 text-gray-500' };

function lastSunday(): string {
  const d = new Date(); d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function GroupReports() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(lastSunday());
  const [busy, setBusy] = useState(false);

  // form state
  const [att, setAtt] = useState<Record<string, { status: string; brought: boolean }>>({});
  const [roster, setRoster] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [privateValues, setPrivateValues] = useState<Record<string, any>>({});
  const [newcomer, setNewcomer] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const [status, setStatus] = useState('draft');
  const [confirmer, setConfirmer] = useState('');

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: Preset }>('/api/v1/group-preset') as any).data as Preset });
  const groupsQ = useQuery({ queryKey: ['groups-flat'], queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/groups') as any).data as any[] });

  const t = presetQ.data?.terminology ?? { org: '조직', member: '구성원', report: '리포트' };
  const items: any[] = presetQ.data?.reportItems ?? [];
  const publicItems = items.filter((it) => !it.private && it.type !== 'attendance' && it.key !== 'newcomer');
  const privateItems = items.filter((it) => it.private);
  const hasNewcomer = items.some((it) => it.key === 'newcomer');

  const loadDraft = async (gid: string, d: string) => {
    if (!gid || !d) return;
    const draft = (await api.get<{ data: any }>(`/api/v1/meeting-reports/draft?groupId=${gid}&date=${d}`) as any).data;
    setReportId(draft.id ?? null);
    setStatus(draft.status ?? 'draft');
    setConfirmer(draft.confirmer ?? '');
    setNewcomer(draft.newcomer_count ?? 0);
    setValues(draft.items ?? {});
    setPrivateValues(draft.private_items ?? {});
    setRoster(draft.attendance ?? []);
    const a: Record<string, { status: string; brought: boolean }> = {};
    (draft.attendance ?? []).forEach((r: any) => { a[r.member_id] = { status: r.status ?? 'present', brought: !!r.brought_newcomer }; });
    setAtt(a);
  };

  useEffect(() => { if (groupId) void loadDraft(groupId, date); /* eslint-disable-next-line */ }, [groupId, date]);

  const presentCount = useMemo(() => Object.values(att).filter((a) => a.status === 'present' || a.status === 'online').length, [att]);

  const cycleAtt = (mid: string) => setAtt((prev) => {
    const cur = prev[mid]?.status ?? 'present';
    const next = ATT_CYCLE[(ATT_CYCLE.indexOf(cur as any) + 1) % ATT_CYCLE.length] ?? 'present';
    return { ...prev, [mid]: { status: next, brought: prev[mid]?.brought ?? false } };
  });

  const save = async (submit: boolean) => {
    if (!groupId) { showToast('error', `${t.org}을(를) 고르세요.`); return; }
    setBusy(true);
    try {
      const attendance = roster.map((r) => ({ memberId: r.member_id, status: att[r.member_id]?.status ?? 'present', broughtNewcomer: att[r.member_id]?.brought ?? false }));
      const saved = (await api.post<{ data: any }>('/api/v1/meeting-reports', {
        groupId, meetingDate: date, status: submit ? 'submitted' : 'draft',
        items: values, privateItems: privateValues, attendance, newcomerCount: newcomer,
      }) as any).data;
      setReportId(saved.id); setStatus(saved.status);
      qc.invalidateQueries({ queryKey: ['report-monitor'] });
      showToast('success', submit ? '리포트를 제출했습니다.' : '임시저장했습니다.');
    } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!reportId) return;
    setBusy(true);
    try {
      await api.post(`/api/v1/meeting-reports/${reportId}/confirm`, { confirmer });
      setStatus('confirmed');
      qc.invalidateQueries({ queryKey: ['report-monitor'] });
      showToast('success', '리포트를 확인 처리했습니다.');
    } catch (e: any) { showToast('error', e?.message || '실패'); }
    finally { setBusy(false); }
  };

  const setList = (key: string, arr: string[]) => setValues((v) => ({ ...v, [key]: arr }));
  const listVal = (key: string): string[] => Array.isArray(values[key]) ? values[key] : (values[key] ? [values[key]] : []);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">{t.report ?? '리포트'} 작성</h1>
        <p className="text-sm text-gray-500 mt-1">{t.org}과 모임일을 고르면 명단이 자동으로 불려옵니다. 참석 체크 후 나눔을 적고 제출하세요.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px]"><span className="text-xs font-medium text-gray-600">{t.org}</span>
          <select className={inputClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">{t.org} 선택</option>
            {(groupsQ.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}{g.leader_name ? ` · ${g.leader_name}` : ''}</option>)}
          </select></label>
        <label><span className="text-xs font-medium text-gray-600">모임일</span>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        {status !== 'draft' && (
          <span className={`text-xs px-2.5 py-1 rounded-full mb-1 ${status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
            {status === 'confirmed' ? `확인됨${confirmer ? ` · ${confirmer}` : ''}` : '제출됨 · 확인 대기'}
          </span>
        )}
      </div>

      {groupId && (
        <>
          {/* 참석 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">참석 체크</h3>
              <span className="text-sm text-gray-500">참석 <b className="text-gray-800">{presentCount}</b> / {roster.length}</span>
            </div>
            {roster.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">이 {t.org}에 명단이 없습니다. 먼저 조직에서 명단을 배정하세요.</p> : (
              <div className="flex flex-wrap gap-2">
                {roster.map((r) => {
                  const st = att[r.member_id]?.status ?? 'present';
                  return (
                    <button key={r.member_id} type="button" onClick={() => cycleAtt(r.member_id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${ATT_COLOR[st]}`}>
                      {r.member_name} <span className="text-[10px] opacity-80">{ATT_LABEL[st]}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {hasNewcomer && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
                <span className="text-sm text-gray-600">초신자 동반</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setNewcomer((n) => Math.max(0, n - 1))} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold">−</button>
                  <span className="w-6 text-center tabular-nums">{newcomer}</span>
                  <button type="button" onClick={() => setNewcomer((n) => n + 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold">+</button>
                </div>
              </div>
            )}
          </div>

          {/* 공개 항목 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {publicItems.map((it) => (
              <div key={it.key}>
                <label className="text-sm font-medium text-gray-700">{it.label}</label>
                {it.type === 'list' ? (
                  <ListField values={listVal(it.key)} onChange={(arr) => setList(it.key, arr)} placeholder={`${it.label} 추가`} />
                ) : it.type === 'textarea' ? (
                  <textarea className={`${textareaClass} mt-1`} rows={3} value={values[it.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [it.key]: e.target.value }))} />
                ) : (
                  <input className={`${inputClass} mt-1`} value={values[it.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [it.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>

          {/* 비공개 (교역자만) */}
          {privateItems.length > 0 && (
            <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-5 space-y-3">
              <span className="text-[11px] font-semibold text-amber-700">교역자만 열람</span>
              {privateItems.map((it) => (
                <div key={it.key}>
                  <label className="text-sm font-medium text-gray-700">{it.label}</label>
                  <textarea className={`${textareaClass} mt-1`} rows={2} value={privateValues[it.key] ?? ''} onChange={(e) => setPrivateValues((v) => ({ ...v, [it.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => void save(false)} className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50">임시저장</button>
            <button disabled={busy} onClick={() => void save(true)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">제출</button>
            {status === 'submitted' && reportId && (
              <div className="flex items-center gap-2 ml-auto">
                <input className={`${inputClass} w-32`} placeholder="확인자" value={confirmer} onChange={(e) => setConfirmer(e.target.value)} />
                <button disabled={busy} onClick={() => void confirm()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">확인 처리</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ListField({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => { const s = draft.trim(); if (!s) return; onChange([...values, s]); setDraft(''); };
  return (
    <div className="mt-1 space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 text-sm bg-gray-50 rounded-lg px-3 py-1.5 text-gray-700">{v}</span>
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-xs text-gray-400 hover:text-red-600">삭제</button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="text-sm text-blue-600 font-medium">+ 추가</button>
      </div>
    </div>
  );
}
