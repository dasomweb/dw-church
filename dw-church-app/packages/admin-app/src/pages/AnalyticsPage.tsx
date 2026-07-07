import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

/**
 * 방문 통계 (Website usage report) — mounted in BOTH the tenant admin
 * (/t/:slug/analytics) and the super-admin console (/super-admin/t/:slug/analytics).
 * It reads :slug from the URL and sends X-Tenant-Slug itself, so the same page
 * scopes correctly in either context (the server rebinds a mismatched slug to
 * the church admin's own tenant; a super_admin may view any tenant).
 *
 * Charts are dependency-free inline SVG / CSS bars — no charting library.
 */

interface Summary {
  range: string;
  days: number;
  totals: { pageviews: number; visitors: number; sessions: number; activeNow: number };
  deltas: { pageviews: number | null; visitors: number | null; sessions: number | null };
  daily: { day: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  referrers: { host: string; views: number }[];
  devices: { device: string; views: number }[];
}

const RANGES: { id: string; label: string }[] = [
  { id: '7d', label: '최근 7일' },
  { id: '30d', label: '최근 30일' },
  { id: '90d', label: '최근 90일' },
];

const DEVICE_LABEL: Record<string, string> = {
  mobile: '모바일', desktop: '데스크톱', tablet: '태블릿', unknown: '기타',
};

function useApiBase(): string {
  return useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host.startsWith('admin.')) return `https://api.${host.replace('admin.', '')}`;
    return (import.meta.env.VITE_API_BASE_URL as string) || '';
  }, []);
}

export default function AnalyticsPage() {
  const { slug } = useParams<{ slug: string }>();
  const session = useAuthStore((s) => s.session);
  const baseUrl = useApiBase();

  const [range, setRange] = useState('30d');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/v1/analytics/summary?range=${range}`, {
        headers: { Authorization: `Bearer ${session.accessToken}`, 'X-Tenant-Slug': slug },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { data?: Summary };
      setData(body.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [slug, session?.accessToken, baseUrl, range]);

  useEffect(() => { void load(); }, [load]);

  const totalViews = data?.totals.pageviews ?? 0;

  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">방문 통계</h1>
          <p className="text-sm text-gray-500">웹사이트 방문자·조회수 등 사용 현황을 확인합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            title="새로고침"
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          통계를 불러오지 못했습니다. ({error})
        </div>
      )}

      {loading && !data ? (
        <div className="py-24 text-center text-gray-400">불러오는 중…</div>
      ) : !data ? null : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="총 조회수" value={data.totals.pageviews} delta={data.deltas.pageviews} accent="#4f46e5" />
            <MetricCard label="순 방문자" value={data.totals.visitors} delta={data.deltas.visitors} accent="#0891b2" />
            <MetricCard label="세션" value={data.totals.sessions} delta={data.deltas.sessions} accent="#7c3aed" />
            <MetricCard label="지금 활동 중" value={data.totals.activeNow} live accent="#16a34a" />
          </div>

          {/* Trend chart */}
          <Panel title="일별 추이" subtitle="조회수(면적) · 순 방문자(선)">
            {totalViews === 0 ? (
              <EmptyChart />
            ) : (
              <TrendChart daily={data.daily} />
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top pages */}
            <Panel title="인기 페이지">
              <BarList
                items={data.topPages.map((p) => ({ label: p.path === '/' ? '홈' : p.path, value: p.views }))}
                emptyText="아직 방문 데이터가 없습니다."
                color="#4f46e5"
              />
            </Panel>

            <div className="space-y-4">
              {/* Referrers */}
              <Panel title="유입 경로">
                <BarList
                  items={data.referrers.map((r) => ({ label: r.host, value: r.views }))}
                  emptyText="외부 유입 기록이 없습니다. (직접 방문/북마크)"
                  color="#0891b2"
                />
              </Panel>
              {/* Devices */}
              <Panel title="기기">
                <BarList
                  items={data.devices.map((d) => ({ label: DEVICE_LABEL[d.device] ?? d.device, value: d.views }))}
                  emptyText="데이터 없음"
                  color="#7c3aed"
                />
              </Panel>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            방문 데이터는 봇/미리보기를 제외한 실제 방문 기준입니다. 집계는 미 동부 시간(ET) 하루 단위입니다.
          </p>
        </>
      )}
    </div>
  );
}

// ─── metric card ────────────────────────────────────────────
function MetricCard({ label, value, delta, live, accent }: {
  label: string; value: number; delta?: number | null; live?: boolean; accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {live && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: accent }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accent }} /></span>}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900" style={{ color: accent }}>
        {value.toLocaleString('ko-KR')}
      </div>
      {delta === undefined || delta === null ? (
        <div className="mt-0.5 text-[11px] text-gray-400">{live ? '최근 5분' : '이전 기간 대비 —'}</div>
      ) : (
        <div className={`mt-0.5 text-[11px] font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% <span className="text-gray-400">이전 기간 대비</span>
        </div>
      )}
    </div>
  );
}

// ─── panel wrapper ──────────────────────────────────────────
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">아직 방문 데이터가 없습니다.</div>;
}

// ─── trend chart (inline SVG area + line) ───────────────────
function TrendChart({ daily }: { daily: { day: string; views: number; visitors: number }[] }) {
  const W = 720, H = 200, PAD_L = 8, PAD_R = 8, PAD_T = 12, PAD_B = 22;
  const n = daily.length;
  const max = Math.max(1, ...daily.map((d) => d.views));
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD_T + innerH - (v / max) * innerH;

  const viewsLine = daily.map((d, i) => `${x(i)},${y(d.views)}`).join(' ');
  const visitorsLine = daily.map((d, i) => `${x(i)},${y(d.visitors)}`).join(' ');
  const baseY = PAD_T + innerH;
  const areaPath =
    `M ${x(0)},${baseY} ` +
    daily.map((d, i) => `L ${x(i)},${y(d.views)}`).join(' ') +
    ` L ${x(n - 1)},${baseY} Z`;

  // Sparse x-axis labels (first, middle, last) to avoid clutter.
  const labelIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
  const fmt = (day: string) => { const [, m, d] = day.split('-'); return `${Number(m)}/${Number(d)}`; };

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} preserveAspectRatio="none">
        {/* horizontal gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH - f * innerH} y2={PAD_T + innerH - f * innerH} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="#4f46e5" fillOpacity={0.12} />
        <polyline points={viewsLine} fill="none" stroke="#4f46e5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={visitorsLine} fill="none" stroke="#0891b2" strokeWidth={2} strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={11} fill="#94a3b8">
            {fmt(daily[i]!.day)}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-end gap-4 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: '#4f46e5' }} /> 조회수</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-0 w-3 border-t-2 border-dashed" style={{ borderColor: '#0891b2' }} /> 순 방문자</span>
      </div>
    </div>
  );
}

// ─── horizontal bar list ────────────────────────────────────
function BarList({ items, emptyText, color }: { items: { label: string; value: number }[]; emptyText: string; color: string }) {
  if (items.length === 0) return <div className="py-8 text-center text-xs text-gray-400">{emptyText}</div>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((it, idx) => (
        <li key={idx}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-gray-700" title={it.label}>{it.label}</span>
            <span className="shrink-0 font-medium text-gray-900">{it.value.toLocaleString('ko-KR')}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
