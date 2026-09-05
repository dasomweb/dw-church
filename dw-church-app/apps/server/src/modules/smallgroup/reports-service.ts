import { prisma } from '../../config/database.js';
import type { UpsertReportInput, ConfirmReportInput, ListReportsQuery, MonitoringQuery } from './schema.js';

/**
 * 스몰그룹 STEP 2 — 모임 리포트. 리더가 모임일마다 작성(임시저장→제출),
 * 교역자가 확인. 출석은 report_attendance 에(교적 attendance 와 별개).
 * RP-03 모니터링: 주차 × 조직 격자 + 제출률.
 */

const REPORT_SELECT = (schema: string) => `
  SELECT r.*, g.name AS group_name, lm.name AS leader_name
  FROM "${schema}".meeting_reports r
  JOIN "${schema}".groups g ON g.id = r.group_id
  LEFT JOIN "${schema}".members lm ON lm.id = g.leader_member_id
`;

export async function listReports(schema: string, q: ListReportsQuery) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q.groupId) { where.push(`r.group_id = $${i++}::uuid`); params.push(q.groupId); }
  const status = q.status ?? 'all';
  if (status !== 'all') { where.push(`r.status = $${i++}`); params.push(status); }
  if (q.from) { where.push(`r.meeting_date >= $${i++}::date`); params.push(q.from); }
  if (q.to) { where.push(`r.meeting_date <= $${i++}::date`); params.push(q.to); }
  const sql = `${REPORT_SELECT(schema)} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.meeting_date DESC LIMIT 300`;
  return prisma.$queryRawUnsafe<any[]>(sql, ...params);
}

export async function getReport(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`${REPORT_SELECT(schema)} WHERE r.id = $1::uuid`, id);
  const report = rows[0];
  if (!report) return null;
  report.attendance = await prisma.$queryRawUnsafe<any[]>(
    `SELECT ra.*, m.name AS member_name, m.photo_url AS member_photo
     FROM "${schema}".report_attendance ra JOIN "${schema}".members m ON m.id = ra.member_id
     WHERE ra.report_id = $1::uuid ORDER BY m.name`, id,
  );
  return report;
}

/** 작성 화면용 — 해당 (조직, 모임일) 리포트가 있으면 그걸, 없으면 조직 명단으로 빈 초안. */
export async function draftReport(schema: string, groupId: string, meetingDate: string) {
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM "${schema}".meeting_reports WHERE group_id = $1::uuid AND meeting_date = $2::date`, groupId, meetingDate,
  );
  if (existing[0]) return getReport(schema, existing[0].id);
  // 빈 초안: 조직 명단을 참석 후보로.
  const roster = await prisma.$queryRawUnsafe<any[]>(
    `SELECT gm.member_id, m.name AS member_name, m.photo_url AS member_photo, gm.role
     FROM "${schema}".group_members gm JOIN "${schema}".members m ON m.id = gm.member_id
     WHERE gm.group_id = $1::uuid AND gm.end_date IS NULL ORDER BY m.name`, groupId,
  );
  const g = (await prisma.$queryRawUnsafe<any[]>(`SELECT name FROM "${schema}".groups WHERE id = $1::uuid`, groupId))[0];
  return {
    id: null, group_id: groupId, group_name: g?.name ?? '', meeting_date: meetingDate,
    status: 'draft', items: {}, private_items: {}, attendance_count: 0, newcomer_count: 0,
    attendance: roster.map((r) => ({ member_id: r.member_id, member_name: r.member_name, member_photo: r.member_photo, role: r.role, status: 'present', brought_newcomer: false })),
  };
}

/** (group_id, meeting_date) upsert + 출석 교체 + 인원 집계. */
export async function upsertReport(schema: string, input: UpsertReportInput) {
  const att = input.attendance ?? [];
  const attendanceCount = att.filter((a) => a.status === 'present' || a.status === 'online').length;
  const newcomerCount = input.newcomerCount ?? att.filter((a) => a.broughtNewcomer).length;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".meeting_reports
       (group_id, meeting_date, author, status, items, private_items, attendance_count, newcomer_count)
     VALUES ($1::uuid, $2::date, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
     ON CONFLICT (group_id, meeting_date) DO UPDATE SET
       author = EXCLUDED.author, status = EXCLUDED.status, items = EXCLUDED.items,
       private_items = EXCLUDED.private_items, attendance_count = EXCLUDED.attendance_count,
       newcomer_count = EXCLUDED.newcomer_count, updated_at = NOW()
     RETURNING *`,
    input.groupId, input.meetingDate, input.author ?? '', input.status,
    JSON.stringify(input.items ?? {}), JSON.stringify(input.privateItems ?? {}),
    attendanceCount, newcomerCount,
  );
  const report = rows[0];
  if (input.attendance !== undefined) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".report_attendance WHERE report_id = $1::uuid`, report.id);
    for (const a of att) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".report_attendance (report_id, member_id, status, brought_newcomer)
         VALUES ($1::uuid, $2::uuid, $3, $4)
         ON CONFLICT (report_id, member_id) DO UPDATE SET status = EXCLUDED.status, brought_newcomer = EXCLUDED.brought_newcomer`,
        report.id, a.memberId, a.status, !!a.broughtNewcomer,
      );
    }
  }
  return getReport(schema, report.id);
}

export async function confirmReport(schema: string, id: string, input: ConfirmReportInput) {
  if (input.unconfirm) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE "${schema}".meeting_reports SET status = 'submitted', confirmed_at = NULL, updated_at = NOW()
       WHERE id = $1::uuid RETURNING id`, id,
    );
    return rows.length ? getReport(schema, id) : null;
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".meeting_reports
     SET status = 'confirmed', confirmer = $2, confirm_comment = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid RETURNING id`,
    id, input.confirmer ?? '', input.confirmComment ?? '',
  );
  return rows.length ? getReport(schema, id) : null;
}

export async function deleteReport(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".meeting_reports WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}

// ── RP-03 모니터링 격자 (주차 × 조직) ─────────────────────
function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date): Date { const x = new Date(d); x.setUTCDate(x.getUTCDate() - x.getUTCDay()); x.setUTCHours(0, 0, 0, 0); return x; }

/** from~to(또는 최근 weeks주) 를 일요일 시작 주 단위로 나눈 컬럼 목록. */
function buildWeeks(from?: string, to?: string, weeks = 8): { key: string; label: string; start: string; end: string }[] {
  const end = to ? new Date(to + 'T00:00:00Z') : new Date();
  let start: Date;
  if (from) start = new Date(from + 'T00:00:00Z');
  else { start = startOfWeek(end); start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1)); }
  const cols: { key: string; label: string; start: string; end: string }[] = [];
  let cur = startOfWeek(start);
  const last = startOfWeek(end);
  let guard = 0;
  while (cur <= last && guard++ < 60) {
    const wEnd = new Date(cur); wEnd.setUTCDate(wEnd.getUTCDate() + 6);
    const month = cur.getUTCMonth() + 1;
    const weekOfMonth = Math.ceil(cur.getUTCDate() / 7);
    cols.push({ key: ymd(cur), label: `${month}-${weekOfMonth}`, start: ymd(cur), end: ymd(wEnd) });
    cur = new Date(cur); cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return cols;
}

export async function monitoringGrid(schema: string, q: MonitoringQuery) {
  const cols = buildWeeks(q.from, q.to, q.weeks ?? 8);
  const rangeStart = cols[0]?.start;
  const rangeEnd = cols[cols.length - 1]?.end;

  // 리포트를 쓰는 조직 = 활성 + 리프(자식 없음). (선택) parentId 서브트리로 제한.
  const groups = await prisma.$queryRawUnsafe<any[]>(
    `SELECT g.id, g.name, g.parent_id, lm.name AS leader_name
     FROM "${schema}".groups g LEFT JOIN "${schema}".members lm ON lm.id = g.leader_member_id
     WHERE g.status = 'active' ORDER BY g.sort_order, g.name`,
  );
  const parentIds = new Set(groups.filter((g) => g.parent_id).map((g) => g.parent_id));
  // subtree 필터
  let scope = groups;
  if (q.parentId) {
    const inScope = new Set<string>();
    const collect = (pid: string) => { for (const g of groups) if (g.parent_id === pid) { inScope.add(g.id); collect(g.id); } };
    inScope.add(q.parentId); collect(q.parentId);
    scope = groups.filter((g) => inScope.has(g.id));
  }
  const leaves = scope.filter((g) => !parentIds.has(g.id));

  const reports = rangeStart && rangeEnd
    ? await prisma.$queryRawUnsafe<any[]>(
        `SELECT group_id, meeting_date::text AS meeting_date, status FROM "${schema}".meeting_reports
         WHERE meeting_date >= $1::date AND meeting_date <= $2::date`, rangeStart, rangeEnd,
      )
    : [];
  // group_id → (weekKey → status)
  const map = new Map<string, Map<string, string>>();
  for (const r of reports) {
    const col = cols.find((c) => r.meeting_date >= c.start && r.meeting_date <= c.end);
    if (!col) continue;
    if (!map.has(r.group_id)) map.set(r.group_id, new Map());
    map.get(r.group_id)!.set(col.key, r.status);
  }

  const rows = leaves.map((g) => {
    const wk = map.get(g.id) ?? new Map<string, string>();
    const cells = cols.map((c) => wk.get(c.key) ?? 'none');
    const submitted = cells.filter((s) => s === 'submitted' || s === 'confirmed').length;
    return {
      groupId: g.id, name: g.name, leaderName: g.leader_name ?? '',
      cells, submittedRate: cols.length ? Math.round((submitted / cols.length) * 100) : 0,
    };
  });

  // 최신 주 미제출 조직
  const lastCol = cols[cols.length - 1];
  const unsubmittedLatest = lastCol
    ? rows.filter((r) => r.cells[r.cells.length - 1] === 'none' || r.cells[r.cells.length - 1] === 'draft').map((r) => ({ groupId: r.groupId, name: r.name, leaderName: r.leaderName }))
    : [];

  return { weeks: cols, rows, unsubmittedLatest, latestWeek: lastCol?.label ?? '' };
}
