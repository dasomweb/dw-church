import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';

/**
 * 모바일 간편 출석 (/t/:slug/checkin) — 사이드바 없는 전체화면 경량 페이지.
 * 권한 있는 사용자(로그인 + 교적 애드온)가 폰에서 주일예배·새가족 출석을 빠르게
 * 체크한다. 교회가 정의한 예배 항목(주일 1부, 새가족반 등)을 그대로 사용.
 */
type Svc = { id: string; name: string; weekday?: string; time?: string };
type Row = Record<string, any>;
const STEP: Record<string, { label: string; bg: string; fg: string }> = {
  present: { label: '출석', bg: '#16a34a', fg: '#fff' },
  online: { label: '온라인', bg: '#2563eb', fg: '#fff' },
  absent: { label: '결석', bg: '#e5e7eb', fg: '#6b7280' },
};
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MobileCheckin() {
  const { slug = '' } = useParams<{ slug: string }>();
  const apiClient = useDWChurchClient();
  if (slug) apiClient!.setTenantSlug(slug); // 사이드바 밖 라우트 — slug 헤더 직접 세팅
  const api = apiClient!.adapter;
  const qc = useQueryClient();

  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [newcomerOnly, setNewcomerOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [denied, setDenied] = useState(false);

  const servicesQ = useQuery({
    queryKey: ['ck-services', slug],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Svc[] }>('/api/v1/member-services');
        return (res as any).data as Svc[];
      } catch (e: any) { if (e?.status === 403) setDenied(true); throw e; }
    },
  });
  useEffect(() => { if (!serviceId && (servicesQ.data?.length ?? 0) > 0) setServiceId(servicesQ.data![0]!.id); }, [servicesQ.data, serviceId]);

  const sheetQ = useQuery({
    queryKey: ['ck-sheet', slug, serviceId, date],
    enabled: !!serviceId && !!date,
    queryFn: async () => {
      const res = await api.get<{ data: Row[] }>('/api/v1/attendance/sheet', { serviceId, date });
      return (res as any).data as Row[];
    },
  });
  useEffect(() => {
    if (sheetQ.data) {
      const m: Record<string, string> = {};
      for (const r of sheetQ.data) if (r.status) m[r.memberId] = r.status;
      setMarks(m);
    }
  }, [sheetQ.data]);

  const rows = useMemo(() => {
    let r = sheetQ.data ?? [];
    if (newcomerOnly) r = r.filter((x) => x.regStatus === 'newcomer' || x.reg_status === 'newcomer');
    if (search.trim()) { const q = search.trim(); r = r.filter((x) => String(x.name || '').includes(q)); }
    return r;
  }, [sheetQ.data, newcomerOnly, search]);

  const summary = useMemo(() => {
    let present = 0, online = 0;
    for (const r of (sheetQ.data ?? [])) { const s = marks[r.memberId]; if (s === 'present') present++; else if (s === 'online') online++; }
    return { present, online };
  }, [sheetQ.data, marks]);

  const cycle = (id: string) => setMarks((m) => {
    const order = ['present', 'online', 'absent'];
    return { ...m, [id]: order[(order.indexOf(m[id] || 'absent') + 1) % 3]! };
  });

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const save = async () => {
    if (!serviceId) return;
    setSaving(true);
    try {
      const entries = (sheetQ.data ?? []).map((r) => ({ memberId: r.memberId, status: marks[r.memberId] || 'absent' }));
      await api.post('/api/v1/attendance', { serviceId, date, entries });
      flash(`저장됨 · 출석 ${summary.present} · 온라인 ${summary.online}`);
      void qc.invalidateQueries({ queryKey: ['ck-sheet', slug, serviceId, date] });
    } catch (e: any) { flash(e?.status === 403 ? '권한이 없습니다.' : '저장 실패'); }
    finally { setSaving(false); }
  };

  if (denied) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'Noto Sans KR',system-ui,sans-serif", padding: 24, textAlign: 'center', color: '#61697a' }}>
      <div><div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>교적관리 애드온 권한이 필요합니다.<br />관리자에게 문의하세요.</div>
    </div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fa', fontFamily: "'Noto Sans KR','Pretendard',system-ui,sans-serif", color: '#16181d', paddingBottom: 88 }}>
      {/* top */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <b style={{ fontSize: 16 }}>출석 체크</b>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#61697a' }}>출석 <b style={{ color: '#16a34a' }}>{summary.present}</b> · 온라인 <b style={{ color: '#2563eb' }}>{summary.online}</b></span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={selStyle}>
            <option value="">예배 선택</option>
            {(servicesQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...selStyle, flex: '0 0 auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름 검색" style={{ ...selStyle, flex: 1 }} />
          <button onClick={() => setNewcomerOnly((v) => !v)} style={{ ...chipStyle, ...(newcomerOnly ? { background: '#1466d6', color: '#fff', borderColor: '#1466d6' } : {}) }}>새가족만</button>
        </div>
      </div>

      {/* list */}
      {!serviceId ? <P>예배와 날짜를 선택하세요.</P> :
        servicesQ.data?.length === 0 ? <P>등록된 예배가 없습니다. 관리자 &gt; 출석에서 예배를 추가하세요.</P> :
        sheetQ.isLoading ? <P>불러오는 중…</P> :
        rows.length === 0 ? <P>대상 교인이 없습니다.</P> : (
          <div>
            {rows.map((r) => {
              const st = marks[r.memberId] || 'absent';
              const meta = STEP[st]!;
              return (
                <button key={r.memberId} onClick={() => cycle(r.memberId)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', border: 'none', borderBottom: '1px solid #eef1f5', textAlign: 'left', cursor: 'pointer' }}>
                  {r.photoUrl ? <img src={r.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} /> :
                    <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#eef1f5', display: 'grid', placeItems: 'center', color: '#9aa7bd', fontSize: 15 }}>{(r.name || '·')[0]}</span>}
                  <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 16 }}>{r.name}</b>{r.position ? <span style={{ color: '#9aa7bd', fontSize: 13, marginLeft: 6 }}>{r.position}</span> : null}</span>
                  <span style={{ minWidth: 70, textAlign: 'center', padding: '10px 0', borderRadius: 10, fontSize: 15, fontWeight: 700, background: meta.bg, color: meta.fg }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}

      {/* save bar */}
      {serviceId && rows.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: 12 }}>
          <button onClick={() => void save()} disabled={saving}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#1466d6', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '저장 중…' : '출석 저장'}
          </button>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#16181d', color: '#fff', padding: '10px 18px', borderRadius: 999, fontSize: 14, zIndex: 20 }}>{toast}</div>}
    </div>
  );
}

const selStyle: React.CSSProperties = { border: '1px solid #d5dae2', borderRadius: 10, padding: '10px 12px', fontSize: 15, background: '#fff', color: '#16181d', minWidth: 0 };
const chipStyle: React.CSSProperties = { border: '1px solid #d5dae2', borderRadius: 999, padding: '0 16px', fontSize: 14, fontWeight: 700, background: '#fff', color: '#61697a', whiteSpace: 'nowrap', cursor: 'pointer' };
function P({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 40, textAlign: 'center', color: '#9aa7bd', fontSize: 14 }}>{children}</div>;
}
