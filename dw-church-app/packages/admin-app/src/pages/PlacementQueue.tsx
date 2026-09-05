import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';
import { MemberPicker, type PickMember } from '../components/MemberPicker';

/**
 * GR-09 배치 대기 큐 — 과정 수료자·전입·공개 참석 문의가 여기에 쌓이고, 조직에
 * 배치하면 명단으로 넘어간다(교육/공개 유입은 STEP 3·4에서 자동 연결). STEP 1
 * 에서는 수동 등록 + 조직 배치 + 삭제를 제공한다.
 */
type Preset = Record<string, any>;
type QItem = Record<string, any>;

const SOURCE_LABEL: Record<string, string> = { course: '과정 수료', inquiry: '참석 문의', transfer: '전입', manual: '수동 등록' };

export default function PlacementQueue() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [placeFor, setPlaceFor] = useState<string | null>(null);
  const [placeGroupId, setPlaceGroupId] = useState('');
  const [busy, setBusy] = useState(false);

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: Preset }>('/api/v1/group-preset') as any).data as Preset });
  const queueQ = useQuery({ queryKey: ['group-queue'], queryFn: async () => (await api.get<{ data: QItem[] }>('/api/v1/group-queue?status=waiting') as any).data as QItem[] });
  const groupsQ = useQuery({ queryKey: ['groups-flat'], queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/groups') as any).data as any[] });
  const membersQ = useQuery({ queryKey: ['members-lite'], queryFn: async () => ((await api.get<{ data: any }>('/api/v1/members?perPage=2000') as any).data?.items ?? []) as any[] });

  const t = presetQ.data?.terminology ?? { org: '조직' };
  const pickMembers: PickMember[] = useMemo(
    () => (membersQ.data ?? []).map((m: any) => ({ id: m.id, name: m.name, position: m.position, householdRegion: m.householdRegion || m.region, regStatus: m.regStatus, phone: m.phone, photoUrl: m.photoUrl })),
    [membersQ.data],
  );
  const refresh = () => qc.invalidateQueries({ queryKey: ['group-queue'] });

  const addManual = async () => {
    if (!newMemberId) return;
    setBusy(true);
    try {
      await api.post('/api/v1/group-queue', { memberId: newMemberId, source: 'manual', note: newNote });
      setAdding(false); setNewMemberId(''); setNewNote(''); refresh();
      showToast('success', '대기 명단에 추가했습니다.');
    } catch (e: any) { showToast('error', e?.message || '추가 실패'); }
    finally { setBusy(false); }
  };
  const place = async (id: string) => {
    if (!placeGroupId) { showToast('error', `배치할 ${t.org}을(를) 고르세요.`); return; }
    setBusy(true);
    try {
      await api.post(`/api/v1/group-queue/${id}/place`, { groupId: placeGroupId, reason: 'new' });
      setPlaceFor(null); setPlaceGroupId(''); refresh();
      qc.invalidateQueries({ queryKey: ['groups-tree'] });
      showToast('success', '배치했습니다.');
    } catch (e: any) { showToast('error', e?.message || '배치 실패'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('이 대기 항목을 삭제할까요?')) return;
    try { await api.delete(`/api/v1/group-queue/${id}`); refresh(); } catch (e: any) { showToast('error', e?.message || '실패'); }
  };

  const queue = queueQ.data ?? [];
  const groups = groupsQ.data ?? [];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">배치 대기</h1>
          <p className="text-sm text-gray-500 mt-1">아직 {t.org}에 소속되지 않은 교인을 모아 두고 배치합니다. 과정 수료자와 참석 문의도 여기에 쌓입니다.</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{adding ? '닫기' : '+ 대기 추가'}</button>
      </div>

      {adding && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]"><span className="text-[11px] text-gray-500">교인</span>
            <MemberPicker members={pickMembers} value={newMemberId} onChange={setNewMemberId} placeholder="이름 검색으로 선택" /></div>
          <label className="flex-1 min-w-[180px]"><span className="text-[11px] text-gray-500">메모</span>
            <input className={inputClass} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="예: 새생명반 수료 · Fort Lee 거주" /></label>
          <button disabled={busy || !newMemberId} onClick={() => void addManual()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">추가</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {queueQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>
          : queue.length === 0 ? <EmptyState icon="✅" title="대기 중인 교인이 없습니다" description="모두 배치되었거나, 아직 대기 명단이 비어 있습니다." />
          : (
            <div className="divide-y divide-gray-50">
              {queue.map((q) => (
                <div key={q.id} className="p-4">
                  <div className="flex items-center gap-3">
                    {q.member_photo ? <img src={q.member_photo} alt="" className="w-9 h-9 rounded-full object-cover" /> :
                      <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">{(q.member_name || q.name || '·')[0]}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <b className="text-sm text-gray-800">{q.member_name || q.name || '(이름 없음)'}</b>
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{SOURCE_LABEL[q.source] ?? q.source}</span>
                      </span>
                      <span className="block text-xs text-gray-400 truncate">{[q.household_name, q.address, q.note].filter(Boolean).join(' · ') || '—'}</span>
                    </span>
                    {placeFor === q.id ? (
                      <div className="flex items-center gap-2">
                        <select className={`${inputClass} sm:w-44`} value={placeGroupId} onChange={(e) => setPlaceGroupId(e.target.value)}>
                          <option value="">{t.org} 선택</option>
                          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.leader_name ? ` · ${g.leader_name}` : ''}</option>)}
                        </select>
                        <button disabled={busy} onClick={() => void place(q.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">배치</button>
                        <button onClick={() => { setPlaceFor(null); setPlaceGroupId(''); }} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setPlaceFor(q.id); setPlaceGroupId(''); }} className="text-sm text-blue-600 border border-blue-100 rounded-lg px-3 py-1.5 hover:bg-blue-50">배치</button>
                        <button onClick={() => void remove(q.id)} className="text-xs text-gray-400 hover:text-red-600">삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
