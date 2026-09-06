import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    queryFn: async () => ((await api.get<{ data: any }>('/api/v1/members?perPage=2000&regStatus=all') as any).data?.items ?? []) as any[],
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
                {n.leaderName ? `${n.leaderName}` : '리더 미지정'} · {memberLabel} {n.memberCount ?? 0}
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
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? '');
  const [leaderId, setLeaderId] = useState<string>(initial?.leaderMemberId ?? '');
  const [subleaderId, setSubleaderId] = useState<string>(initial?.subleaderMemberId ?? '');
  const [meetingDay, setMeetingDay] = useState(initial?.meetingDay ?? '');
  const [meetingTime, setMeetingTime] = useState(initial?.meetingTime ?? '');
  const [meetingPlace, setMeetingPlace] = useState(initial?.meetingPlace ?? '');
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
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const [editing, setEditing] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addId, setAddId] = useState('');
  const [addRole, setAddRole] = useState('member');
  const [tab, setTab] = useState<'members' | 'reports' | 'courses' | 'public'>('members');
  const [showAdd, setShowAdd] = useState(false);

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

  if (splitting) {
    return <SplitForm group={group} preset={preset} members={members} api={api} showToast={showToast}
      onCancel={() => setSplitting(false)} onDone={() => { setSplitting(false); onChanged(); }} />;
  }

  const meeting = [group.meetingDay, group.meetingTime].filter(Boolean).join(' ') + (group.meetingPlace ? ` · ${group.meetingPlace}` : '');
  const overCount = roster.length > 14;
  const statusBadge = group.status === 'paused' ? { t: '중단', c: 'text-[#61697a] bg-[#f2f4f7]' }
    : group.status === 'closed' ? { t: '종료', c: 'text-[#61697a] bg-[#f2f4f7]' }
    : { t: '운영 중', c: 'text-[#0d7a35] bg-[#e9f7ee]' };
  const metaParts = [
    [t.leader, group.leaderName].filter(Boolean).join(' ') + (group.subleaderName ? ` · ${t.subleader} ${group.subleaderName}` : ''),
    group.parent?.name,
    meeting,
    `${t.member} ${roster.length}명`,
  ].filter(Boolean);
  const TABS: [string, string][] = [['members', `${t.member} ${roster.length}`], ['reports', `리포트 ${group.recentReports?.length ?? 0}`], ['courses', '이수 현황'], ['public', '공개 소개']];

  return (
    <div className="text-[#16181d]">
      {/* 헤더 카드 (GR-03) */}
      <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-6 py-[22px] flex gap-5 items-center mb-4">
        {group.photoUrl
          ? <img src={group.photoUrl} alt="" className="w-[72px] h-[72px] rounded-[14px] object-cover shrink-0" />
          : <div className="w-[72px] h-[72px] rounded-[14px] bg-[#eef1f5] text-[#a3aab8] flex items-center justify-center text-[11.5px] font-bold shrink-0">사진</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <b className="text-[22px] font-extrabold">{group.name}</b>
            <span className={`text-[12px] font-extrabold px-2.5 py-1 rounded-full ${statusBadge.c}`}>{statusBadge.t}</span>
            {overCount && <span className="text-[12px] font-extrabold text-[#8a6410] bg-[#fdf4e0] px-2.5 py-1 rounded-full">분가 검토</span>}
          </div>
          <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13.5px] text-[#61697a]">
            {metaParts.map((p, i) => <span key={i}>{p}</span>)}
          </div>
        </div>
        <div className="ml-auto flex gap-2 shrink-0 flex-wrap justify-end">
          <button onClick={() => { setTab('members'); setShowAdd(true); }} className="text-[13px] font-bold border border-[#dfe3ea] text-[#3c4353] px-4 py-2.5 rounded-[9px] hover:bg-[#f7f8fa]">명단 배정</button>
          {roster.length > 0 && <button onClick={() => setSplitting(true)} className="text-[13px] font-bold bg-[#e8f0fe] text-[#1466d6] px-4 py-2.5 rounded-[9px] hover:bg-[#dbe8fc]">분가 처리</button>}
          <button onClick={() => setEditing(true)} className="text-[13px] font-bold border border-[#dfe3ea] text-[#3c4353] px-4 py-2.5 rounded-[9px] hover:bg-[#f7f8fa]">수정</button>
          <button onClick={() => void deleteGroup()} className="text-[13px] font-bold text-[#dc2626] px-3 py-2.5 rounded-[9px] hover:bg-red-50">삭제</button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-5">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`text-[13.5px] px-4 py-[11px] -mb-px ${tab === k ? 'font-bold text-[#1466d6] border-b-2 border-[#1466d6]' : 'font-semibold text-[#61697a] hover:text-[#3c4353]'}`}>{label}</button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4">
          {/* 목원 테이블 */}
          <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-hidden">
            {showAdd && (
              <div className="flex flex-wrap items-end gap-2 bg-[#f7f8fa] p-3 border-b border-[#eef0f4]">
                <div className="flex-1 min-w-[200px]"><span className="text-[11px] text-[#61697a]">교인 추가</span>
                  <MemberPicker members={members} value={addId} onChange={setAddId} placeholder="이름 검색으로 추가" /></div>
                <label><span className="text-[11px] text-[#61697a] block">역할</span>
                  <select className={`${inputClass} sm:w-28`} value={addRole} onChange={(e) => setAddRole(e.target.value)}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></label>
                <button disabled={busy || !addId} onClick={() => void addMember()} className="bg-[#1466d6] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#0f4fa8] disabled:opacity-50">추가</button>
                <button onClick={() => setShowAdd(false)} className="text-xs text-[#8b93a3] px-2 py-2">닫기</button>
              </div>
            )}
            <div className="grid grid-cols-[minmax(0,1.3fr)_84px_minmax(0,1fr)_84px_72px] gap-2.5 px-[18px] py-[11px] bg-[#fafbfc] border-b border-[#eef0f4] text-[11.5px] font-extrabold text-[#8b93a3]">
              <span>{t.member}</span><span>역할</span><span>세대</span><span>합류</span><span>최근 참석</span>
            </div>
            {roster.length === 0 ? <p className="text-sm text-[#8b93a3] py-8 text-center">아직 명단이 비어 있습니다. ‘명단 배정’으로 추가하세요.</p>
              : roster.map((m) => <RosterRow key={m.id} m={m} recentTotal={group.recentTotal ?? 0} onRole={changeRole} onRemove={removeMember} />)}
          </div>

          {/* 우측: 최근 리포트 + 이수 현황 요약 */}
          <div className="flex flex-col gap-3.5">
            <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
              <b className="text-[14px] block mb-3">최근 리포트</b>
              {(group.recentReports?.length ?? 0) === 0 ? <p className="text-[12.5px] text-[#8b93a3]">아직 리포트가 없습니다.</p> : (
                <div className="flex flex-col gap-[11px] text-[12.5px]">
                  {group.recentReports.map((r: any, i: number) => {
                    const badge = r.status === 'confirmed' ? { t: '확인', c: 'text-[#0d7a35] bg-[#e9f7ee]' } : r.status === 'submitted' ? { t: '미확인', c: 'text-[#8a6410] bg-[#fdf4e0]' } : { t: '작성중', c: 'text-[#61697a] bg-[#f2f4f7]' };
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="font-bold">{fmtWeek(r.meetingDate)}</span>
                        <span className="text-[#61697a]">참석 {r.attendanceCount}{r.newcomerCount ? ` · 초신자 ${r.newcomerCount}` : ''}{r.hasCare ? ' · 돌봄 1' : ''}</span>
                        <span className={`ml-auto text-[11.5px] font-extrabold px-2 py-[3px] rounded-full ${badge.c}`}>{badge.t}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
              <b className="text-[14px] block mb-3">이수 현황 요약</b>
              {(group.courseSummary?.length ?? 0) === 0 ? <p className="text-[12.5px] text-[#8b93a3]">등록된 과정이 없습니다.</p> : (
                <div className="flex flex-col gap-3 text-[12.5px]">
                  {group.courseSummary.map((c: any, i: number) => {
                    const total = group.memberTotal || roster.length || 1;
                    const pct = Math.round(((c.completed ?? 0) / total) * 100);
                    return (
                      <div key={i}>
                        <div className="flex mb-1.5"><span>{c.name}</span><span className="ml-auto text-[#61697a]">{c.completed ?? 0} / {total}</span></div>
                        <div className="h-[6px] rounded-full bg-[#eef1f5] overflow-hidden"><div className="h-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#1466d6' }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5">
          <div className="flex items-center mb-3"><b className="text-[14px]">최근 리포트</b>
            <button onClick={() => navigate(`/t/${slug}/group-reports`)} className="ml-auto text-[12.5px] font-bold text-[#1466d6]">리포트 작성</button></div>
          {(group.recentReports?.length ?? 0) === 0 ? <p className="text-[12.5px] text-[#8b93a3]">아직 리포트가 없습니다.</p> : (
            <div className="divide-y divide-[#f2f4f7]">
              {group.recentReports.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <span className="font-bold w-20">{fmtWeek(r.meetingDate)}</span>
                  <span className="text-[#61697a]">참석 {r.attendanceCount}{r.newcomerCount ? ` · 초신자 ${r.newcomerCount}` : ''}</span>
                  <span className={`ml-auto text-[11.5px] font-extrabold px-2 py-[3px] rounded-full ${r.status === 'confirmed' ? 'text-[#0d7a35] bg-[#e9f7ee]' : r.status === 'submitted' ? 'text-[#8a6410] bg-[#fdf4e0]' : 'text-[#61697a] bg-[#f2f4f7]'}`}>{r.status === 'confirmed' ? '확인' : r.status === 'submitted' ? '미확인' : '작성중'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'courses' && (
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5 max-w-2xl">
          <b className="text-[14px] block mb-3">이수 현황 요약 <span className="text-[#8b93a3] font-normal">({t.member} {group.memberTotal || roster.length}명 기준)</span></b>
          {(group.courseSummary?.length ?? 0) === 0 ? <p className="text-[12.5px] text-[#8b93a3]">등록된 과정이 없습니다.</p> : (
            <div className="flex flex-col gap-3.5 text-[13px]">
              {group.courseSummary.map((c: any, i: number) => {
                const total = group.memberTotal || roster.length || 1;
                const pct = Math.round(((c.completed ?? 0) / total) * 100);
                return (
                  <div key={i}>
                    <div className="flex mb-1.5"><span className="font-medium">{c.name}</span><span className="ml-auto text-[#61697a]">{c.completed ?? 0} / {total} · {pct}%</span></div>
                    <div className="h-[7px] rounded-full bg-[#eef1f5] overflow-hidden"><div className="h-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#1466d6' }} /></div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => navigate(`/t/${slug}/group-terms`)} className="text-[12px] text-[#1466d6] font-bold mt-4">차수·출결로 이동</button>
        </div>
      )}

      {tab === 'public' && (
        <div className="bg-white border border-[#e5e7eb] rounded-[14px] px-[22px] py-5 max-w-2xl">
          <div className="flex items-center mb-3"><b className="text-[14px]">공개 소개</b>
            <span className={`ml-auto text-[11.5px] font-extrabold px-2 py-[3px] rounded-full ${group.isPublic ? 'text-[#0d7a35] bg-[#e9f7ee]' : 'text-[#61697a] bg-[#f2f4f7]'}`}>{group.isPublic ? '홈페이지 공개' : '비공개'}</span></div>
          <p className="text-[13px] text-[#3c4353] whitespace-pre-wrap min-h-[40px]">{group.intro || '아직 공개 소개가 없습니다. ‘수정’에서 소개·사진·공개 여부를 설정하세요.'}</p>
          {group.tags?.length > 0 && <div className="flex gap-1.5 flex-wrap mt-3">{group.tags.map((tg: string) => <span key={tg} className="text-[11.5px] text-[#61697a] bg-[#f2f4f7] px-2.5 py-1 rounded-full">{tg}</span>)}</div>}
          <button onClick={() => setEditing(true)} className="text-[12px] text-[#1466d6] font-bold mt-4">소개 편집</button>
        </div>
      )}
    </div>
  );
}

// GR-03 목원 테이블 한 행.
function RosterRow({ m, recentTotal, onRole, onRemove }: {
  m: any; recentTotal: number; onRole: (id: string, role: string) => void; onRemove: (id: string, name: string) => void;
}) {
  return (
    <div className={`grid grid-cols-[minmax(0,1.3fr)_84px_minmax(0,1fr)_84px_72px] gap-2.5 px-[18px] py-3 border-b border-[#f2f4f7] text-[13px] items-center ${m.isTemporary ? 'bg-[#fffdf7]' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {m.memberPhoto ? <img src={m.memberPhoto} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          : <span className="w-7 h-7 rounded-full bg-[#dfe3ea] text-[#61697a] flex items-center justify-center text-[10.5px] font-extrabold shrink-0">{(m.memberName || '·')[0]}</span>}
        <div className="min-w-0">
          <b className="font-bold truncate block">{m.memberName}</b>
          {m.isTemporary && <span className="text-[11px] text-[#b98307] font-bold">교육 중 · 임시</span>}
        </div>
      </div>
      <div className="flex items-center">
        <select value={m.role} onChange={(e) => onRole(m.id, e.target.value)} className="text-[11px] border border-transparent hover:border-[#e5e7eb] rounded-md bg-transparent w-full cursor-pointer appearance-none">
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <span className="text-[#61697a] truncate">{m.householdName || '—'}</span>
      <span className="text-[#61697a]">{m.startDate ? String(m.startDate).slice(0, 7) : '—'}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[#61697a]">{recentTotal ? `${m.recentPresent ?? 0}/${recentTotal}` : '—'}</span>
        <button onClick={() => onRemove(m.id, m.memberName)} className="text-[11px] text-[#cdd3de] hover:text-[#dc2626] ml-auto">제외</button>
      </div>
    </div>
  );
}

function fmtWeek(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주`;
}

// ── 분가 · 번식 (GR-05/06) ────────────────────────────────
function SplitForm({ group, preset, members, api, showToast, onCancel, onDone }: {
  group: Group; preset: Preset | undefined; members: PickMember[];
  api: any; showToast: (t: 'success' | 'error', m: string) => void; onCancel: () => void; onDone: () => void;
}) {
  const t = preset?.terminology ?? { org: '조직', leader: '리더', member: '구성원' };
  const roster: any[] = group.members ?? [];
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [move, setMove] = useState<Record<string, boolean>>({});
  const [meetingDay, setMeetingDay] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [busy, setBusy] = useState(false);
  const moveIds = Object.entries(move).filter(([, v]) => v).map(([k]) => k);

  const submit = async () => {
    if (!name.trim()) { showToast('error', `새 ${t.org} 이름을 입력하세요.`); return; }
    setBusy(true);
    try {
      const r = (await api.post(`/api/v1/groups/${group.id}/split`, {
        name: name.trim(), leaderMemberId: leaderId || null, memberIds: moveIds, meetingDay, meetingTime,
      }) as any).data;
      showToast('success', `분가 완료 · ${r.moved}명 이동`);
      onDone();
    } catch (e: any) { showToast('error', e?.message || '분가 실패'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 max-w-2xl">
      <div>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">← 취소</button>
        <h2 className="text-lg font-bold text-gray-900 mt-1">{group.name} 분가</h2>
        <p className="text-sm text-gray-500">일부 {t.member}을(를) 떼어 새 {t.org}을(를) 만듭니다. 분가 계보가 남습니다.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-gray-600">새 {t.org} 이름 *</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={`예: 25${t.org}`} autoFocus /></label>
        <div className="block sm:col-span-2"><span className="text-xs font-medium text-gray-600">새 {t.leader}</span>
          <MemberPicker members={members} value={leaderId} onChange={setLeaderId} placeholder={`${t.leader} 검색·선택`} /></div>
        <label className="block"><span className="text-xs font-medium text-gray-600">모임 요일</span>
          <input className={inputClass} value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} /></label>
        <label className="block"><span className="text-xs font-medium text-gray-600">모임 시간</span>
          <input className={inputClass} value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} /></label>
      </div>
      <div>
        <span className="text-xs font-medium text-gray-600">새 {t.org}으로 옮길 {t.member} <span className="text-gray-400">({moveIds.length})</span></span>
        <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
          {roster.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={!!move[m.memberId]} onChange={(e) => setMove((p) => ({ ...p, [m.memberId]: e.target.checked }))} className="rounded" />
              {m.memberName}{m.role === 'leader' ? ' (현 리더)' : ''}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={busy || !name.trim()} onClick={() => void submit()} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? '분가 중…' : '분가 실행'}</button>
        <button onClick={onCancel} className="px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">취소</button>
      </div>
    </div>
  );
}
