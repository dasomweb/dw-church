import { prisma } from '../../config/database.js';
import { monitoringGrid } from './reports-service.js';

/**
 * GR-01 소그룹 현황 대시보드 집계. 화면 시안 그대로의 카드/표를 채우는 실제 데이터
 * (더미 아님): 운영 조직 수·연합별 현황·이번 주 리포트 제출·배치 대기·모임 참석률·
 * 분가 검토 대상·리포트 미제출·돌봄 요청. 조직 트리(리프=리포트 작성 단위) 기준.
 */
export async function dashboardStats(schema: string) {
  const groups = await prisma.$queryRawUnsafe<any[]>(
    `SELECT g.id, g.name, g.parent_id, g.level, lm.name AS leader_name,
            (SELECT COUNT(*)::int FROM "${schema}".group_members gm WHERE gm.group_id = g.id AND gm.end_date IS NULL) AS member_count
     FROM "${schema}".groups g LEFT JOIN "${schema}".members lm ON lm.id = g.leader_member_id
     WHERE g.status = 'active' ORDER BY g.sort_order, g.name`,
  );
  const parentIds = new Set(groups.filter((g) => g.parent_id).map((g) => g.parent_id));
  const leaves = groups.filter((g) => !parentIds.has(g.id)); // 리포트 작성 단위(최하위)
  const tops = groups.filter((g) => !g.parent_id);           // 연합/교구(최상위)
  const byId = new Map(groups.map((g) => [g.id, g]));

  const operating = leaves.length;
  const totalMembers = leaves.reduce((s, g) => s + (g.member_count || 0), 0);
  const avgMembers = operating ? Math.round((totalMembers / operating) * 10) / 10 : 0;

  // 이번 주 리포트 제출 (최근 1주 격자).
  const mon = await monitoringGrid(schema, { weeks: 1 });
  const lastIdx = (mon.weeks.length || 1) - 1;
  const isSubmitted = (r: any) => ['submitted', 'confirmed'].includes(r.cells[lastIdx]);
  const reportsSubmitted = mon.rows.filter(isSubmitted).length;
  const reportsTotal = mon.rows.length;

  // 배치 대기 (사유별).
  const q = await prisma.$queryRawUnsafe<any[]>(
    `SELECT source, COUNT(*)::int AS n FROM "${schema}".group_placement_queue WHERE status = 'waiting' GROUP BY source`,
  );
  const queueBy: Record<string, number> = {};
  let queueTotal = 0;
  for (const r of q) { queueBy[r.source] = r.n; queueTotal += r.n; }

  // 이번 주 모임 참석률 + 초신자 동반 (최근 7일 리포트).
  const recent = await prisma.$queryRawUnsafe<any[]>(
    `SELECT group_id, attendance_count, newcomer_count FROM "${schema}".meeting_reports
     WHERE meeting_date >= (CURRENT_DATE - INTERVAL '7 days')`,
  );
  let att = 0, rosterOfReported = 0, newcomers = 0;
  for (const r of recent) {
    att += r.attendance_count || 0;
    newcomers += r.newcomer_count || 0;
    rosterOfReported += byId.get(r.group_id)?.member_count || 0;
  }
  const attendanceRate = rosterOfReported ? Math.round((att / rosterOfReported) * 100) : 0;

  // 연합별 현황 — 최상위 조직마다 하위 리프 수·목원 합·리포트 제출.
  const submittedIds = new Set(mon.rows.filter(isSubmitted).map((r: any) => r.groupId));
  const totalIds = new Set(mon.rows.map((r: any) => r.groupId));
  const subtreeLeaves = (rootId: string) => {
    const out: any[] = [];
    const walk = (pid: string) => {
      for (const g of groups) if (g.parent_id === pid) { if (!parentIds.has(g.id)) out.push(g); walk(g.id); }
    };
    if (!parentIds.has(rootId)) out.push(byId.get(rootId));
    walk(rootId);
    return out.filter(Boolean);
  };
  const unions = tops.map((t) => {
    const ls = subtreeLeaves(t.id);
    const rep = ls.filter((g) => totalIds.has(g.id));
    return {
      id: t.id, name: t.name, leaderName: t.leader_name || '',
      groupCount: ls.length,
      memberCount: ls.reduce((s, g) => s + (g.member_count || 0), 0),
      reportSubmitted: rep.filter((g) => submittedIds.has(g.id)).length,
      reportTotal: rep.length,
    };
  });

  // 분가 검토 대상 — 권장 인원(14) 초과 리프.
  const RECOMMENDED = 14;
  const splitCandidates = leaves
    .filter((g) => (g.member_count || 0) > RECOMMENDED)
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    .slice(0, 6)
    .map((g) => ({ id: g.id, name: g.name, leaderName: g.leader_name || '', memberCount: g.member_count || 0 }));

  // 돌봄 요청 — 최근 리포트의 비공개 항목(care) 채워진 것.
  const careRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT r.group_id, g.name AS group_name, r.private_items, r.meeting_date
     FROM "${schema}".meeting_reports r JOIN "${schema}".groups g ON g.id = r.group_id
     WHERE r.private_items->>'care' IS NOT NULL AND r.private_items->>'care' <> ''
     ORDER BY r.meeting_date DESC LIMIT 6`,
  );
  const care = careRows.map((r) => ({ groupName: r.group_name, text: r.private_items?.care ?? '', date: r.meeting_date }));

  return {
    week: mon.latestWeek,
    stats: {
      operating, unions: tops.length, avgMembers,
      reportsSubmitted, reportsTotal,
      queueTotal, queueBy,
      attendanceRate, newcomers,
    },
    unions,
    splitCandidates,
    unsubmitted: mon.unsubmittedLatest,
    care,
  };
}
