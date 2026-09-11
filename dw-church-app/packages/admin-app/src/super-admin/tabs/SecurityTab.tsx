import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminApi } from '../shared/use-admin-api';

/**
 * 보안 이벤트 모니터링 — 접근 위반 감사 로그(security_events) 조회.
 * 크로스 테넌트 접근, 슈퍼어드민 접근 거부, 중앙 로그인 일반회원 거부, 테넌트 전환 거부.
 * GET /api/v1/admin/security-events (슈퍼어드민 전용).
 */
interface SecurityEvent {
  id: string;
  createdAt: string;
  eventType: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  actorTenantSlug: string | null;
  targetTenantSlug: string | null;
  targetPath: string | null;
  ip: string | null;
  userAgent: string | null;
  detail: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  cross_tenant_access: '다른 테넌트 접근',
  super_admin_denied: '슈퍼어드민 접근 거부',
  central_login_denied: '중앙 로그인 거부(일반회원)',
  switch_tenant_denied: '테넌트 전환 거부',
};
const TYPE_TONE: Record<string, string> = {
  cross_tenant_access: 'bg-red-50 text-red-700',
  super_admin_denied: 'bg-orange-50 text-orange-700',
  central_login_denied: 'bg-amber-50 text-amber-700',
  switch_tenant_denied: 'bg-purple-50 text-purple-700',
};
const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'cross_tenant_access', label: '다른 테넌트' },
  { id: 'super_admin_denied', label: '슈퍼어드민' },
  { id: 'central_login_denied', label: '중앙 로그인' },
  { id: 'switch_tenant_denied', label: '테넌트 전환' },
];

const fmt = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(+d) ? s : d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// 상세 패널의 한 필드(라벨 + 값). wide=두 칼럼 폭, mono=고정폭+줄바꿈(경로·UA·ID).
function Detail({ label, value, mono, wide }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`mt-0.5 text-gray-800 ${mono ? 'break-all font-mono text-[12px]' : ''}`}>{value}</dd>
    </div>
  );
}

export default function SecurityTab() {
  const apiFetch = useAdminApi();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // useAdminApi 는 서버 응답 봉투 {data:[...]} 를 언랩하지 않고 그대로 준다.
      const res = await apiFetch<{ data?: SecurityEvent[] } | SecurityEvent[]>('/security-events?limit=200');
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setEvents(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.eventType === filter)),
    [events, filter],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">보안 이벤트</h2>
          <p className="mt-1 text-sm text-gray-500">권한 없는 접근 시도(다른 테넌트·슈퍼어드민·중앙 로그인·테넌트 전환)의 감사 로그입니다.</p>
        </div>
        <button onClick={() => void load()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">새로고침</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id} onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === f.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {loading && <div className="py-10 text-center text-sm text-gray-400">불러오는 중…</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && shown.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-400">기록된 보안 이벤트가 없습니다.</div>
      )}

      {!loading && !error && shown.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-2 py-3 font-medium" aria-label="펼치기" />
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">유형</th>
                <th className="px-4 py-3 font-medium">행위자</th>
                <th className="px-4 py-3 font-medium">소속</th>
                <th className="px-4 py-3 font-medium">대상 테넌트</th>
                <th className="px-4 py-3 font-medium">경로</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const open = expandedId === e.id;
                return (
                  <Fragment key={e.id}>
                    <tr
                      onClick={() => setExpandedId(open ? null : e.id)}
                      className={`cursor-pointer border-b border-gray-50 align-top hover:bg-gray-50 ${open ? 'bg-gray-50' : ''}`}
                    >
                      <td className="px-2 py-3 text-gray-400">{open ? '▾' : '▸'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600 tabular-nums">{fmt(e.createdAt)}</td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${TYPE_TONE[e.eventType] ?? 'bg-gray-100 text-gray-600'}`}>{TYPE_LABEL[e.eventType] ?? e.eventType}</span></td>
                      <td className="px-4 py-3 text-gray-800">{e.actorEmail || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{e.actorRole || '—'}{e.actorTenantSlug ? ` · ${e.actorTenantSlug}` : ''}</td>
                      <td className="px-4 py-3 text-gray-600">{e.targetTenantSlug || '—'}</td>
                      <td className="px-4 py-3 text-gray-500"><span className="break-all">{e.targetPath || '—'}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">{e.ip || '—'}</td>
                    </tr>
                    {open && (
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <td />
                        <td colSpan={7} className="px-4 py-4">
                          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
                            <Detail label="발생 시각" value={new Date(e.createdAt).toLocaleString('ko-KR')} />
                            <Detail label="유형" value={`${TYPE_LABEL[e.eventType] ?? e.eventType} (${e.eventType})`} />
                            <Detail label="행위자" value={e.actorEmail || '—'} />
                            <Detail label="행위자 역할 · 소속" value={`${e.actorRole || '—'}${e.actorTenantSlug ? ` · ${e.actorTenantSlug}` : ''}`} />
                            <Detail label="행위자 ID" value={e.actorUserId || '—'} mono />
                            <Detail label="대상 테넌트" value={e.targetTenantSlug || '—'} />
                            <Detail label="대상 경로" value={e.targetPath || '—'} mono wide />
                            <Detail label="IP" value={e.ip || '—'} mono />
                            <Detail label="User-Agent" value={e.userAgent || '—'} wide />
                            <Detail label="상세" value={e.detail || '—'} wide />
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
