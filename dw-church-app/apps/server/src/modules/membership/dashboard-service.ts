import { prisma } from '../../config/database.js';

/**
 * MB-01 교적 현황 대시보드 집계 — 화면 시안 그대로의 카드/표/차트를 채우는 실제
 * 데이터(더미 아님): 재적 교인·세대·미편성 / 지난주 주일 출석률 / 새가족(30일) /
 * 장기결석 / 구역(조직)별 출석 / 이번 주 할 일 / 연령 분포.
 * 구역별 출석은 스몰그룹 조직(group_members) 이 있으면 그 기준으로 집계한다.
 */
export async function memberDashboard(schema: string) {
  const q = <T = any>(sql: string, ...p: unknown[]) => prisma.$queryRawUnsafe<T[]>(sql, ...p);

  // 재적/세대/미편성
  const [{ registered = 0 } = {}] = await q<{ registered: number }>(
    `SELECT COUNT(*)::int AS registered FROM "${schema}".members WHERE reg_status IN ('active','newcomer','inactive')`);
  const [{ households = 0 } = {}] = await q<{ households: number }>(`SELECT COUNT(*)::int AS households FROM "${schema}".households`);
  const [{ unassigned = 0 } = {}] = await q<{ unassigned: number }>(
    `SELECT COUNT(*)::int AS unassigned FROM "${schema}".members WHERE reg_status IN ('active','newcomer') AND household_id IS NULL`);
  const [{ activeCount = 0 } = {}] = await q<{ activeCount: number }>(
    `SELECT COUNT(*)::int AS "activeCount" FROM "${schema}".members WHERE reg_status = 'active'`);

  // 지난주 주일 출석 (가장 최근 출석일 기준)
  const [{ last_date = null } = {}] = await q<{ last_date: string | null }>(
    `SELECT MAX(att_date)::text AS last_date FROM "${schema}".member_attendance`);
  let present = 0, online = 0;
  if (last_date) {
    const [row] = await q<{ present: number; online: number }>(
      `SELECT COUNT(*) FILTER (WHERE status='present')::int AS present,
              COUNT(*) FILTER (WHERE status='online')::int AS online
       FROM "${schema}".member_attendance WHERE att_date = $1::date`, last_date);
    present = row?.present ?? 0; online = row?.online ?? 0;
  }
  const attendanceRate = registered ? Math.round((present / registered) * 100) : 0;

  // 새가족(30일) + 미배정
  const [{ newcomers = 0 } = {}] = await q<{ newcomers: number }>(
    `SELECT COUNT(*)::int AS newcomers FROM "${schema}".members
     WHERE reg_status = 'newcomer' AND (registered_on IS NULL OR registered_on >= CURRENT_DATE - 30)`);
  const [{ newcomerUnassigned = 0 } = {}] = await q<{ newcomerUnassigned: number }>(
    `SELECT COUNT(*)::int AS "newcomerUnassigned" FROM "${schema}".members m
     WHERE m.reg_status = 'newcomer'
       AND NOT EXISTS (SELECT 1 FROM "${schema}".group_members gm WHERE gm.member_id = m.id AND gm.end_date IS NULL)`);

  // 장기 결석 (4주+): 최근 4주 안에 '현장' 출석 기록이 없는 재적 교인.
  // 온라인 출석 정책 B = 온라인은 출석률·장기결석에 미포함(현장 present 만 집계).
  // records-service.longAbsentees 와 정의를 통일한다(이전엔 여기만 online 을 포함해 불일치).
  const [{ longAbsent = 0 } = {}] = await q<{ longAbsent: number }>(
    `SELECT COUNT(*)::int AS "longAbsent" FROM "${schema}".members m
     WHERE m.reg_status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".member_attendance a
         WHERE a.member_id = m.id AND a.status = 'present' AND a.att_date >= CURRENT_DATE - 28)`);

  // 이번 달 생일자
  const [{ birthdays = 0 } = {}] = await q<{ birthdays: number }>(
    `SELECT COUNT(*)::int AS birthdays FROM "${schema}".members
     WHERE birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND reg_status IN ('active','newcomer')`);

  // 구역(조직)별 지난주 출석 — 스몰그룹 조직 기준(없으면 빈 목록)
  let byGroup: any[] = [];
  if (last_date) {
    byGroup = await q(
      `SELECT g.name,
              COUNT(DISTINCT gm.member_id)::int AS total,
              COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.member_id END)::int AS present
       FROM "${schema}".group_members gm
       JOIN "${schema}".groups g ON g.id = gm.group_id AND g.status = 'active'
       LEFT JOIN "${schema}".member_attendance a ON a.member_id = gm.member_id AND a.att_date = $1::date
       WHERE gm.end_date IS NULL
       GROUP BY g.id, g.name ORDER BY g.sort_order, g.name LIMIT 12`, last_date);
  }

  // 연령 분포
  const ageRows = await q<{ bucket: string; n: number }>(
    `SELECT CASE
              WHEN birth_date IS NULL THEN '미상'
              WHEN age(birth_date) < interval '20 years' THEN '10대'
              WHEN age(birth_date) < interval '30 years' THEN '20대'
              WHEN age(birth_date) < interval '40 years' THEN '30대'
              WHEN age(birth_date) < interval '50 years' THEN '40대'
              WHEN age(birth_date) < interval '60 years' THEN '50대'
              ELSE '60+' END AS bucket,
            COUNT(*)::int AS n
       FROM "${schema}".members WHERE reg_status IN ('active','newcomer') GROUP BY 1`);
  const order = ['10대', '20대', '30대', '40대', '50대', '60+'];
  const ageMap: Record<string, number> = {};
  for (const r of ageRows) ageMap[r.bucket] = r.n;
  const ageDist = order.map((b) => ({ bucket: b, n: ageMap[b] ?? 0 }));

  // 이번 주 할 일 (실제 카운트 기반)
  const todos: { text: string; note?: string; noteAmber?: boolean }[] = [];
  if (newcomerUnassigned > 0) todos.push({ text: `새가족 ${newcomerUnassigned}명 구역 배정`, note: '미배정 새가족', noteAmber: true });
  if (longAbsent > 0) todos.push({ text: `장기결석 ${longAbsent}명 심방 배정`, note: '4주 이상 미출석' });
  if (birthdays > 0) todos.push({ text: `이번 달 생일자 ${birthdays}명 축하 인사`, note: '생일 축하' });

  return {
    cards: {
      registered, households, unassigned,
      attendanceRate, present, online,
      newcomers, newcomerUnassigned,
      longAbsent, activeCount,
    },
    byGroup: byGroup.map((g) => ({ name: g.name, total: g.total, present: g.present, rate: g.total ? Math.round((g.present / g.total) * 100) : 0 })),
    todos,
    ageDist,
    lastAttendanceDate: last_date,
  };
}
