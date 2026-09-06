import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast, EmptyState } from '../components';

/**
 * RP-03 리포트 모니터링 — 화면 시안 그대로. 주차 × 조직 격자(채워진 셀) + 제출률 +
 * 미제출 요약 + CSV 내보내기 + 미제출 조직 공지. 데이터는 GET /meeting-reports/monitor.
 * 셀 색: 제출·확인(#1466d6) / 제출·미확인(#c8dcfa) / 지연(#fdf4e0) / 미제출(#f2f4f7).
 */
type Grid = { weeks: { key: string; label: string }[]; rows: any[]; unsubmittedLatest: any[]; latestWeek: string };
const CELL: Record<string, { bg: string; border?: string; t: string }> = {
  confirmed: { bg: '#1466d6', t: '제출·확인' },
  submitted: { bg: '#c8dcfa', t: '제출·미확인' },
  draft: { bg: '#fdf4e0', border: '1px solid #f3e0b0', t: '지연' },
  none: { bg: '#f2f4f7', t: '미제출' },
};

export default function ReportMonitoring() {
  const apiClient = useDWChurchClient();
  const api = apiClient!.adapter;
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const { showToast } = useToast();
  const [weeks, setWeeks] = useState(8);
  const [parentId, setParentId] = useState('');

  const presetQ = useQuery({ queryKey: ['group-preset'], queryFn: async () => (await api.get<{ data: any }>('/api/v1/group-preset') as any).data });
  const treeQ = useQuery({ queryKey: ['groups-tree'], queryFn: async () => (await api.get<{ data: any[] }>('/api/v1/groups/tree?status=active') as any).data as any[] });
  const gridQ = useQuery({
    queryKey: ['report-monitor', weeks, parentId],
    queryFn: async () => (await api.get<{ data: Grid }>(`/api/v1/meeting-reports/monitor?weeks=${weeks}${parentId ? `&parentId=${parentId}` : ''}`) as any).data as Grid,
  });

  const t = presetQ.data?.terminology ?? { org: '조직', report: '리포트' };
  const grid = gridQ.data;
  const tops = (treeQ.data ?? []).filter((g) => (g.children?.length ?? 0) > 0);

  const twoWeekMiss = useMemo(() => {
    if (!grid) return 0;
    return grid.rows.filter((r) => {
      const n = r.cells.length;
      return n >= 2 && ['none', 'draft'].includes(r.cells[n - 1]) && ['none', 'draft'].includes(r.cells[n - 2]);
    }).length;
  }, [grid]);

  const exportCsv = () => {
    if (!grid) return;
    const header = [t.org, '리더', ...grid.weeks.map((w) => w.label), '제출률(%)'];
    const rows = grid.rows.map((r) => [r.name, r.leaderName, ...r.cells.map((c: string) => (CELL[c] ?? { t: '미제출' }).t), r.submittedRate]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `리포트_모니터링_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="text-[#16181d]">
      {/* 필터 + 범례 */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-[17px] font-bold">{t.report ?? '리포트'} 모니터링</h1>
          <p className="text-[12.5px] text-[#61697a] mt-0.5">주차 × {t.org} 제출 현황입니다.</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="text-[12.5px] font-semibold bg-white border border-[#dfe3ea] text-[#61697a] rounded-full px-3.5 py-2">
            <option value="">전체 연합</option>
            {tops.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="text-[12.5px] font-semibold bg-white border border-[#dfe3ea] text-[#61697a] rounded-full px-3.5 py-2">
            <option value={4}>최근 4주</option><option value={8}>최근 8주</option><option value={13}>최근 13주(분기)</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-3.5 text-[12px] text-[#61697a]">
          {Object.values(CELL).map((v) => <span key={v.t} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: v.bg, border: v.border }} />{v.t}</span>)}
        </div>
      </div>

      {gridQ.isLoading ? <div className="p-8 text-center text-sm text-[#8b93a3]">불러오는 중…</div>
        : !grid || grid.rows.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-[14px]"><EmptyState icon="📋" title={`표시할 ${t.org}이(가) 없습니다`} description={`활성 ${t.org}과 리포트가 있어야 격자가 채워집니다.`} /></div>
        ) : (
          <>
            <div className="bg-white border border-[#e5e7eb] rounded-[14px] overflow-x-auto">
              <div style={{ gridTemplateColumns: `minmax(160px,1.6fr) repeat(${grid.weeks.length},minmax(34px,1fr)) 96px` }}
                className="grid gap-2 px-5 py-3 bg-[#fafbfc] border-b border-[#eef0f4] text-[11.5px] font-extrabold text-[#8b93a3] min-w-[720px]">
                <span>{t.org}</span>
                {grid.weeks.map((w) => <span key={w.key} className="text-center">{w.label}</span>)}
                <span className="text-right">제출률</span>
              </div>
              {grid.rows.map((r) => {
                const last = r.cells[r.cells.length - 1];
                const issue = last === 'none' || last === 'draft';
                return (
                  <div key={r.groupId}
                    style={{ gridTemplateColumns: `minmax(160px,1.6fr) repeat(${grid.weeks.length},minmax(34px,1fr)) 96px`, background: issue ? '#fffdf7' : undefined }}
                    className="grid gap-2 px-5 py-[11px] border-b border-[#f2f4f7] last:border-0 text-[13px] items-center min-w-[720px]">
                    <div className="truncate"><b className="font-bold">{r.name}</b> {r.leaderName && <span className="text-[#8b93a3] text-[11.5px]">{r.leaderName}</span>}</div>
                    {r.cells.map((c: string, i: number) => {
                      const cell = CELL[c] ?? { bg: '#f2f4f7', border: undefined as string | undefined, t: '미제출' };
                      return <span key={i} className="h-6 rounded-md" style={{ background: cell.bg, border: cell.border }} title={cell.t} />;
                    })}
                    <span className={`text-right font-bold ${r.submittedRate < 60 ? 'text-[#dc2626] font-extrabold' : ''}`}>{r.submittedRate}%</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3.5 mt-4 flex-wrap">
              <span className="text-[13px] text-[#61697a]">
                {grid.latestWeek} 미제출 <b className="font-extrabold text-[#16181d]">{grid.unsubmittedLatest.length}곳</b>
                {twoWeekMiss > 0 && <> · 2주 연속 <b className="font-extrabold text-[#dc2626]">{twoWeekMiss}곳</b></>}
              </span>
              <div className="ml-auto flex gap-2.5">
                <button onClick={exportCsv} className="text-[13px] font-bold text-[#3c4353] border border-[#dfe3ea] bg-white rounded-[9px] px-4 py-2.5 hover:bg-[#f7f8fa]">CSV 내보내기</button>
                <button onClick={() => { if (grid.unsubmittedLatest.length === 0) { showToast('success', '미제출 조직이 없습니다.'); return; } navigate(`/t/${slug}/group-notices`); }}
                  className="text-[13.5px] font-bold bg-[#1466d6] text-white rounded-[9px] px-[18px] py-2.5 hover:bg-[#0f4fa8]">미제출 {t.org} 공지</button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
