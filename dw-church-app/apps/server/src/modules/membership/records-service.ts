import { prisma } from '../../config/database.js';

/**
 * 교적관리 Phase 2~4 레코드 — 출석(예배 정의 + 출석), 심방, 성례, 이동, 통계.
 * 모두 테넌트 스키마. 교인 삭제 시 FK CASCADE 로 함께 정리됨.
 */

// ── 예배(services) ────────────────────────────────────────────
export function listServices(schema: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".member_services ORDER BY sort_order ASC, created_at ASC`,
  );
}
export async function createService(schema: string, i: { name: string; weekday?: string; time?: string; sortOrder?: number }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".member_services (name, weekday, time, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
    i.name, i.weekday ?? '', i.time ?? '', i.sortOrder ?? 0,
  );
  return rows[0];
}
export async function updateService(schema: string, id: string, i: { name?: string; weekday?: string; time?: string; sortOrder?: number; isActive?: boolean }) {
  const map: Record<string, string> = { name: 'name', weekday: 'weekday', time: 'time', sortOrder: 'sort_order', isActive: 'is_active' };
  const set: string[] = []; const vals: unknown[] = []; let n = 1;
  for (const [k, c] of Object.entries(map)) { if ((i as any)[k] !== undefined) { set.push(`"${c}" = $${n++}`); vals.push((i as any)[k]); } }
  if (!set.length) return null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".member_services SET ${set.join(', ')} WHERE id = $${n}::uuid RETURNING *`, ...vals, id,
  );
  return rows[0] ?? null;
}
export async function deleteService(schema: string, id: string) {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".member_services WHERE id = $1::uuid`, id);
  return n > 0;
}

// ── 출석(attendance) ──────────────────────────────────────────
/** 특정 예배·날짜의 대상 교인 + 현재 출석 표시(체크 화면용). */
export async function attendanceSheet(schema: string, serviceId: string, date: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.id AS member_id, m.name, m.position, m.photo_url,
            a.status, a.id AS attendance_id
       FROM "${schema}".members m
       LEFT JOIN "${schema}".member_attendance a
         ON a.member_id = m.id AND a.service_id = $1::uuid AND a.att_date = $2::date
      WHERE m.reg_status IN ('active','newcomer')
      ORDER BY m.name ASC`,
    serviceId, date,
  );
}

/** 출석 일괄 기록(upsert). entries: [{memberId, status}]. */
export async function recordAttendance(
  schema: string,
  input: { serviceId: string; date: string; recordedBy?: string; entries: Array<{ memberId: string; status: string }> },
): Promise<{ saved: number }> {
  const CHUNK = 100;
  let saved = 0;
  for (let c = 0; c < input.entries.length; c += CHUNK) {
    const group = input.entries.slice(c, c + CHUNK);
    if (group.length === 0) continue;
    const valueSql: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const e of group) {
      valueSql.push(`($${i++}::uuid, $${i++}::uuid, $${i++}::date, $${i++}, $${i++})`);
      params.push(e.memberId, input.serviceId, input.date, e.status, input.recordedBy ?? '');
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".member_attendance (member_id, service_id, att_date, status, recorded_by)
       VALUES ${valueSql.join(', ')}
       ON CONFLICT (member_id, service_id, att_date)
       DO UPDATE SET status = excluded.status, recorded_by = excluded.recorded_by`,
      ...params,
    );
    saved += group.length;
  }
  return { saved };
}

/** N주 이상 연속 결석(최근 '출석' 기록이 cutoff 이전이거나 없음) 교인. */
export async function longAbsentees(schema: string, weeks = 4) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.id, m.name, m.position, m.phone, m.photo_url,
            MAX(a.att_date) FILTER (WHERE a.status = 'present') AS last_present
       FROM "${schema}".members m
       LEFT JOIN "${schema}".member_attendance a ON a.member_id = m.id
      WHERE m.reg_status IN ('active','newcomer')
      GROUP BY m.id, m.name, m.position, m.phone, m.photo_url
     HAVING MAX(a.att_date) FILTER (WHERE a.status = 'present') IS NULL
         OR MAX(a.att_date) FILTER (WHERE a.status = 'present') < (CURRENT_DATE - ($1::int * 7))
      ORDER BY last_present ASC NULLS FIRST, m.name ASC`,
    weeks,
  );
}

// ── 심방(visits) ──────────────────────────────────────────────
export function listVisits(schema: string, q: { memberId?: string; status?: string; from?: string; to?: string }) {
  const where: string[] = []; const params: unknown[] = []; let i = 1;
  if (q.memberId) { where.push(`v.member_id = $${i++}::uuid`); params.push(q.memberId); }
  if (q.status) { where.push(`v.status = $${i++}`); params.push(q.status); }
  if (q.from) { where.push(`v.visit_date >= $${i++}::date`); params.push(q.from); }
  if (q.to) { where.push(`v.visit_date <= $${i++}::date`); params.push(q.to); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT v.*, m.name AS member_name FROM "${schema}".member_visits v
       JOIN "${schema}".members m ON m.id = v.member_id
       ${w} ORDER BY v.visit_date DESC NULLS LAST, v.created_at DESC`,
    ...params,
  );
}
export async function createVisit(schema: string, i: Record<string, any>) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".member_visits (member_id, visitor, visit_date, visit_type, content, prayer, followup, visibility, status)
     VALUES ($1::uuid,$2,$3::date,$4,$5,$6,$7,$8,$9) RETURNING *`,
    i.memberId, i.visitor ?? '', i.visitDate || null, i.visitType ?? '심방', i.content ?? '', i.prayer ?? '', i.followup ?? '', i.visibility ?? 'pastors', i.status ?? 'done',
  );
  return rows[0];
}
export async function updateVisit(schema: string, id: string, i: Record<string, any>) {
  const map: Record<string, string> = { visitor: 'visitor', visitDate: 'visit_date', visitType: 'visit_type', content: 'content', prayer: 'prayer', followup: 'followup', visibility: 'visibility', status: 'status' };
  const dateCols = new Set(['visit_date']);
  const set: string[] = []; const vals: unknown[] = []; let n = 1;
  for (const [k, c] of Object.entries(map)) {
    if (i[k] === undefined) continue;
    set.push(`"${c}" = $${n++}${dateCols.has(c) ? '::date' : ''}`);
    vals.push(dateCols.has(c) && !i[k] ? null : i[k]);
  }
  if (!set.length) return null;
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".member_visits SET ${set.join(', ')} WHERE id = $${n}::uuid RETURNING *`, ...vals, id,
  );
  return rows[0] ?? null;
}
export async function deleteVisit(schema: string, id: string) {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".member_visits WHERE id = $1::uuid`, id);
  return n > 0;
}

// ── 성례(sacraments) ──────────────────────────────────────────
export function listSacraments(schema: string, q: { memberId?: string; type?: string }) {
  const where: string[] = []; const params: unknown[] = []; let i = 1;
  if (q.memberId) { where.push(`s.member_id = $${i++}::uuid`); params.push(q.memberId); }
  if (q.type) { where.push(`s.sac_type = $${i++}`); params.push(q.type); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT s.*, m.name AS member_name FROM "${schema}".member_sacraments s
       JOIN "${schema}".members m ON m.id = s.member_id
       ${w} ORDER BY s.sac_date DESC NULLS LAST`,
    ...params,
  );
}
export async function createSacrament(schema: string, i: Record<string, any>) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".member_sacraments (member_id, sac_type, sac_date, officiant, place, cert_no, recognized)
     VALUES ($1::uuid,$2,$3::date,$4,$5,$6,$7) RETURNING *`,
    i.memberId, i.sacType, i.sacDate || null, i.officiant ?? '', i.place ?? '', i.certNo ?? '', i.recognized !== false,
  );
  return rows[0];
}
export async function deleteSacrament(schema: string, id: string) {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".member_sacraments WHERE id = $1::uuid`, id);
  return n > 0;
}

// ── 이동(transfers) ───────────────────────────────────────────
// 이동 유형 → 처리 후 교인 등록상태 자동 변경.
const TRANSFER_STATUS: Record<string, string> = { in: 'active', out: 'transferred', dismissal: 'transferred', death: 'deceased' };
export function listTransfers(schema: string, q: { type?: string }) {
  const where: string[] = []; const params: unknown[] = []; let i = 1;
  if (q.type) { where.push(`t.tr_type = $${i++}`); params.push(q.type); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT t.*, m.name AS member_name FROM "${schema}".member_transfers t
       JOIN "${schema}".members m ON m.id = t.member_id
       ${w} ORDER BY t.tr_date DESC NULLS LAST`,
    ...params,
  );
}
export async function createTransfer(schema: string, i: Record<string, any>) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".member_transfers (member_id, tr_type, tr_date, counterpart, reason)
     VALUES ($1::uuid,$2,$3::date,$4,$5) RETURNING *`,
    i.memberId, i.trType, i.trDate || null, i.counterpart ?? '', i.reason ?? '',
  );
  // 명부 상태 자동 반영
  const newStatus = TRANSFER_STATUS[i.trType as string];
  if (newStatus) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".members SET reg_status = $1, updated_at = NOW() WHERE id = $2::uuid`, newStatus, i.memberId,
    );
  }
  return rows[0];
}
export async function deleteTransfer(schema: string, id: string) {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".member_transfers WHERE id = $1::uuid`, id);
  return n > 0;
}

// ── 통계(Phase 4) ─────────────────────────────────────────────
export async function statsReport(schema: string) {
  const gender = await prisma.$queryRawUnsafe<{ gender: string; n: number }[]>(
    `SELECT COALESCE(NULLIF(gender,''),'미상') AS gender, count(*)::int AS n
       FROM "${schema}".members WHERE reg_status IN ('active','newcomer') GROUP BY 1`,
  );
  const age = await prisma.$queryRawUnsafe<{ bucket: string; n: number }[]>(
    `SELECT CASE
              WHEN birth_date IS NULL THEN '미상'
              WHEN age(birth_date) < interval '20 years' THEN '10대 이하'
              WHEN age(birth_date) < interval '30 years' THEN '20대'
              WHEN age(birth_date) < interval '40 years' THEN '30대'
              WHEN age(birth_date) < interval '50 years' THEN '40대'
              WHEN age(birth_date) < interval '60 years' THEN '50대'
              ELSE '60대 이상' END AS bucket,
            count(*)::int AS n
       FROM "${schema}".members WHERE reg_status IN ('active','newcomer') GROUP BY 1`,
  );
  const position = await prisma.$queryRawUnsafe<{ position: string; n: number }[]>(
    `SELECT COALESCE(NULLIF(position,''),'미지정') AS position, count(*)::int AS n
       FROM "${schema}".members WHERE reg_status IN ('active','newcomer') GROUP BY 1 ORDER BY n DESC`,
  );
  const region = await prisma.$queryRawUnsafe<{ region: string; n: number }[]>(
    `SELECT COALESCE(NULLIF(h.region,''),'미배정') AS region, count(m.id)::int AS n
       FROM "${schema}".members m LEFT JOIN "${schema}".households h ON h.id = m.household_id
      WHERE m.reg_status IN ('active','newcomer') GROUP BY 1 ORDER BY n DESC`,
  );
  const attendanceRecent = await prisma.$queryRawUnsafe<{ week: string; present: number }[]>(
    `SELECT to_char(att_date,'MM-DD') AS week, count(*) FILTER (WHERE status='present')::int AS present
       FROM "${schema}".member_attendance
      WHERE att_date >= CURRENT_DATE - 56
      GROUP BY att_date ORDER BY att_date ASC`,
  );
  return { gender, age, position, region, attendanceRecent };
}
