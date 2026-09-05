import { useQuery } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';

/**
 * 교적관리 — 교적 현황(MB-01) + 통계 리포트(ST-01). 재적·출석·새가족·생일 카드와
 * 성별·연령·직분·구역 분포, 최근 출석 추이. 교회 행정 애드온('membership').
 */
type Dist = { n: number; [k: string]: any };

function Bars({ title, rows, labelKey }: { title: string; rows: Dist[]; labelKey: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-gray-400">데이터가 없습니다.</p> : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 text-gray-600 truncate">{r[labelKey]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-gray-500 tabular-nums">{r.n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemberDashboard() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;

  const statsQ = useQuery({ queryKey: ['member-stats'], queryFn: async () => (await api.get<{ data: any }>('/api/v1/members/stats') as any).data });
  const reportQ = useQuery({ queryKey: ['member-report'], queryFn: async () => (await api.get<{ data: any }>('/api/v1/member-stats/report') as any).data });

  const s = statsQ.data;
  const r = reportQ.data;
  const att = (r?.attendanceRecent ?? []) as { week: string; present: number }[];
  const attMax = Math.max(1, ...att.map((a) => a.present));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">교적 현황</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['재적', s?.total, 'text-gray-900'], ['정착', s?.active, 'text-green-600'], ['새가족', s?.newcomer, 'text-amber-600'], ['세대', s?.households, 'text-blue-600'], ['이번달 생일', s?.birthdaysThisMonth, 'text-pink-600']].map(([label, val, cls]) => (
          <div key={label as string} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${cls}`}>{Number(val ?? 0).toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">최근 8주 출석 추이</h3>
        {att.length === 0 ? <p className="text-sm text-gray-400">출석 기록이 아직 없습니다.</p> : (
          <div className="flex items-end gap-2 h-40">
            {att.map((a, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <span className="text-xs text-gray-500 tabular-nums">{a.present}</span>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(a.present / attMax) * 100}%`, minHeight: 2 }} />
                <span className="text-[10px] text-gray-400">{a.week}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Bars title="연령 분포" rows={(r?.age ?? []) as Dist[]} labelKey="bucket" />
        <Bars title="성별" rows={(r?.gender ?? []) as Dist[]} labelKey="gender" />
        <Bars title="직분" rows={(r?.position ?? []) as Dist[]} labelKey="position" />
        <Bars title="구역" rows={(r?.region ?? []) as Dist[]} labelKey="region" />
      </div>
    </div>
  );
}
