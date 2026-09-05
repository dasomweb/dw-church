import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { inputClass, textareaClass, ImageUpload, useToast, EmptyState } from '../components';

/**
 * 교적관리 — 교인 명부(MB-02) · 등록/수정(MB-04) · 상세(MB-03, 요약).
 * 교회 행정 애드온('membership'). 서버 API(/members, /households, /member-codes)를
 * apiClient.adapter 로 직접 호출한다(전용 타입 훅 없이). 응답은 camelCase 로 변환됨.
 */

type Member = Record<string, any>;
type Household = Record<string, any>;
type Code = { id: string; category: string; label: string };

const STATUS_LABEL: Record<string, string> = {
  active: '정착', newcomer: '새가족', inactive: '장기결석', transferred: '전출', deceased: '별세',
};
const STATUS_ORDER = ['active', 'newcomer', 'inactive', 'transferred', 'deceased'] as const;

const emptyForm = {
  name: '', nameHanja: '', nameEn: '', gender: '', birthDate: '', birthLunar: false,
  phone: '', email: '', address: '', position: '', faithLevel: '', regStatus: 'active',
  registeredOn: '', occupation: '', householdId: '', isHead: false, photoUrl: '', note: '',
};
type Form = typeof emptyForm;

export default function MemberManagement() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'active' | 'newcomer' | 'all'>('active');
  const [position, setPosition] = useState('');

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ── queries ──
  const codesQ = useQuery({
    queryKey: ['member-codes'],
    queryFn: async () => {
      const res = await api.get<{ data: Code[] }>('/api/v1/member-codes');
      return (res as any).data as Code[];
    },
  });
  const codesBy = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of codesQ.data ?? []) (m[c.category] ??= []).push(c.label);
    return m;
  }, [codesQ.data]);

  const householdsQ = useQuery({
    queryKey: ['households-select'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Household[] } }>('/api/v1/households', { perPage: 200 });
      return ((res as any).data.items ?? []) as Household[];
    },
  });

  const membersQ = useQuery({
    queryKey: ['members', q, status, position],
    queryFn: async () => {
      const params: Record<string, unknown> = { regStatus: status, perPage: 200 };
      if (q.trim()) params.q = q.trim();
      if (position) params.position = position;
      const res = await api.get<{ data: { items: Member[]; total: number } }>('/api/v1/members', params);
      return (res as any).data as { items: Member[]; total: number };
    },
  });

  const statsQ = useQuery({
    queryKey: ['member-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: any }>('/api/v1/members/stats');
      return (res as any).data;
    },
  });

  const detailQ = useQuery({
    queryKey: ['member', detailId],
    enabled: !!detailId && view === 'detail',
    queryFn: async () => {
      const res = await api.get<{ data: Member }>(`/api/v1/members/${detailId}`);
      return (res as any).data as Member;
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['members'] });
    void qc.invalidateQueries({ queryKey: ['member-stats'] });
    void qc.invalidateQueries({ queryKey: ['households-select'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { ...form };
      // empty strings → omit/null so DATE/UUID columns don't choke
      for (const k of ['birthDate', 'registeredOn', 'householdId', 'gender'] as const) {
        if (!body[k]) delete body[k];
      }
      if (editingId) return api.put(`/api/v1/members/${editingId}`, body);
      return api.post('/api/v1/members', body);
    },
    onSuccess: () => {
      showToast('success', editingId ? '수정되었습니다.' : '교인을 등록했습니다.');
      invalidate();
      setView('list');
    },
    onError: (e: any) => showToast('error', e?.message || '저장 실패'),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setView('edit'); };
  const openEdit = (m: Member) => {
    setEditingId(m.id);
    setForm({
      name: m.name ?? '', nameHanja: m.nameHanja ?? '', nameEn: m.nameEn ?? '', gender: m.gender ?? '',
      birthDate: (m.birthDate ?? '').slice(0, 10), birthLunar: !!m.birthLunar,
      phone: m.phone ?? '', email: m.email ?? '', address: m.address ?? '',
      position: m.position ?? '', faithLevel: m.faithLevel ?? '', regStatus: m.regStatus ?? 'active',
      registeredOn: (m.registeredOn ?? '').slice(0, 10), occupation: m.occupation ?? '',
      householdId: m.householdId ?? '', isHead: !!m.isHead, photoUrl: m.photoUrl ?? '', note: m.note ?? '',
    });
    setView('edit');
  };
  const openDetail = (id: string) => { setDetailId(id); setView('detail'); };

  const remove = async (m: Member) => {
    if (!window.confirm(`${m.name} 교인을 삭제할까요?`)) return;
    try {
      await api.delete(`/api/v1/members/${m.id}`);
      showToast('success', '삭제되었습니다.');
      invalidate();
    } catch (e: any) { showToast('error', e?.message || '삭제 실패'); }
  };

  const uploadPhoto = async (file: File) => (await apiClient!.uploadFile(file, 'members')) as unknown as string;

  const positions = codesBy['position'] ?? [];
  const faithLevels = codesBy['faith_level'] ?? [];

  // ── DETAIL ──
  if (view === 'detail') {
    const m = detailQ.data;
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 명부로</button>
        {!m ? <div className="p-8 text-center text-gray-400 text-sm">불러오는 중…</div> : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-5">
              {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-24 h-24 rounded-xl object-cover" /> :
                <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-2xl text-gray-300">{(m.name || '·')[0]}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{m.name}</h2>
                  {m.position && <span className="text-xs font-medium bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{m.position}</span>}
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${m.regStatus === 'newcomer' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[m.regStatus] ?? m.regStatus}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-y-1 gap-x-6 max-w-lg">
                  <span>전화 · {m.phone || '—'}</span>
                  <span>신급 · {m.faithLevel || '—'}</span>
                  <span>생년 · {(m.birthDate || '—').slice(0, 10)}{m.birthLunar ? ' (음)' : ''}</span>
                  <span>세대 · {m.householdName || '—'}{m.householdRegion ? ` (${m.householdRegion})` : ''}</span>
                  <span className="col-span-2">주소 · {m.address || '—'}</span>
                </div>
              </div>
              <button onClick={() => openEdit(m)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">수정</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">가족</h3>
              {(m.relations ?? []).length === 0 ? <p className="text-sm text-gray-400">등록된 가족 관계가 없습니다.</p> : (
                <div className="flex flex-wrap gap-2">
                  {(m.relations ?? []).map((r: any) => (
                    <span key={r.id} className="inline-flex items-center gap-1.5 border border-gray-200 rounded-full pl-1 pr-3 py-1 text-sm">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs">{(r.toMemberName || '·')[0]}</span>
                      {r.toMemberName} <span className="text-gray-400 text-xs">{({ spouse: '배우자', child: '자녀', parent: '부모', sibling: '형제' } as any)[r.relationType] ?? r.relationType}</span>
                    </span>
                  ))}
                </div>
              )}
              {m.note && <><h3 className="text-sm font-semibold text-gray-700 mt-5 mb-2">비고</h3><p className="text-sm text-gray-600 whitespace-pre-wrap">{m.note}</p></>}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── EDIT/CREATE ──
  if (view === 'edit') {
    return (
      <div className="space-y-4 max-w-3xl">
        <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 명부로</button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold">{editingId ? '교인 수정' : '교인 등록'}</h2>

          <div>
            <label className="block text-sm font-medium mb-1">사진</label>
            <ImageUpload label="" value={form.photoUrl} onChange={(u) => set('photoUrl', u)} onUpload={uploadPhoto} aspectRatio="1/1" resize="block" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">이름 *</label><input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">한자</label><input className={inputClass} value={form.nameHanja} onChange={(e) => set('nameHanja', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">영문명</label><input className={inputClass} value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">성별</label>
              <select className={inputClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">선택</option><option value="M">남</option><option value="F">여</option>
              </select></div>
            <div><label className="block text-sm font-medium mb-1">생년월일</label><input type="date" className={inputClass} value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.birthLunar} onChange={(e) => set('birthLunar', e.target.checked)} className="rounded" /> 음력</label></div>
            <div><label className="block text-sm font-medium mb-1">직분</label>
              <select className={inputClass} value={form.position} onChange={(e) => set('position', e.target.value)}>
                <option value="">선택</option>{positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1">신급</label>
              <select className={inputClass} value={form.faithLevel} onChange={(e) => set('faithLevel', e.target.value)}>
                <option value="">선택</option>{faithLevels.map((p) => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1">등록상태</label>
              <select className={inputClass} value={form.regStatus} onChange={(e) => set('regStatus', e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1">전화</label><input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(201) 555-0000" /></div>
            <div><label className="block text-sm font-medium mb-1">이메일</label><input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">등록일</label><input type="date" className={inputClass} value={form.registeredOn} onChange={(e) => set('registeredOn', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">주소</label><input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-1">직업</label><input className={inputClass} value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">세대</label>
              <select className={inputClass} value={form.householdId} onChange={(e) => set('householdId', e.target.value)}>
                <option value="">세대 없음</option>
                {(householdsQ.data ?? []).map((h) => <option key={h.id} value={h.id}>{h.name || '(무제)'}{h.region ? ` · ${h.region}` : ''}</option>)}
              </select></div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isHead} onChange={(e) => set('isHead', e.target.checked)} className="rounded" /> 세대주</label></div>
          </div>

          <div><label className="block text-sm font-medium mb-1">비고</label><textarea rows={3} className={textareaClass} value={form.note} onChange={(e) => set('note', e.target.value)} /></div>

          <div className="flex gap-2 pt-1">
            <button
              disabled={saving || saveMutation.isPending || !form.name.trim()}
              onClick={() => { if (!form.name.trim()) { showToast('error', '이름을 입력하세요.'); return; } setSaving(true); saveMutation.mutate(undefined, { onSettled: () => setSaving(false) }); }}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >{saveMutation.isPending ? '저장 중…' : '저장'}</button>
            <button onClick={() => setView('list')} className="px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">취소</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST ──
  const items = membersQ.data?.items ?? [];
  const s = statsQ.data;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">교인 명부</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ 교인 등록</button>
      </div>

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['재적', s.total, 'text-gray-900'], ['정착', s.active, 'text-green-600'], ['새가족', s.newcomer, 'text-amber-600'], ['이번달 생일', s.birthdaysThisMonth, 'text-blue-600']].map(([label, val, cls]) => (
            <div key={label as string} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`text-2xl font-bold ${cls}`}>{Number(val ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input className={`${inputClass} sm:flex-1`} placeholder="이름 · 전화 · 이메일 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`${inputClass} sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="active">정착</option><option value="newcomer">새가족</option><option value="all">전체 상태</option>
          </select>
          <select className={`${inputClass} sm:w-40`} value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">전체 직분</option>{positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {membersQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div> :
          items.length === 0 ? <EmptyState icon="🧑‍🤝‍🧑" title="교인이 없습니다" description="'교인 등록'으로 첫 교인을 추가하세요." actionLabel="교인 등록" onAction={openCreate} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">이름</th><th className="px-4 py-3 font-medium">직분</th><th className="px-4 py-3 font-medium">신급</th><th className="px-4 py-3 font-medium">구역</th><th className="px-4 py-3 font-medium">전화</th><th className="px-4 py-3 font-medium">상태</th><th className="px-4 py-3 font-medium text-right">작업</th>
                </tr></thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(m.id)} className="flex items-center gap-2 font-medium text-gray-800 hover:text-blue-600">
                          {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" /> : <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{(m.name || '·')[0]}</span>}
                          {m.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.position || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.faithLevel || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.householdRegion || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.phone || '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium ${m.regStatus === 'newcomer' ? 'text-amber-600' : 'text-gray-500'}`}>{STATUS_LABEL[m.regStatus] ?? m.regStatus}</span></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(m)} className="text-xs text-gray-500 hover:text-gray-700 mr-3">수정</button>
                        <button onClick={() => remove(m)} className="text-xs text-red-500 hover:text-red-600">삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <p className="text-xs text-gray-400">총 {membersQ.data?.total ?? 0}명 {status !== 'all' && `(${status === 'active' ? '정착' : '새가족'})`}</p>
    </div>
  );
}
