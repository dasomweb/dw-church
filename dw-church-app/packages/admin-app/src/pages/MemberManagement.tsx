import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, ImageUpload, useToast, EmptyState } from '../components';
import { MemberPicker } from '../components/MemberPicker';
import { StaffAccessModal } from '../components/StaffAccessModal';
import { useEntitlements } from '../hooks/useEntitlements';
import { featureAllowed } from '../lib/plan-features';
import { useAuthStore } from '../stores/auth';

/**
 * 교적관리 — 화면 시안(교적관리 화면 시안.dc.html)을 그대로 구현.
 *   MB-02 교인 명부 (표 + 우측 미리보기, 필터 칩, 선택 시 일괄 작업 바)
 *   MB-03 교인 상세 카드 (헤더 카드 + 탭 6개: 기본정보/가족/출석/심방/성례/이력)
 *   MB-04 교인 등록 (중복 경고 배너 + 세대 라디오 + 하단 고정 액션 바)
 * 이민교회이므로 한자(漢字)는 쓰지 않는다 — 영문명만. 서버 API(/members,
 * /households, /member-codes, /member-visits, /member-sacraments)를 adapter 로
 * 직접 호출하며 응답은 camelCase 로 변환된다. 색·간격은 시안 hex 그대로.
 */

type Member = Record<string, any>;
type Household = Record<string, any>;
type Code = { id: string; category: string; label: string };

// 시안 팔레트 (_tokens.css + 화면 시안 hex 그대로).
const C = {
  brand: '#1466d6', brandHover: '#0f4fa8', brandBg: '#e8f0fe', brandBg2: '#d5e4fb', rowSel: '#f5f9ff',
  ink: '#16181d', text: '#3c4353', muted: '#61697a', faint: '#8b93a3', faintest: '#a3aab8',
  border: '#e5e7eb', border2: '#dfe3ea', line: '#eef0f4', line2: '#f2f4f7',
  surface: '#f7f8fa', surface2: '#fafbfc',
  ok: '#16a34a', okBg: '#e9f7ee', warn: '#b98307', warnBg: '#fdf4e0', warnBorder: '#f3e0b0',
  grayBadge: '#61697a', grayBadgeBg: '#f2f4f7', danger: '#dc2626', avatarBg: '#dfe3ea', avatarBg2: '#eef1f5',
};

// 등록 상태 라벨/뱃지 색 — 시안은 '재적'(active) 사용.
const STATUS_LABEL: Record<string, string> = {
  active: '재적', newcomer: '새가족', inactive: '장기결석', transferred: '전출', deceased: '별세',
};
const STATUS_ORDER = ['active', 'newcomer', 'inactive', 'transferred', 'deceased'] as const;
function statusTone(s: string): { fg: string; bg: string } {
  if (s === 'active') return { fg: C.ok, bg: C.okBg };
  if (s === 'newcomer') return { fg: C.warn, bg: C.warnBg };
  return { fg: C.grayBadge, bg: C.grayBadgeBg };
}

const GENDER_LABEL: Record<string, string> = { M: '남', F: '여' };
const REL_LABEL: Record<string, string> = { spouse: '배우자', child: '자녀', parent: '부모', sibling: '형제' };
const initial = (name?: string) => (name || '·').trim().charAt(0) || '·';
const yearOf = (d?: string) => (d ? String(d).slice(0, 4) : '');
const ymd = (d?: string) => (d ? String(d).slice(0, 10) : '');
function ageOf(d?: string): string {
  if (!d) return '';
  const b = new Date(String(d).slice(0, 10)); if (isNaN(+b)) return '';
  const t = new Date(); let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return `${a}세`;
}

const emptyForm = {
  name: '', nameEn: '', gender: '', birthDate: '', birthLunar: false,
  phone: '', email: '', address: '', position: '', positionCourtesy: false, faithLevel: '', regStatus: 'newcomer',
  registeredOn: '', occupation: '', householdId: '', isHead: false, photoUrl: '', note: '',
};
type Form = typeof emptyForm;

// ── 재사용 요소 ────────────────────────────────────────────
function Avatar({ name, url, size = 30, font = 11 }: { name?: string; url?: string; size?: number; font?: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  return (
    <span style={{ width: size, height: size, fontSize: font, background: C.avatarBg, color: C.muted }}
      className="rounded-full flex items-center justify-center font-extrabold shrink-0">{initial(name)}</span>
  );
}
function Badge({ status }: { status: string }) {
  const t = statusTone(status);
  return <span style={{ color: t.fg, background: t.bg }} className="text-[11.5px] font-extrabold px-2 py-[3px] rounded-full whitespace-nowrap">{STATUS_LABEL[status] ?? status}</span>;
}

export default function MemberManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { slug = '' } = useParams<{ slug: string }>();
  const { features } = useEntitlements(slug);
  const hasSmallgroup = featureAllowed(features, 'smallgroup');

  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  // 오너/관리자만 스태프 권한을 지정할 수 있다(서버 requireAdmin와 일치).
  const myRole = useAuthStore((s) => s.session?.user?.role) ?? '';
  const canManageStaff = ['owner', 'admin', 'super_admin'].includes(myRole);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  // 명부(MB-02) 상태
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'active' | 'newcomer' | 'inactive' | 'all'>('all');
  const [position, setPosition] = useState('');
  const [faith, setFaith] = useState('');
  const [ageBand, setAgeBand] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'photo'>('table');
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);

  // 상세(MB-03) 탭
  const [tab, setTab] = useState<'basic' | 'family' | 'attendance' | 'visits' | 'sacraments' | 'history'>('basic');

  // 등록(MB-04) 세대 모드
  const [hhMode, setHhMode] = useState<'existing' | 'new'>('new');
  const [hhRelation, setHhRelation] = useState('spouse');
  // 신규 세대 생성 입력(비우면 교인 이름으로 자동 명명)
  const [hhNewName, setHhNewName] = useState('');
  const [hhNewRegion, setHhNewRegion] = useState('');

  // Excel(CSV) import
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState('');
  const [createHh, setCreateHh] = useState(true);
  const [importing, setImporting] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ── queries ──
  const codesQ = useQuery({
    queryKey: ['member-codes'],
    queryFn: async () => (await api.get<{ data: Code[] }>('/api/v1/member-codes') as any).data as Code[],
  });
  const codesBy = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of codesQ.data ?? []) (m[c.category] ??= []).push(c.label);
    return m;
  }, [codesQ.data]);

  const householdsQ = useQuery({
    queryKey: ['households-select'],
    queryFn: async () => ((await api.get<{ data: { items: Household[] } }>('/api/v1/households', { perPage: 200 }) as any).data.items ?? []) as Household[],
  });

  const membersQ = useQuery({
    queryKey: ['members', q, status, position, faith],
    queryFn: async () => {
      const params: Record<string, unknown> = { regStatus: status, perPage: 200 };
      if (q.trim()) params.q = q.trim();
      if (position) params.position = position;
      if (faith) params.faithLevel = faith;
      return (await api.get<{ data: { items: Member[]; total: number } }>('/api/v1/members', params) as any).data as { items: Member[]; total: number };
    },
  });

  const statsQ = useQuery({
    queryKey: ['member-stats'],
    queryFn: async () => (await api.get<{ data: any }>('/api/v1/members/stats') as any).data,
  });
  const settingsQ = useQuery({
    queryKey: ['member-settings'],
    queryFn: async () => (await api.get<{ data: any }>('/api/v1/member-settings') as any).data,
  });
  const showPositionDistinction = settingsQ.data?.positionDistinction !== false;

  const detailQ = useQuery({
    queryKey: ['member', detailId],
    enabled: !!detailId && view === 'detail',
    queryFn: async () => (await api.get<{ data: Member }>(`/api/v1/members/${detailId}`) as any).data as Member,
  });
  // 우측 미리보기(MB-02) — 표에서 고른 교인 요약.
  const previewQ = useQuery({
    queryKey: ['member', previewId],
    enabled: !!previewId && view === 'list',
    queryFn: async () => (await api.get<{ data: Member }>(`/api/v1/members/${previewId}`) as any).data as Member,
  });

  // 상세 탭 데이터 — 심방/성례는 각각의 API 에서 실제로 불러온다(더미 아님).
  const visitsQ = useQuery({
    queryKey: ['member-visits', detailId],
    enabled: !!detailId && view === 'detail',
    queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/member-visits', { memberId: detailId }) as any).data as any[],
  });
  const sacramentsQ = useQuery({
    queryKey: ['member-sacraments', detailId],
    enabled: !!detailId && view === 'detail',
    queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/member-sacraments', { memberId: detailId }) as any).data as any[],
  });

  // 소속 목장 · 이수 이력 (스몰그룹 애드온 켠 테넌트만)
  const sgQ = useQuery({
    queryKey: ['member-smallgroup', detailId],
    enabled: !!detailId && view === 'detail' && hasSmallgroup,
    queryFn: async () => (await api.get<{ data: any }>(`/api/v1/members/${detailId}/smallgroup`) as any).data as { groups: any[]; enrollments: any[] },
  });

  // 가족 추가 후보 + 등록 화면 동명이인 검사에 함께 쓰는 전체 명단.
  const [relTo, setRelTo] = useState('');
  const [relType, setRelType] = useState<'spouse' | 'child' | 'parent' | 'sibling'>('spouse');
  const allMembersQ = useQuery({
    queryKey: ['members-all'],
    enabled: view === 'detail' || view === 'edit',
    queryFn: async () => ((await api.get<{ data: { items: Member[] } }>('/api/v1/members', { regStatus: 'all', perPage: 500 }) as any).data.items ?? []) as Member[],
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['members'] });
    void qc.invalidateQueries({ queryKey: ['members-all'] });
    void qc.invalidateQueries({ queryKey: ['member-stats'] });
    void qc.invalidateQueries({ queryKey: ['households-select'] });
  };
  const refreshDetail = () => { if (detailId) void qc.invalidateQueries({ queryKey: ['member', detailId] }); };

  const addRelation = async () => {
    if (!detailId || !relTo) return;
    try {
      await api.post('/api/v1/member-relations', { fromMemberId: detailId, toMemberId: relTo, relationType: relType });
      setRelTo(''); refreshDetail(); showToast('success', '가족을 추가했습니다.');
    } catch (e: any) { showToast('error', e?.message || '추가 실패'); }
  };
  const removeRelation = async (id: string) => {
    if (!id) { showToast('error', '관계 정보를 찾을 수 없습니다.'); return; }
    try { await api.delete(`/api/v1/member-relations/${id}`); refreshDetail(); showToast('success', '가족 관계를 해제했습니다.'); }
    catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { ...form };
      // #1 세대: '신규 세대 생성' 모드면 세대를 먼저 만들고 그 id 로 편입(본인 세대주). 이렇게
      // 해야 가족 연결·세대 표시가 양방향으로 동작한다(이전엔 세대를 아예 안 만들어 세대 미지정).
      if (hhMode === 'new') {
        const hhName = hhNewName.trim() || `${form.name.trim()} 세대`;
        const created = (await api.post<{ data: any }>('/api/v1/households', {
          name: hhName, ...(hhNewRegion.trim() ? { region: hhNewRegion.trim() } : {}),
        }) as any).data;
        body.householdId = created.id;
        body.isHead = form.isHead;
      } else {
        body.isHead = false;
      }
      // 성별·생년월일은 필수(doSave 에서 검증)라 항상 포함. 선택 필드만 빈 값 제거.
      for (const k of ['registeredOn'] as const) if (!body[k]) delete body[k];
      if (!body.householdId) delete body.householdId;
      if (editingId) return api.put(`/api/v1/members/${editingId}`, body);
      return api.post('/api/v1/members', body);
    },
    onSuccess: () => {
      showToast('success', editingId ? '수정되었습니다.' : '교인을 등록했습니다.');
      invalidate(); setView('list');
    },
    onError: (e: any) => showToast('error', e?.message || '저장 실패'),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setHhMode('new'); setHhNewName(''); setHhNewRegion(''); setView('edit'); };
  const openEdit = (m: Member) => {
    setEditingId(m.id);
    setForm({
      name: m.name ?? '', nameEn: m.nameEn ?? '', gender: m.gender ?? '',
      birthDate: ymd(m.birthDate), birthLunar: !!m.birthLunar,
      phone: m.phone ?? '', email: m.email ?? '', address: m.address ?? '',
      position: m.position ?? '', positionCourtesy: !!m.positionCourtesy, faithLevel: m.faithLevel ?? '', regStatus: m.regStatus ?? 'active',
      registeredOn: ymd(m.registeredOn), occupation: m.occupation ?? '',
      householdId: m.householdId ?? '', isHead: !!m.isHead, photoUrl: m.photoUrl ?? '', note: m.note ?? '',
    });
    setHhMode(m.householdId ? 'existing' : 'new');
    setHhNewName(''); setHhNewRegion('');
    setView('edit');
  };
  const openDetail = (id: string) => { setDetailId(id); setTab('basic'); setView('detail'); };

  const remove = async (m: Member) => {
    if (!window.confirm(`${m.name} 교인을 삭제할까요?`)) return;
    try { await api.delete(`/api/v1/members/${m.id}`); showToast('success', '삭제되었습니다.'); invalidate(); }
    catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  const uploadPhoto = async (file: File) => (await apiClient!.uploadFile(file, 'members')) as unknown as string;

  const onCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.readAsText(file);
  };
  const runImport = async () => {
    if (importing || !csv.trim()) { if (!csv.trim()) showToast('error', 'CSV 내용을 붙여넣거나 파일을 선택하세요.'); return; }
    setImporting(true);
    try {
      const r = (await api.post<{ data: any }>('/api/v1/members/import', { csv, createHouseholds: createHh }) as any).data;
      showToast('success', `가져오기 완료 · ${r.imported}명 등록 (세대 ${r.householdsCreated}개, 무효 ${r.invalid})`);
      setCsv(''); setShowImport(false); invalidate();
    } catch (e: any) { showToast('error', e?.message || '가져오기 실패'); }
    finally { setImporting(false); }
  };

  const positions = codesBy['position'] ?? [];
  const faithLevels = codesBy['faith_level'] ?? [];

  // 명부 목록 — 연령대(client-side) 필터.
  const rawItems = membersQ.data?.items ?? [];
  const items = useMemo(() => {
    if (!ageBand) return rawItems;
    const now = new Date().getFullYear();
    const inBand = (m: Member) => {
      const y = Number(yearOf(m.birthDate)); if (!y) return false;
      const a = now - y;
      if (ageBand === '10') return a < 20; if (ageBand === '20') return a >= 20 && a < 30;
      if (ageBand === '30') return a >= 30 && a < 40; if (ageBand === '40') return a >= 40 && a < 50;
      if (ageBand === '50') return a >= 50 && a < 60; return a >= 60;
    };
    return rawItems.filter(inBand);
  }, [rawItems, ageBand]);

  // 미리보기 기본값 = 목록 첫 교인.
  useEffect(() => {
    if (view !== 'list') return;
    if (items.length === 0) { setPreviewId(null); return; }
    if (!previewId || !items.some((m) => m.id === previewId)) setPreviewId(items[0]!.id);
  }, [items, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const selIds = Object.keys(sel).filter((k) => sel[k]);
  const toggleSel = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const clearSel = () => setSel({});

  const btnPrimary = 'px-4 py-2.5 rounded-[9px] text-[13.5px] font-bold text-white';
  const btnOutline = 'px-3.5 py-2.5 rounded-[9px] text-[13px] font-bold border';

  // ══════════════════ MB-03 상세 ══════════════════
  if (view === 'detail') {
    const m = detailQ.data;
    const relations: any[] = m?.relations ?? [];
    const visits: any[] = visitsQ.data ?? [];
    const sacraments: any[] = sacramentsQ.data ?? [];
    const TABS: [typeof tab, string][] = [
      ['basic', '기본정보'], ['family', `가족 ${relations.length}`], ['attendance', '출석'],
      ['visits', `심방 ${visits.length}`], ['sacraments', `성례 ${sacraments.length}`], ['history', '이동·변경이력'],
    ];
    return (
      <div style={{ color: C.ink }}>
        {/* breadcrumb + 액션 */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <button onClick={() => setView('list')} className="text-[13px]" style={{ color: C.muted }}>교인 명부</button>
          <span className="text-[13px]" style={{ color: '#cdd3de' }}>/</span>
          <b className="text-[17px]">{m?.name ?? '…'}</b>
          <div className="ml-auto flex items-center gap-2.5">
            {m && <button onClick={() => void remove(m)} className="text-[13px] font-bold px-2.5 py-2.5" style={{ color: C.danger }}>삭제</button>}
            <button onClick={() => window.print()} className={btnOutline} style={{ color: C.text, borderColor: C.border2 }}>교인카드 인쇄</button>
            {m && canManageStaff && <button onClick={() => setStaffModalOpen(true)} className={btnOutline} style={{ color: C.brand, borderColor: C.border2 }}>스태프 권한</button>}
            {m && <button onClick={() => openEdit(m)} className={btnPrimary} style={{ background: C.brand }}>정보 수정</button>}
          </div>
        </div>

        {staffModalOpen && m && (
          <StaffAccessModal
            memberId={m.id}
            memberName={m.name}
            defaultEmail={m.email}
            onClose={() => setStaffModalOpen(false)}
          />
        )}

        {!m ? <div className="p-8 text-center text-sm" style={{ color: C.faint }}>불러오는 중…</div> : (
          <>
            {/* 헤더 카드 */}
            <div className="bg-white rounded-[14px] flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-4 p-4 sm:p-6" style={{ border: `1px solid ${C.border}` }}>
              {m.photoUrl
                ? <img src={m.photoUrl} alt="" className="rounded-[16px] object-cover shrink-0" style={{ width: 88, height: 88 }} />
                : <div className="rounded-[16px] flex items-center justify-center text-[12px] font-bold shrink-0" style={{ width: 88, height: 88, background: C.avatarBg2, color: C.faintest }}>사진</div>}
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <b className="text-[24px] font-extrabold">{m.name}</b>
                  <Badge status={m.regStatus} />
                  {m.nameEn && <span className="text-[13px]" style={{ color: C.faint }}>{m.nameEn}</span>}
                  {m.requirement && <span className="text-[11.5px] font-extrabold px-2 py-[3px] rounded-full" style={m.requirement.met ? { color: C.ok, background: C.okBg } : { color: C.danger, background: '#fdeaea' }} title={`직분 요건 성례: ${(m.requirement.required || []).join(', ')}`}>{m.requirement.met ? '직분 요건 충족' : '직분 요건 미충족'}</span>}
                </div>
                <div className="flex flex-wrap gap-x-[18px] gap-y-2 text-[13.5px]" style={{ color: C.muted }}>
                  <span>{[m.position && `${m.position}${m.positionCourtesy ? ' · 타교회' : ''}`, m.faithLevel].filter(Boolean).join(' · ') || '직분·신급 미입력'}</span>
                  <span>{[m.householdRegion, m.householdName].filter(Boolean).join(' · ') || '세대 미지정'}</span>
                  <span>{[GENDER_LABEL[m.gender], m.birthDate && `${ymd(m.birthDate)}${m.birthLunar ? ' (음)' : ''}`, ageOf(m.birthDate) && `(${ageOf(m.birthDate)})`].filter(Boolean).join(' · ') || '생년 미입력'}</span>
                  {m.registeredOn && <span>등록 {ymd(m.registeredOn)}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto sm:shrink-0">
                {m.phone && <a href={`tel:${m.phone}`} className={btnOutline} style={{ color: C.text, borderColor: C.border2 }}>전화</a>}
                {m.phone && <a href={`sms:${m.phone}`} className={btnOutline} style={{ color: C.text, borderColor: C.border2 }}>문자</a>}
                <button onClick={() => setTab('visits')} className={btnOutline} style={{ color: C.brand, background: C.brandBg, borderColor: 'transparent' }}>심방 기록</button>
              </div>
            </div>

            {/* 탭 */}
            <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: `1px solid ${C.border}` }}>
              {TABS.map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  className="text-[13.5px] px-4 py-[11px] -mb-px whitespace-nowrap"
                  style={tab === k ? { fontWeight: 700, color: C.brand, borderBottom: `2px solid ${C.brand}` } : { fontWeight: 600, color: C.muted }}>{label}</button>
              ))}
            </div>

            {tab === 'basic' && (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
                <div className="flex flex-col gap-4">
                  <Panel title="인적사항">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-3.5 text-[13.5px]">
                      <Field label="생년월일" value={m.birthDate ? `${ymd(m.birthDate)}${m.birthLunar ? ' (음력)' : ' (양력)'}` : '—'} />
                      <Field label="성별" value={GENDER_LABEL[m.gender] ?? '—'} />
                      <Field label="연락처" value={m.phone || '—'} />
                      <Field label="이메일" value={m.email || '—'} ellipsis />
                      <Field label="주소" value={m.address || '—'} span />
                      <Field label="직업" value={m.occupation || '—'} />
                      <Field label="영문명" value={m.nameEn || '—'} />
                    </dl>
                  </Panel>
                  <Panel title="교회 정보">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-3.5 text-[13.5px]">
                      <Field label="직분" value={m.position ? `${m.position}${m.positionCourtesy ? ' (타교회)' : ''}` : '—'} />
                      <Field label="신급" value={m.faithLevel || '—'} />
                      <Field label="구역" value={m.householdRegion || '—'} />
                      <Field label="등록일" value={ymd(m.registeredOn) || '—'} />
                      <Field label="등록상태" value={STATUS_LABEL[m.regStatus] ?? m.regStatus} span />
                      {m.note && <Field label="비고" value={m.note} span muted />}
                    </dl>
                  </Panel>
                </div>
                <div className="flex flex-col gap-4">
                  <Panel title={`가족${m.householdName ? ` · ${m.householdName}` : ''}`}>
                    {relations.length === 0 ? <p className="text-[12.5px]" style={{ color: C.faint }}>등록된 가족이 없습니다. ‘가족’ 탭에서 추가하세요.</p> : (
                      <div className="flex flex-col gap-3">
                        {relations.map((r) => (
                          <div key={r.id} className="flex items-center gap-2.5 text-[13px]">
                            <Avatar name={r.toMemberName} url={r.toMemberPhoto} size={32} />
                            <div><b className="font-bold block">{r.toMemberName}</b><span className="text-[11.5px]" style={{ color: C.faint }}>{REL_LABEL[r.relationType] ?? r.relationType}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                  <Panel title="최근 기록">
                    {visits.length === 0 ? <p className="text-[12.5px]" style={{ color: C.faint }}>최근 심방·상담 기록이 없습니다.</p> : (
                      <div className="flex flex-col gap-3.5 text-[12.5px]" style={{ color: '#4a5262' }}>
                        {visits.slice(0, 4).map((v) => (
                          <div key={v.id} className="flex gap-2.5">
                            <span className="rounded-full mt-[7px] shrink-0" style={{ width: 7, height: 7, background: C.brand }} />
                            <div><b className="font-bold">{({ visit: '심방', phone: '전화', counsel: '상담' } as any)[v.visitType] ?? '심방'}</b> {v.content || v.prayer || ''} {v.visitor && <span style={{ color: C.faint }}>· {v.visitor}</span>}<span style={{ color: C.faint }}> · {ymd(v.visitDate)}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                  {hasSmallgroup && (
                    <Panel title="소속 목장 · 이수 이력">
                      {(sgQ.data?.groups?.length ?? 0) === 0 && (sgQ.data?.enrollments?.length ?? 0) === 0
                        ? <p className="text-[12.5px]" style={{ color: C.faint }}>소속 목장·이수 이력이 없습니다.</p>
                        : (
                          <div className="flex flex-col gap-2 text-[13px]">
                            {(sgQ.data?.groups ?? []).map((g: any) => (
                              <div key={g.id} className="flex items-center gap-2"><span className="font-bold">{g.name}</span><span className="text-[11px] rounded-full px-2 py-0.5" style={{ color: C.brand, background: C.brandBg }}>{({ leader: '리더', subleader: '부리더', preleader: '예비리더', member: '구성원' } as any)[g.role] ?? g.role}</span>{g.leaderName && <span className="text-[11.5px] ml-auto" style={{ color: C.faint }}>리더 {g.leaderName}</span>}</div>
                            ))}
                            {(sgQ.data?.enrollments ?? []).map((e: any) => (
                              <div key={e.id} className="flex items-center gap-2"><span className="font-bold">{e.courseName}{e.termName ? ` ${e.termName}` : ''}</span><span className="text-[11px] rounded-full px-2 py-0.5" style={e.status === 'completed' ? { color: C.ok, background: C.okBg } : { color: C.brand, background: C.brandBg }}>{({ completed: '수료', enrolled: '수강 중', applied: '신청', dropped: '중도포기' } as any)[e.status] ?? e.status}</span></div>
                            ))}
                          </div>
                        )}
                    </Panel>
                  )}
                </div>
              </div>
            )}

            {tab === 'family' && (
              <Panel title={`가족 · ${m.householdName || '세대 미지정'}`} max>
                {relations.length === 0 ? <p className="text-[13px] mb-4" style={{ color: C.faint }}>등록된 가족 관계가 없습니다.</p> : (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {relations.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 text-[13px]" style={{ border: `1px solid ${C.border}` }}>
                        <Avatar name={r.toMemberName} url={r.toMemberPhoto} size={24} font={10} />
                        <b className="font-bold">{r.toMemberName}</b><span className="text-[11.5px]" style={{ color: C.faint }}>{REL_LABEL[r.relationType] ?? r.relationType}</span>
                        <button onClick={() => removeRelation(r.id)} style={{ color: '#cdd3de' }} className="ml-0.5 hover:text-red-500" aria-label="삭제">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-center pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="w-full sm:w-64"><MemberPicker members={(allMembersQ.data ?? []).filter((c) => c.id !== m.id) as any} value={relTo} onChange={setRelTo} placeholder="가족 교인 검색" /></div>
                  <select className={`${inputClass} w-auto`} value={relType} onChange={(e) => setRelType(e.target.value as any)}>
                    <option value="spouse">배우자</option><option value="child">자녀</option><option value="parent">부모</option><option value="sibling">형제</option>
                  </select>
                  <button disabled={!relTo} onClick={() => void addRelation()} className={`${btnPrimary} disabled:opacity-40`} style={{ background: C.brand }}>가족 추가</button>
                </div>
              </Panel>
            )}

            {tab === 'attendance' && (
              <Panel title="출석" max>
                <p className="text-[13px]" style={{ color: C.faint }}>개인별 주간 출석 집계는 <button onClick={() => { }} className="font-bold" style={{ color: C.brand }} disabled>출석</button> 메뉴에서 예배·날짜별로 기록·조회합니다.</p>
              </Panel>
            )}

            {tab === 'visits' && (
              <Panel title={`심방 · 상담 ${visits.length}`} max>
                {visits.length === 0 ? <p className="text-[13px]" style={{ color: C.faint }}>심방·상담 기록이 없습니다.</p> : (
                  <div className="flex flex-col gap-3">
                    {visits.map((v) => (
                      <div key={v.id} className="rounded-[12px] p-4" style={{ border: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2 mb-1.5 text-[13px]">
                          <b className="font-bold">{({ visit: '심방', phone: '전화', counsel: '상담' } as any)[v.visitType] ?? '심방'}</b>
                          <span style={{ color: C.faint }}>{ymd(v.visitDate)}</span>
                          {v.visitor && <span style={{ color: C.faint }}>· {v.visitor}</span>}
                        </div>
                        {v.content && <p className="text-[13px] whitespace-pre-wrap" style={{ color: C.text }}>{v.content}</p>}
                        {v.prayer && <p className="text-[12.5px] mt-1.5" style={{ color: C.muted }}>기도제목 · {v.prayer}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {tab === 'sacraments' && (
              <Panel title={`성례 ${sacraments.length}`} max>
                {sacraments.length === 0 ? <p className="text-[13px]" style={{ color: C.faint }}>등록된 성례 기록이 없습니다.</p> : (
                  <div className="flex flex-col gap-2.5">
                    {sacraments.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 text-[13px] rounded-[10px] px-4 py-3" style={{ background: C.surface }}>
                        <b className="font-bold flex-0">{s.sacType || '성례'}</b>
                        <span style={{ color: C.muted }}>{ymd(s.sacDate)}</span>
                        {s.officiant && <span style={{ color: C.faint }}>· {s.officiant}</span>}
                        {s.recognized === false && <span className="text-[11.5px] ml-auto rounded-full px-2 py-0.5" style={{ color: C.warn, background: C.warnBg }}>미인정</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {tab === 'history' && (
              <Panel title="이동 · 변경이력" max>
                <p className="text-[13px]" style={{ color: C.faint }}>전입·전출 등 이동 처리와 정보 변경 이력이 이곳에 시간순으로 쌓입니다.</p>
              </Panel>
            )}
          </>
        )}
      </div>
    );
  }

  // ══════════════════ MB-04 등록/수정 ══════════════════
  if (view === 'edit') {
    const filled = [form.name.trim(), form.gender, form.birthDate].filter(Boolean).length;
    // 동명이인 경고 — 등록(신규)일 때, 같은 이름 + 같은 출생연도 교인이 이미 있으면.
    const dup = !editingId && form.name.trim()
      ? (allMembersQ.data ?? []).find((c) => c.name === form.name.trim() && (!form.birthDate || yearOf(c.birthDate) === yearOf(form.birthDate)))
      : undefined;
    const households = householdsQ.data ?? [];
    const hhInput = inputClass;
    const canSave = !!form.name.trim() && !!form.gender && !!form.birthDate && !saving && !saveMutation.isPending;
    // #3 필수값 검증 — 이름·성별·생년월일이 모두 있어야 저장(이전엔 이름만 확인해 성별·생년월일 없이 저장됨).
    const doSave = () => {
      if (!form.name.trim()) { showToast('error', '이름을 입력하세요.'); return; }
      if (!form.gender) { showToast('error', '성별을 선택하세요.'); return; }
      if (!form.birthDate) { showToast('error', '생년월일을 입력하세요.'); return; }
      setSaving(true); saveMutation.mutate(undefined, { onSettled: () => setSaving(false) });
    };

    return (
      <div className="max-w-[1000px]" style={{ color: C.ink }}>
        <button onClick={() => setView('list')} className="text-[13px]" style={{ color: C.muted }}>교인 명부로 돌아가기</button>
        <h3 className="text-[22px] font-extrabold mt-2 mb-5">{editingId ? '교인 수정' : '교인 등록'}</h3>

        {dup && (
          <div className="rounded-[11px] flex items-center gap-3 mb-4" style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, padding: '13px 16px' }}>
            <b className="text-[13px] shrink-0" style={{ color: C.warn }}>확인 필요</b>
            <span className="text-[13px]" style={{ color: '#8a6410' }}>같은 이름·출생연도의 교인이 이미 있습니다 — {dup.name} ({yearOf(dup.birthDate) || '연도미상'}{dup.householdRegion ? `, ${dup.householdRegion}` : ''}, {STATUS_LABEL[dup.regStatus] ?? dup.regStatus})</span>
            <button onClick={() => openDetail(dup.id)} className="ml-auto text-[12.5px] font-bold rounded-[8px] px-3 py-1.5 bg-white shrink-0" style={{ color: '#8a6410', border: '1px solid #e3c98a' }}>기존 교인 보기</button>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* 인적사항 */}
          <div className="bg-white rounded-[14px]" style={{ border: `1px solid ${C.border}`, padding: '22px 24px' }}>
            <b className="text-[14.5px] block mb-1">인적사항</b>
            <span className="text-[12.5px] block mb-[18px]" style={{ color: C.faint }}>이름·성별·생년월일이 필수입니다. 나머지는 나중에 채울 수 있습니다.</span>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 w-[108px]">
                <ImageUpload compact label="" value={form.photoUrl} onChange={(u) => set('photoUrl', u)} onUpload={uploadPhoto} aspectRatio="3/4" resize="block" />
                <span className="block text-[11px] text-center mt-1.5" style={{ color: C.faintest }}>3:4 권장</span>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <Lbl req label="이름"><input className={hhInput} value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Lbl>
                <Lbl label="영문명"><input className={hhInput} value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Eunhye Kim" /></Lbl>
                <Lbl req label="성별">
                  <div className="flex rounded-[9px] overflow-hidden h-10" style={{ border: `1px solid ${C.border2}` }}>
                    {(['M', 'F'] as const).map((g) => (
                      <button key={g} type="button" onClick={() => set('gender', g)} className="flex-1 text-[13.5px]"
                        style={form.gender === g ? { background: C.brand, color: '#fff', fontWeight: 700 } : { color: C.muted, fontWeight: 600, background: '#fff' }}>{GENDER_LABEL[g]}</button>
                    ))}
                  </div>
                </Lbl>
                <Lbl req label="생년월일">
                  <div className="flex gap-2">
                    <input type="date" className={`${hhInput} flex-1`} value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
                    <button type="button" onClick={() => set('birthLunar', !form.birthLunar)} className="rounded-[9px] text-[13px] px-3 whitespace-nowrap"
                      style={form.birthLunar ? { background: C.brandBg, color: C.brand, border: `1px solid ${C.brand}`, fontWeight: 700 } : { color: C.text, border: `1px solid ${C.border2}` }}>{form.birthLunar ? '음력' : '양력'}</button>
                  </div>
                </Lbl>
              </div>
            </div>
          </div>

          {/* 교회 정보 */}
          <div className="bg-white rounded-[14px]" style={{ border: `1px solid ${C.border}`, padding: '22px 24px' }}>
            <b className="text-[14.5px] block mb-[18px]">교회 정보</b>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <Lbl label="등록 상태"><select className={hhInput} value={form.regStatus} onChange={(e) => set('regStatus', e.target.value)}>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Lbl>
              <Lbl label="직분"><select className={hhInput} value={form.position} onChange={(e) => set('position', e.target.value)}><option value="">해당 없음</option>{positions.map((p) => <option key={p} value={p}>{p}</option>)}</select></Lbl>
              <Lbl label="신급"><select className={hhInput} value={form.faithLevel} onChange={(e) => set('faithLevel', e.target.value)}><option value="">해당 없음</option>{faithLevels.map((p) => <option key={p} value={p}>{p}</option>)}</select></Lbl>
              <Lbl label="등록일"><input type="date" className={hhInput} value={form.registeredOn} onChange={(e) => set('registeredOn', e.target.value)} /></Lbl>
              <Lbl label="전화"><input className={hhInput} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(201) 555-0000" /></Lbl>
              <Lbl label="이메일"><input className={hhInput} value={form.email} onChange={(e) => set('email', e.target.value)} /></Lbl>
              <Lbl label="직업"><input className={hhInput} value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></Lbl>
              <div className="sm:col-span-2 lg:col-span-3"><Lbl label="주소"><input className={hhInput} value={form.address} onChange={(e) => set('address', e.target.value)} /></Lbl></div>
              {showPositionDistinction && (
                <label className="flex items-center gap-2 text-[13px] sm:col-span-2 lg:col-span-3" style={{ color: C.text }} title="타 교회에서 받은 직분일 때 체크">
                  <input type="checkbox" checked={form.positionCourtesy} onChange={(e) => set('positionCourtesy', e.target.checked)} className="rounded" /> 타 교회에서 받은 직분
                </label>
              )}
            </div>
          </div>

          {/* 세대 */}
          <div className="bg-white rounded-[14px]" style={{ border: `1px solid ${C.border}`, padding: '22px 24px' }}>
            <b className="text-[14.5px] block mb-1">세대</b>
            <span className="text-[12.5px] block mb-4" style={{ color: C.faint }}>가족 단위 관리의 기준입니다. 혼자 등록하는 경우에도 신규 세대로 둘 수 있습니다.</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {([['existing', '기존 세대에 편입', '가족이 이미 교회에 등록된 경우'], ['new', '신규 세대 생성', '본인이 세대주가 됩니다']] as const).map(([mode, t, sub]) => (
                <button key={mode} type="button" onClick={() => { setHhMode(mode); if (mode === 'new') { set('householdId', ''); set('isHead', true); } else set('isHead', false); }}
                  className="rounded-[11px] flex gap-2.5 items-start text-left" style={{ padding: '14px 16px', border: hhMode === mode ? `1.5px solid ${C.brand}` : `1px solid ${C.border2}`, background: hhMode === mode ? C.rowSel : '#fff' }}>
                  <span className="rounded-full shrink-0 mt-0.5" style={{ width: 16, height: 16, border: hhMode === mode ? `5px solid ${C.brand}` : `1.5px solid #cdd3de`, background: '#fff' }} />
                  <span><b className="text-[13.5px] block">{t}</b><span className="text-[12px]" style={{ color: C.muted }}>{sub}</span></span>
                </button>
              ))}
            </div>
            {hhMode === 'existing' && (
              <>
                <div className="rounded-[10px] overflow-hidden mb-3.5" style={{ border: `1px solid ${C.border}` }}>
                  {households.length === 0 ? <div className="px-4 py-3 text-[13px]" style={{ color: C.faint }}>등록된 세대가 없습니다. ‘신규 세대 생성’을 이용하세요.</div>
                    : households.map((h, i) => (
                      <button key={h.id} type="button" onClick={() => set('householdId', h.id)} className="w-full flex items-center gap-3 text-left text-[13px]"
                        style={{ padding: '11px 14px', borderBottom: i < households.length - 1 ? `1px solid ${C.line}` : 'none', background: form.householdId === h.id ? C.rowSel : '#fff' }}>
                        <b className="font-bold">{h.name || '(무제) 세대'}</b>
                        {h.region && <span style={{ color: C.muted }}>{h.region}</span>}
                        <span style={{ color: C.faint }}>구성원 {h.memberCount ?? 0}</span>
                        <span className="ml-auto text-[12.5px] font-bold" style={{ color: form.householdId === h.id ? C.brand : C.muted }}>{form.householdId === h.id ? '선택됨' : '선택'}</span>
                      </button>
                    ))}
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <span className="text-[12.5px] font-bold">관계</span>
                  <select value={hhRelation} onChange={(e) => setHhRelation(e.target.value)} className={`${inputClass} w-40`}>
                    <option value="spouse">배우자</option><option value="child">자녀</option><option value="parent">부모</option><option value="sibling">형제</option>
                  </select>
                  <span className="text-[12.5px]" style={{ color: C.muted }}>세대 주소·연락처를 참고해 입력하세요</span>
                </div>
              </>
            )}
            {hhMode === 'new' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Lbl label="세대 이름"><input className={hhInput} value={hhNewName} onChange={(e) => setHhNewName(e.target.value)} placeholder={form.name.trim() ? `${form.name.trim()} 세대` : '예: 김은혜 세대'} /></Lbl>
                  <Lbl label="구역"><input className={hhInput} value={hhNewRegion} onChange={(e) => setHhNewRegion(e.target.value)} placeholder="예: 1구역 (선택)" /></Lbl>
                </div>
                <label className="flex items-center gap-2 text-[13px]" style={{ color: C.text }}>
                  <input type="checkbox" checked={form.isHead} onChange={(e) => set('isHead', e.target.checked)} className="rounded" /> 본인을 세대주로 지정
                </label>
                <span className="text-[12px]" style={{ color: C.faint }}>세대 이름을 비워두면 ‘{form.name.trim() || '교인'} 세대’로 자동 생성됩니다.</span>
              </div>
            )}
          </div>

          {/* 비고 */}
          <div className="bg-white rounded-[14px]" style={{ border: `1px solid ${C.border}`, padding: '22px 24px' }}>
            <Lbl label="비고"><textarea rows={3} className={textareaClass} value={form.note} onChange={(e) => set('note', e.target.value)} /></Lbl>
          </div>

          {/* 하단 고정 액션 */}
          <div className="bg-white rounded-[14px] flex items-center gap-4 flex-wrap" style={{ border: `1px solid ${C.border}`, padding: '18px 24px' }}>
            <span className="text-[13px]" style={{ color: C.muted }}>필수 3개 중 {filled}개 입력됨</span>
            <div className="ml-auto flex gap-2.5">
              <button onClick={() => setView('list')} className="text-[13.5px] font-bold px-4 py-2.5" style={{ color: C.muted }}>취소</button>
              <button disabled={!canSave} onClick={doSave} className={`${btnPrimary} disabled:opacity-50`} style={{ background: C.brand }}>{saveMutation.isPending ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════ MB-02 교인 명부 ══════════════════
  const total = membersQ.data?.total ?? 0;
  const s = statsQ.data;
  const pv = previewQ.data;
  const chip = (active: boolean) => active
    ? { color: C.brand, background: C.brandBg, fontWeight: 700 as const, border: 'none' }
    : { color: C.muted, background: '#fff', fontWeight: 600 as const, border: `1px solid ${C.border2}` };

  return (
    <div style={{ color: C.ink }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <b className="text-[17px]">교인 명부</b>
        <span className="text-[12.5px]" style={{ color: C.muted }}>{total.toLocaleString()}명 중 <b className="font-bold" style={{ color: C.ink }}>{items.length}명</b> 표시</span>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto sm:ml-auto sm:justify-end">
          <button onClick={() => setShowImport((v) => !v)} className={btnOutline} style={{ color: C.text, borderColor: C.border2 }}>엑셀 가져오기</button>
          <button onClick={() => window.print()} className={btnOutline} style={{ color: C.text, borderColor: C.border2 }}>인쇄 · 내보내기</button>
          <button onClick={openCreate} className={btnPrimary} style={{ background: C.brand }}>교인 등록</button>
        </div>
      </div>

      {showImport && (
        <div className="bg-white rounded-[14px] p-5 space-y-3 mb-4" style={{ border: `1px solid ${C.brandBg2}` }}>
          <h2 className="text-sm font-semibold" style={{ color: C.text }}>엑셀(CSV) 가져오기 — 초기 이관</h2>
          <p className="text-xs" style={{ color: C.muted }}>엑셀을 <b>CSV로 내보내</b> 붙여넣거나 파일을 선택하세요. 첫 줄 헤더(<code>이름,성별,생년월일,전화,직분,신급,주소,구역,등록상태</code>)를 자동 인식합니다.</p>
          <textarea rows={5} className={`${textareaClass} font-mono text-xs`} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'이름,성별,생년월일,전화,직분,구역\n김철수,남,1978-09-05,(201) 555-0101,집사,1구역'} />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input type="file" accept=".csv,text/csv,text/plain" onChange={onCsvFile} className="text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={createHh} onChange={(e) => setCreateHh(e.target.checked)} className="rounded" /> 세대 자동 생성</label>
            <button disabled={importing} onClick={() => void runImport()} className={`${btnPrimary} disabled:opacity-50 sm:ml-auto`} style={{ background: C.brand }}>{importing ? '가져오는 중…' : '가져오기'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_344px] gap-4">
        {/* 좌: 검색·필터·표 */}
        <div className="min-w-0">
          {/* 검색 + 표/사진 토글 */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <input className={`${inputClass} flex-1`} placeholder="이름 · 전화 뒷자리 · 주소 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            {(['table', 'photo'] as const).map((vm) => (
              <button key={vm} onClick={() => setViewMode(vm)} className="text-[13px] font-bold rounded-[9px] px-3.5 py-2.5"
                style={viewMode === vm ? { color: '#fff', background: C.text } : { color: C.muted, background: '#fff', border: `1px solid ${C.border2}` }}>{vm === 'table' ? '표' : '사진'}</button>
            ))}
          </div>

          {/* 필터 칩 */}
          <div className="flex flex-wrap gap-[7px] mb-4">
            {status !== 'all' && (
              <button onClick={() => setStatus('all')} className="text-[12.5px] px-3 py-1.5 rounded-full" style={chip(true)}>{status === 'active' ? '재적' : status === 'newcomer' ? '새가족' : '장기결석'} ×</button>
            )}
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="text-[12.5px] px-3 py-1.5 rounded-full" style={chip(status !== 'all')}>
              <option value="all">상태 전체</option><option value="active">재적</option><option value="newcomer">새가족</option><option value="inactive">장기결석</option>
            </select>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="text-[12.5px] px-3 py-1.5 rounded-full" style={chip(!!position)}>
              <option value="">직분 전체</option>{positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={faith} onChange={(e) => setFaith(e.target.value)} className="text-[12.5px] px-3 py-1.5 rounded-full" style={chip(!!faith)}>
              <option value="">신급 전체</option>{faithLevels.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className="text-[12.5px] px-3 py-1.5 rounded-full" style={chip(!!ageBand)}>
              <option value="">연령 전체</option><option value="10">10대</option><option value="20">20대</option><option value="30">30대</option><option value="40">40대</option><option value="50">50대</option><option value="60">60대+</option>
            </select>
          </div>

          {/* 선택 시 일괄 작업 바 */}
          {selIds.length > 0 && (
            <div className="rounded-[10px] flex items-center gap-3 mb-3.5" style={{ background: C.brandBg, border: `1px solid ${C.brandBg2}`, padding: '10px 14px' }}>
              <b className="text-[13px]" style={{ color: C.brand }}>{selIds.length}명 선택</b>
              <div className="flex gap-[7px] ml-auto flex-wrap">
                <button onClick={() => showToast('success', '알림톡 발송은 발송 설정(알림톡 계정) 등록 후 사용할 수 있습니다.')} className="text-[12.5px] font-bold rounded-[8px] px-3 py-1.5 bg-white" style={{ color: C.brand, border: `1px solid ${C.brandBg2}` }}>알림톡 발송</button>
                <button onClick={() => showToast('success', `${selIds.length}명 — 세대·구역 이동은 각 교인 상세의 세대에서 처리합니다.`)} className="text-[12.5px] font-bold rounded-[8px] px-3 py-1.5 bg-white" style={{ color: C.brand, border: `1px solid ${C.brandBg2}` }}>구역 이동</button>
                <button onClick={() => window.print()} className="text-[12.5px] font-bold rounded-[8px] px-3 py-1.5 bg-white" style={{ color: C.brand, border: `1px solid ${C.brandBg2}` }}>교인카드 인쇄</button>
                <button onClick={clearSel} className="text-[12.5px] font-bold rounded-[8px] px-2.5 py-1.5" style={{ color: C.faint }}>선택 해제</button>
              </div>
            </div>
          )}

          {/* 표 / 사진 */}
          {membersQ.isLoading ? <div className="bg-white rounded-[12px] p-10 text-center text-sm" style={{ border: `1px solid ${C.border}`, color: C.faint }}>불러오는 중…</div>
            : items.length === 0 ? <div className="bg-white rounded-[12px]" style={{ border: `1px solid ${C.border}` }}><EmptyState icon="🧑‍🤝‍🧑" title="교인이 없습니다" description="'교인 등록'으로 첫 교인을 추가하세요." actionLabel="교인 등록" onAction={openCreate} /></div>
            : viewMode === 'photo' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((m) => (
                  <button key={m.id} onClick={() => { setPreviewId(m.id); openDetail(m.id); }} className="bg-white rounded-[12px] p-4 flex flex-col items-center gap-2 text-center hover:border-[#1466d6]" style={{ border: `1px solid ${C.border}` }}>
                    <Avatar name={m.name} url={m.photoUrl} size={56} font={18} />
                    <div><b className="text-[14px] block">{m.name}</b><span className="text-[11.5px]" style={{ color: C.faint }}>{[m.position, m.householdRegion].filter(Boolean).join(' · ') || yearOf(m.birthDate)}</span></div>
                    <Badge status={m.regStatus} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 760 }}>
                    <Row head />
                    {items.map((m) => (
                      <Row key={m.id} m={m} selected={!!sel[m.id]} preview={previewId === m.id}
                        onToggle={() => toggleSel(m.id)} onPreview={() => setPreviewId(m.id)} onOpen={() => openDetail(m.id)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

          <div className="flex items-center gap-2 mt-3.5 text-[12.5px]" style={{ color: C.muted }}>
            <span className="font-bold text-white rounded-[7px] flex items-center justify-center" style={{ width: 28, height: 28, background: C.brand }}>1</span>
            <span className="ml-2">총 {total.toLocaleString()}명 · 200개씩 보기</span>
          </div>
        </div>

        {/* 우: 미리보기 */}
        <div className="hidden xl:block">
          <div className="bg-white rounded-[14px] p-[22px] sticky top-4" style={{ border: `1px solid ${C.border}` }}>
            {!pv ? <p className="text-[13px] text-center py-8" style={{ color: C.faint }}>교인을 선택하면 요약이 표시됩니다.</p> : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={pv.name} url={pv.photoUrl} size={56} font={18} />
                  <div><b className="text-[17px] block">{pv.name}</b><span className="text-[12.5px]" style={{ color: C.muted }}>{[pv.position, pv.householdRegion, GENDER_LABEL[pv.gender], yearOf(pv.birthDate)].filter(Boolean).join(' · ')}</span></div>
                </div>
                <div className="flex gap-2 mb-5">
                  <button onClick={() => openDetail(pv.id)} className="flex-1 text-center text-[13px] font-bold text-white py-2.5 rounded-[9px]" style={{ background: C.brand }}>상세 보기</button>
                  {pv.phone && <a href={`sms:${pv.phone}`} className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[9px]" style={{ color: C.text, border: `1px solid ${C.border2}` }}>문자</a>}
                </div>
                <div className="flex flex-col gap-2.5 text-[13px] pb-[18px] mb-[18px]" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <PvRow label="연락처" value={pv.phone || '—'} />
                  <PvRow label="주소" value={pv.address || '—'} />
                  <PvRow label="등록일" value={ymd(pv.registeredOn) || '—'} />
                  <PvRow label="신급" value={pv.faithLevel || '—'} />
                  <PvRow label="세대" value={pv.householdName || '—'} />
                </div>
                <b className="text-[13px] block mb-2.5">가족{pv.householdName ? ` (${pv.householdName})` : ''}</b>
                {(pv.relations ?? []).length === 0 ? <p className="text-[12.5px]" style={{ color: C.faint }}>등록된 가족이 없습니다.</p> : (
                  <div className="flex flex-col gap-2">
                    {(pv.relations ?? []).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2.5 text-[13px]"><Avatar name={r.toMemberName} url={r.toMemberPhoto} size={26} font={10} /><span className="font-bold">{r.toMemberName}</span><span style={{ color: C.faint }}>{REL_LABEL[r.relationType] ?? r.relationType}</span></div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {([['재적', s.active ?? s.total, C.ok], ['새가족', s.newcomer, C.warn], ['세대', s.households, C.ink], ['이번달 생일', s.birthdaysThisMonth, C.brand]] as const).map(([label, val, col]) => (
            <div key={label} className="bg-white rounded-[14px] p-4 text-center" style={{ border: `1px solid ${C.border}` }}>
              <div className="text-2xl font-extrabold" style={{ color: col }}>{Number(val ?? 0).toLocaleString()}</div>
              <div className="text-xs mt-1" style={{ color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 명부 표 한 행 (헤더 겸용) ──
const GRID = { display: 'grid', gridTemplateColumns: '34px minmax(0,1.5fr) 74px 74px 88px minmax(0,1fr) 116px 76px', gap: 10 } as const;
function Row({ head, m, selected, preview, onToggle, onPreview, onOpen }: {
  head?: boolean; m?: Member; selected?: boolean; preview?: boolean;
  onToggle?: () => void; onPreview?: () => void; onOpen?: () => void;
}) {
  if (head) {
    return (
      <div style={{ ...GRID, padding: '10px 14px', background: C.surface2, borderBottom: `1px solid ${C.line}` }} className="text-[11.5px] font-extrabold" >
        <span />{['이름', '직분', '신급', '구역', '세대', '연락처', '상태'].map((h) => <span key={h} style={{ color: C.faint }}>{h}</span>)}
      </div>
    );
  }
  if (!m) return null;
  return (
    <div style={{ ...GRID, padding: '11px 14px', borderBottom: `1px solid ${C.line2}`, alignItems: 'center', background: preview ? C.rowSel : '#fff' }}
      className="text-[13px] cursor-pointer" onClick={onPreview}>
      <button onClick={(e) => { e.stopPropagation(); onToggle?.(); }} aria-label="선택" className="rounded-[4px]" style={{ width: 16, height: 16, background: selected ? C.brand : '#fff', border: selected ? 'none' : `1px solid #cdd3de` }} />
      <button onClick={(e) => { e.stopPropagation(); onOpen?.(); }} className="flex items-center gap-2.5 min-w-0 text-left">
        <Avatar name={m.name} url={m.photoUrl} size={30} />
        <span className="min-w-0"><b className="block font-bold truncate hover:text-[#1466d6]">{m.name}</b><span className="text-[11px]" style={{ color: C.faint }}>{[yearOf(m.birthDate), GENDER_LABEL[m.gender], m.isHead && '세대주'].filter(Boolean).join(' · ')}</span></span>
      </button>
      <span style={{ color: m.position ? C.text : C.faintest }} className="truncate">{m.position || '—'}</span>
      <span style={{ color: m.faithLevel ? C.text : C.faintest }} className="truncate">{m.faithLevel || '—'}</span>
      <span style={{ color: m.householdRegion ? C.text : C.faintest }} className="truncate">{m.householdRegion || '—'}</span>
      <span style={{ color: C.muted }} className="truncate">{m.householdName || '—'}</span>
      <span style={{ color: m.phone ? C.muted : C.faintest }} className="truncate">{m.phone || '—'}</span>
      <span><Badge status={m.regStatus} /></span>
    </div>
  );
}

// ── 상세 카드 패널 / 필드 ──
function Panel({ title, children, max }: { title: string; children: React.ReactNode; max?: boolean }) {
  return (
    <div className={`bg-white rounded-[14px] ${max ? 'max-w-[900px]' : ''}`} style={{ border: `1px solid ${C.border}`, padding: '20px 24px' }}>
      <b className="text-[14.5px] block mb-4">{title}</b>
      {children}
    </div>
  );
}
function Field({ label, value, span, ellipsis, muted }: { label: string; value: string; span?: boolean; ellipsis?: boolean; muted?: boolean }) {
  return (
    <div className={`flex gap-3 ${span ? 'sm:col-span-2' : ''}`}>
      <span className="shrink-0" style={{ flexBasis: 78, color: C.faint }}>{label}</span>
      <span className={ellipsis ? 'min-w-0 truncate' : ''} style={muted ? { color: C.muted } : undefined}>{value}</span>
    </div>
  );
}
function PvRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2.5"><span className="shrink-0" style={{ flexBasis: 62, color: C.faint }}>{label}</span><span className="flex-1">{value}</span></div>;
}
// 등록 폼 라벨 래퍼.
function Lbl({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-bold mb-1.5">{label}{req && <span style={{ color: C.danger }}> *</span>}</span>
      {children}
    </label>
  );
}
