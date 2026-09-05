import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDWChurchClient } from '@dw-church/api-client';
import { EmptyState } from '../components';

/**
 * RP-03 리포트 모니터링 — 주차 × 조직 격자 + 제출률. 교역자가 어느 조직이 리포트를
 * 안 냈는지 한눈에 본다. 셀 색: 제출·확인(초록) / 제출·미확인(파랑) / 작성중(주황) / 미제출(회색).
 */
type Grid = { weeks: { key: string; label: string }[]; rows: any[]; unsubmittedLatest: any[]; latestWeek: string };

const CELL: Record<string, { c: string; t: string }> = {
  confirmed: { c: 'bg-emerald-500', t: '제출·확인' },
  submitted: { c: 'bg-blue-500', t: '제출·미확인' },
  draft: { c: 'bg-amber-400', t: '작성중' },
  none: { c: 'bg-gray-200', t: '미제출' },
};

export default function ReportMonitoring() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const [weeks, setWeeks] = useState(8);

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: any }>('/api/v1/group-preset') as any).data });
  const gridQ = useQuery({
    queryKey: ['report-monitor', weeks],
    queryFn: async () => (await api.get<{ data: Grid }>(`/api/v1/meeting-reports/monitor?weeks=${weeks}`) as any).data as Grid,
  });

  const t = presetQ.data?.terminology ?? { org: '조직', report: '리포트' };
  const grid = gridQ.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{t.report ?? '리포트'} 모니터링</h1>
          <p className="text-sm text-gray-500 mt-1">주차별 제출 현황과 제출률입니다. 미제출 {t.org}을(를) 바로 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">기간</span>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5">
            <option value={4}>최근 4주</option><option value={8}>최근 8주</option><option value={13}>최근 13주(분기)</option>
          </select>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {Object.values(CELL).map((v) => <span key={v.t} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${v.c}`} />{v.t}</span>)}
      </div>

      {gridQ.isLoading ? <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>
        : !grid || grid.rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <EmptyState icon="📋" title="표시할 조직이 없습니다" description={`활성 ${t.org}을(를) 먼저 등록하세요.`} />
          </div>
        ) : (
          <>
            {grid.unsubmittedLatest.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <b>{grid.latestWeek}</b> 미제출 {grid.unsubmittedLatest.length}곳 · {grid.unsubmittedLatest.map((u) => u.name).join(', ')}
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left font-medium px-4 py-3 sticky left-0 bg-white">{t.org}</th>
                    {grid.weeks.map((w) => <th key={w.key} className="font-medium px-2 py-3 text-center whitespace-nowrap">{w.label}</th>)}
                    <th className="font-medium px-4 py-3 text-right">제출률</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((r) => (
                    <tr key={r.groupId} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5 sticky left-0 bg-white">
                        <span className="font-medium text-gray-800">{r.name}</span>
                        {r.leaderName && <span className="text-xs text-gray-400 ml-1.5">{r.leaderName}</span>}
                      </td>
                      {r.cells.map((c: string, i: number) => {
                        const cell = CELL[c] ?? { c: 'bg-gray-200', t: '미제출' };
                        return (
                          <td key={i} className="px-2 py-2.5 text-center">
                            <span className={`inline-block w-4 h-4 rounded-sm ${cell.c}`} title={cell.t} />
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={`font-semibold ${r.submittedRate >= 80 ? 'text-emerald-600' : r.submittedRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{r.submittedRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </div>
  );
}
