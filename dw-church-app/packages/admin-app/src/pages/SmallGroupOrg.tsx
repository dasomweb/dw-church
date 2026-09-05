import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, useToast, EmptyState } from '../components';
import { MemberPicker, type PickMember } from '../components/MemberPicker';

/**
 * GR-02/GR-03 조직 · 상세 · 명단 배정 — 스몰그룹 조직 트리(parent_id 최대 3단)를
 * 왼쪽에 두고, 고른 조직의 상세(리더·모임·상태)와 명단(구성원)을 오른쪽에서 편집.
 * 용어는 프리셋에서 온다(목장/구역/셀/모임 …).
 */
type Preset = Record<string, any>;
type Group = Record<string, any>;

const ROLE_LABEL: Record<string, string> = { leader: '리더', subleader: '부리더', preleader: '예비리더', member: '구성원' };
const REASON_LABEL: Record<string, string> = { new: '신입 배치', reorg: '정기 개편', move: '이사', request: '본인 요청', disband: '해산', other: '기타' };

export default function SmallGroupOrg() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: Preset }>('/api/v1/group-preset') as any).data as Preset });
  const treeQ = useQuery({ queryKey: ['groups-tree'], queryFn: async () => (await api.get<{ data: Group[] }>('/api/v1/groups/tree?status=all') as any).data as Group[] });
  const membersQ = useQuery({
    queryKey: ['members-lite'],
    queryFn: async () => ((await api.get<{ data: any }>('/api/v1/members?perPage=2000') as any).data?.items ?? []) as any[],
  });
  const detailQ = useQuery({
    queryKey: ['group', selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await api.get<{ data: Group }>(`/api/v1/groups/${selectedId}`) as any).data as Group,
  });

  const t = presetQ.data?.terminology ?? { org: '조직', leader: '리더', member: '구성원' };
  const levelDefs: any[] = presetQ.data?.levelDefs ?? [];

  const pickMembers: PickMember[] = useMemo(
    () => (membersQ.data ?? []).map((m: any) => ({
      id: m.id, name: m.name, position: m.position, faithLevel: m.faithLevel,
      householdRegion: m.householdRegion || m.region, regStatus: m.regStatus, phone: m.phone, photoUrl: m.photoUrl,
    })),
    [membersQ.data],
  );

  const refresh = () => { qc.invalidateQueries({ queryKey: ['groups-tree'] }); if (selectedId) qc.invalidateQueries({ queryKey: ['group', selectedId] }); };

  const orgName = t.org ?? '조직';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{orgName} 조직</h1>
          <p className="text-sm text-gray-500 mt-1">조직 트리를 만들고 리더·모임 정보와 명단을 관리합니다.</p>
        </div>
        <button onClick={() => { setCreating(true); setSelectedId(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ {orgName} 추가</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* 트리 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 max-h-[75vh] overflow-y-auto">
          {treeQ.isLoading ? <div className="p-6 text-center text-sm text-gray-400">불러오는 중…</div>
            : (treeQ.data?.length ?? 0) === 0 ? <div className="p-6 text-center text-sm text-gray-400">아직 {orgName}이(가) 없습니다.</div>
            : <TreeList nodes={treeQ.data!} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setCreating(false); }} memberLabel={t.member} />}
        </div>

        {/* 상세 / 생성 */}
        <div className="min-w-0">
          {creating ? (
            <GroupForm mode="create" preset={presetQ.data} levelDefs={levelDefs} tree={treeQ.data ?? []} members={pickMembers}
              onCancel={() => setCreating(false)}
              onSave={async (payload) => {
                setBusy(true);
                try {
                  const g = (await api.post<{ data: Group }>('/api/v1/groups', payload) as any).data as Group;
                  refresh(); setCreating(false); setSelectedId(g.id);
                  showToast('success', `${orgName}을(를) 추가했습니다.`);
                } catch (e: any) { showToast('error', e?.message || '저장 실패'); }
                finally { setBusy(false); }
              }} busy={busy} />
          ) : selectedId && detailQ.data ? (
            <GroupDetail group={detailQ.data} preset={presetQ.data} levelDefs={levelDefs} tree={treeQ.data ?? []} members={pickMembers}
              api={api} showToast={showToast} onChanged={refresh}
              onDeleted={() => { setSelectedId(null); refresh(); }} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <EmptyState icon="🏘️" title={`${orgName}을(를) 선택하세요`} description={`왼쪽에서 ${orgName}을 고르거나 새로 추가하세요.`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 트리 ──────────────────────────────────────────────────
function TreeList({ nodes, selectedId, onSelect, memberLabel, depth = 0 }: {
  nodes: Group[]; selectedId: string | null; onSelect: (id: string) => void; memberLabel: string; depth?: number;
}) {
  return (
    <ul className={depth === 0 ? '' : 'ml-3 border-l border-gray-100 pl-2'}>
      {nodes.map((n) => (
        <li key={n.id}>
          <button onClick={() => onSelect(n.id)}
            className={`w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-2 ${selectedId === n.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-800 truncate">{n.name}</span>
              <span className="block text-[11px] text-gray-400 truncate">
                {n.leader_name ? `${n.leader_name}` : '리더 미지정'} · {memberLabel} {n.member_count ?? 0}
                {n.status && n.status !== 'active' ? ` · ${n.status === 'paused' ? '중단' : '종료'}` : ''}
              </span>
            </span>
          </button>
          {Array.isArray(n.children) && n.children.length > 0 && (
            <TreeList nodes={n.children} selectedId={selectedId} onSelect={onSelect} memberLabel={memberLabel} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

// ── 생성/수정 폼 ─────────────────────────────────────────
function GroupForm({ mode, preset, levelDefs, tree, members, initial, onSave, onCancel, busy }: {
  mode: 'create' | 'edit'; preset: Preset | undefined; levelDefs: any[]; tree: Group[]; members: PickMember[];
  initial?: Group; onSave: (payload: any) => void; onCancel: () => void; busy: boolean;
}) {
  const t = preset?.terminology ?? { org: '조직' };
  const [name, setName] = useState(initial?.name ?? '');
  const [level, setLevel] = useState<number>(initial?.level ?? (levelDefs.length ? levelDefs[levelDefs.length - 1].level : 1));
  const [parentId, setParentId] = useState<string>(initial?.parent_id ?? '');
  const [leaderId, setLeaderId] = useState<string>(initial?.leader_member_id ?? '');
  const [subleaderId, setSubleaderId] = useState<string>(initial?.subleader_member_id ?? '');
  const [meetingDay, setMeetingDay] = useState(initial?.meeting_day ?? '');
  const [meetingTime, setMeetingTime] = useState(initial?.meeting_time ?? '');
  const [meetingPlace, setMeetingPlace] = useState(initial?.meeting_place ?? '');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');

  // 부모 후보 = 자기보다 상위 레벨의 조직들 (평탄화).
  const flat = useMemo(() => {
    const out: Group[] = [];
    const walk = (ns: Group[]) => ns.forEach((n) => { out.push(n); if (n.children) walk(n.children); });
    walk(tree);
    return out.filter((g) => g.id !== initial?.id && (g.level ?? 1) < level);
  }, [tree, level, initial?.id]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), level,
      parentId: parentId || null,
      leaderMemberId: leaderId || null,
      subleaderMemberId: subleaderId || null,
      meetingDay, meetingTime, meetingPlace, region, status,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 max-w-2xl">
      <h2 className="text-sm font-semibold text-gray-800">{mode === 'create' ? `${t.org} 추가` : `${t.org} 정보 수정`}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-gray-600">이름 *</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={`예: 3${t.org}`} autoFocus /></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">계층 단계</span>
          <select className={inputClass} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {(levelDefs.length ? levelDefs : [{ level: 1, name: t.org }]).map((d) => <option key={d.level} value={d.level}>L{d.level} · {d.name}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">상위 조직</span>
          <select className={inputClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— 없음 (최상위) —</option>
            {flat.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select></label>
        <div className="block"><span className="text-xs font-medium text-gray-600">{t.leader ?? '리더'}</span>
          <MemberPicker members={members} value={leaderId} onChange={setLeaderId} placeholder={`${t.leader ?? '리더'} 검색·선택`} /></div>
        <div className="block"><span className="text-xs font-medium text-gray-600">{t.subleader ?? '부리더'}</span>
          <MemberPicker members={members} value={subleaderId} onChange={setSubleaderId} placeholder={`${t.subleader ?? '부리더'} 검색·선택`} /></div>
        <label className="block"><span className="text-xs font-medium text-gray-600">모임 요일</span>
          <input className={inputClass} value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} placeholder="예: 금" /></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">모임 시간</span>
          <input className={inputClass} value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} placeholder="예: 20:00" /></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">모임 장소</span>
          <input className={inputClass} value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} placeholder="예: Palisades Ave 88" /></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">지역</span>
          <input className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: Fort Lee" /></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">상태</span>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">운영 중</option><option value="paused">중단</option><option value="closed">종료</option>
          </select></label>
      </div>
      <div className="flex gap-2 pt-1">
        <button disabled={busy || !name.trim()} onClick={submit} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? '저장 중…' : '저장'}</button>
        <button onClick={onCancel} className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">취소</button>
      </div>
    </div>
  );
}

// ── 상세 + 명단 ──────────────────────────────────────────
function GroupDetail({ group, preset, levelDefs, tree, members, api, showToast, onChanged, onDeleted }: {
  group: Group; preset: Preset | undefined; levelDefs: any[]; tree: Group[]; members: PickMember[];
  api: any; showToast: (t: 'success' | 'error', m: string) => void; onChanged: () => void; onDeleted: () => void;
}) {
  const t = preset?.terminology ?? { org: '조직', member: '구성원', leader: '리더' };
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addId, setAddId] = useState('');
  const [addRole, setAddRole] = useState('member');

  const roster: any[] = group.members ?? [];

  const addMember = async () => {
    if (!addId) return;
    setBusy(true);
    try {
      await api.post(`/api/v1/groups/${group.id}/members`, { memberId: addId, role: addRole, reason: 'new' });
      setAddId(''); setAddRole('member'); onChanged();
      showToast('success', `${t.member}을(를) 추가했습니다.`);
    } catch (e: any) { showToast('error', e?.message || '추가 실패'); }
    finally { setBusy(false); }
  };
  const removeMember = async (gmId: string, name: string) => {
    if (!window.confirm(`${name} 님을 이 ${t.org}에서 제외할까요? (이력은 보존됩니다)`)) return;
    try { await api.delete(`/api/v1/group-members/${gmId}`); onChanged(); showToast('success', '명단에서 제외했습니다.'); }
    catch (e: any) { showToast('error', e?.message || '실패'); }
  };
  const changeRole = async (gmId: string, role: string) => {
    try { await api.put(`/api/v1/group-members/${gmId}`, { role }); onChanged(); }
    catch (e: any) { showToast('error', e?.message || '실패'); }
  };
  const deleteGroup = async () => {
    if (!window.confirm(`${group.name}을(를) 삭제할까요? 하위 조직이 있으면 삭제되지 않습니다.`)) return;
    try { await api.delete(`/api/v1/groups/${group.id}`); showToast('success', '삭제했습니다.'); onDeleted(); }
    catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  if (editing) {
    return <GroupForm mode="edit" preset={preset} levelDefs={levelDefs} tree={tree} members={members} initial={group}
      busy={busy} onCancel={() => setEditing(false)}
      onSave={async (payload) => {
        setBusy(true);
        try { await api.put(`/api/v1/groups/${group.id}`, payload); setEditing(false); onChanged(); showToast('success', '수정했습니다.'); }
        catch (e: any) { showToast('error', e?.message || '저장 실패'); }
        finally { setBusy(false); }
      }} />;
  }

  const meeting = [group.meeting_day, group.meeting_time].filter(Boolean).join(' ') + (group.meeting_place ? ` · ${group.meeting_place}` : '');

  return (
    <div className="space-y-4">
      {/* 헤더 카드 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 truncate">{group.name}</h2>
              {group.status && group.status !== 'active' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{group.status === 'paused' ? '중단' : '종료'}</span>}
              {group.parent?.name && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">{group.parent.name}</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {t.leader ?? '리더'} {group.leader_name || '미지정'}
              {group.subleader_member_id ? '' : ''} · {t.member ?? '구성원'} {roster.length}명
              {meeting ? ` · ${meeting}` : ''}{group.region ? ` · ${group.region}` : ''}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing(true)} className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">수정</button>
            <button onClick={() => void deleteGroup()} className="text-sm text-red-600 border border-red-100 rounded-lg px-3 py-1.5 hover:bg-red-50">삭제</button>
          </div>
        </div>
      </div>

      {/* 명단 배정 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{t.member ?? '구성원'} 명단 <span className="text-gray-400 font-normal">({roster.length})</span></h3>
        <div className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex-1 min-w-[220px]">
            <span className="text-[11px] text-gray-500">교인 추가</span>
            <MemberPicker members={members} value={addId} onChange={setAddId} placeholder="이름 검색으로 추가" />
          </div>
          <label><span className="text-[11px] text-gray-500 block">역할</span>
            <select className={`${inputClass} sm:w-28`} value={addRole} onChange={(e) => setAddRole(e.target.value)}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          <button disabled={busy || !addId} onClick={() => void addMember()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">추가</button>
        </div>

        {roster.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">아직 명단이 비어 있습니다.</p> : (
          <div className="divide-y divide-gray-50">
            {roster.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                {m.member_photo ? <img src={m.member_photo} alt="" className="w-8 h-8 rounded-full object-cover" /> :
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{(m.member_name || '·')[0]}</span>}
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-800">{m.member_name}</span>
                  <span className="block text-[11px] text-gray-400 truncate">
                    {[m.household_name, m.position, m.is_temporary ? '임시' : '', m.reason ? REASON_LABEL[m.reason] : ''].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <select value={m.role} onChange={(e) => void changeRole(m.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600">
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => void removeMember(m.id, m.member_name)} className="text-xs text-gray-400 hover:text-red-600">제외</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
