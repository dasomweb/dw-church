import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { getPreset } from './service.js';
import type {
  CreateCourseInput, UpdateCourseInput, CreateTermInput, UpdateTermInput,
  EnrollInput, UpdateEnrollmentInput, RecordSessionInput, CompleteTermInput,
} from './schema.js';

/**
 * 스몰그룹 STEP 3 — 교육 과정·차수·수강·회차 출결. 교회가 과정 체계를 직접 정의
 * (ED-01), 차수마다 출결 기록(ED-03), 기준 충족 시 수료 확정 → 이수 이력 + (미소속
 * 이면) 배치 대기 큐 유입. 프리셋 course_set 에서 기본 과정을 한 번에 만들 수 있다.
 */

function toPgTextArray(arr: string[]): string {
  return `{${arr.map((t) => `"${String(t).replace(/(["\\])/g, '\\$1')}"`).join(',')}}`;
}

const COURSE_COLS: Record<string, string> = {
  name: 'name', stage: 'stage', prereqCourseId: 'prereq_course_id',
  totalSessions: 'total_sessions', criteria: 'criteria', required: 'required',
  recordHistory: 'record_history', autoQueue: 'auto_queue', certEnabled: 'cert_enabled',
  sortOrder: 'sort_order', isActive: 'is_active',
};
const TERM_COLS: Record<string, string> = {
  name: 'name', startDate: 'start_date', endDate: 'end_date', weekday: 'weekday',
  time: 'time', place: 'place', instructor: 'instructor', capacity: 'capacity', status: 'status',
};
const UUID_COLS = new Set(['prereq_course_id']);
const DATE_COLS = new Set(['start_date', 'end_date']);
const norm = (col: string, v: unknown) => ((UUID_COLS.has(col) || DATE_COLS.has(col)) && (v === '' || v === undefined) ? null : v);
const cast = (col: string) => (UUID_COLS.has(col) ? '::uuid' : DATE_COLS.has(col) ? '::date' : '');

// ── 과정(courses) ─────────────────────────────────────────
export async function listCourses(schema: string) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT c.*, pc.name AS prereq_name,
            (SELECT COUNT(*)::int FROM "${schema}".course_terms t WHERE t.course_id = c.id) AS term_count
     FROM "${schema}".courses c
     LEFT JOIN "${schema}".courses pc ON pc.id = c.prereq_course_id
     ORDER BY c.sort_order, c.stage, c.name`,
  );
}

export async function createCourse(schema: string, input: CreateCourseInput) {
  const cols: string[] = []; const ph: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [key, col] of Object.entries(COURSE_COLS)) {
    if ((input as any)[key] === undefined) continue;
    cols.push(`"${col}"`); ph.push(`$${i++}${cast(col)}`); vals.push(norm(col, (input as any)[key]));
  }
  if (input.target !== undefined) { cols.push('"target"'); ph.push(`$${i++}::text[]`); vals.push(toPgTextArray(input.target)); }
  if (!cols.includes('"name"')) throw new AppError('BAD_INPUT', 400, '과정 이름을 입력하세요.');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".courses (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`, ...vals);
  return rows[0];
}

export async function updateCourse(schema: string, id: string, input: UpdateCourseInput) {
  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [key, col] of Object.entries(COURSE_COLS)) {
    if ((input as any)[key] === undefined) continue;
    set.push(`"${col}" = $${i++}${cast(col)}`); vals.push(norm(col, (input as any)[key]));
  }
  if (input.target !== undefined) { set.push(`"target" = $${i++}::text[]`); vals.push(toPgTextArray(input.target)); }
  if (!set.length) { const c = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".courses WHERE id = $1::uuid`, id); return c[0] ?? null; }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".courses SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id);
  return rows[0] ?? null;
}

export async function deleteCourse(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".courses WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}

/** 프리셋 course_set 의 기본 과정을 만든다(이미 있는 이름은 건너뜀). */
export async function seedCoursesFromPreset(schema: string) {
  const preset = await getPreset(schema);
  const set: any[] = preset.courseSet ?? [];
  let created = 0;
  for (let idx = 0; idx < set.length; idx++) {
    const c = set[idx];
    const exists = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM "${schema}".courses WHERE name = $1`, c.name);
    if (exists.length) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".courses (name, stage, total_sessions, criteria, required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      c.name, c.stage ?? '', c.sessions ?? 8, c.criteria ?? 6, c.required ?? 'optional', idx);
    created++;
  }
  return { created, courses: await listCourses(schema) };
}

// ── 차수(course_terms) ────────────────────────────────────
export async function listTerms(schema: string, courseId?: string) {
  const where = courseId ? 'WHERE t.course_id = $1::uuid' : '';
  const params = courseId ? [courseId] : [];
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT t.*, c.name AS course_name, c.total_sessions, c.criteria,
            (SELECT COUNT(*)::int FROM "${schema}".enrollments e WHERE e.term_id = t.id) AS enrolled_count
     FROM "${schema}".course_terms t JOIN "${schema}".courses c ON c.id = t.course_id
     ${where} ORDER BY t.start_date DESC NULLS LAST, t.created_at DESC`, ...params);
}

export async function createTerm(schema: string, input: CreateTermInput) {
  const cols = ['course_id']; const ph = ['$1::uuid']; const vals: unknown[] = [input.courseId]; let i = 2;
  for (const [key, col] of Object.entries(TERM_COLS)) {
    if ((input as any)[key] === undefined) continue;
    cols.push(`"${col}"`); ph.push(`$${i++}${cast(col)}`); vals.push(norm(col, (input as any)[key]));
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".course_terms (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`, ...vals);
  return rows[0];
}

export async function updateTerm(schema: string, id: string, input: UpdateTermInput) {
  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [key, col] of Object.entries(TERM_COLS)) {
    if ((input as any)[key] === undefined) continue;
    set.push(`"${col}" = $${i++}${cast(col)}`); vals.push(norm(col, (input as any)[key]));
  }
  if (!set.length) { const c = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".course_terms WHERE id = $1::uuid`, id); return c[0] ?? null; }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".course_terms SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id);
  return rows[0] ?? null;
}

export async function deleteTerm(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".course_terms WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}

/** 차수 상세 — 수강생 + 회차 출결 집계 (ED-03). */
export async function getTerm(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT t.*, c.name AS course_name, c.total_sessions, c.criteria, c.cert_enabled
     FROM "${schema}".course_terms t JOIN "${schema}".courses c ON c.id = t.course_id WHERE t.id = $1::uuid`, id);
  const term = rows[0];
  if (!term) return null;
  const enrollments = await prisma.$queryRawUnsafe<any[]>(
    `SELECT e.*, m.name AS member_name, m.photo_url AS member_photo,
            (SELECT g.name FROM "${schema}".group_members gm JOIN "${schema}".groups g ON g.id = gm.group_id
               WHERE gm.member_id = e.member_id AND gm.end_date IS NULL LIMIT 1) AS group_name,
            (SELECT COUNT(*)::int FROM "${schema}".session_attendance sa
               WHERE sa.enrollment_id = e.id AND sa.status IN ('present','makeup')) AS present_count
     FROM "${schema}".enrollments e JOIN "${schema}".members m ON m.id = e.member_id
     WHERE e.term_id = $1::uuid ORDER BY m.name`, id);
  for (const e of enrollments) {
    e.sessions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT session_no, status FROM "${schema}".session_attendance WHERE enrollment_id = $1::uuid ORDER BY session_no`, e.id);
  }
  term.enrollments = enrollments;
  return term;
}

// ── 수강(enrollments) ─────────────────────────────────────
export async function enroll(schema: string, input: EnrollInput) {
  let added = 0; const skipped: string[] = [];
  for (const memberId of input.memberIds) {
    const dup = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "${schema}".enrollments WHERE term_id = $1::uuid AND member_id = $2::uuid`, input.termId, memberId);
    if (dup.length) { skipped.push(memberId); continue; }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".enrollments (term_id, member_id) VALUES ($1::uuid, $2::uuid)`, input.termId, memberId);
    added++;
  }
  return { added, skipped };
}

export async function updateEnrollment(schema: string, id: string, input: UpdateEnrollmentInput) {
  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  if (input.status !== undefined) { set.push(`status = $${i++}`); vals.push(input.status); }
  if (input.waitlist !== undefined) { set.push(`waitlist = $${i++}`); vals.push(input.waitlist); }
  if (input.note !== undefined) { set.push(`note = $${i++}`); vals.push(input.note); }
  if (!set.length) { const c = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".enrollments WHERE id = $1::uuid`, id); return c[0] ?? null; }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".enrollments SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id);
  return rows[0] ?? null;
}

export async function removeEnrollment(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".enrollments WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}

// ── 회차 출결(session_attendance) ─────────────────────────
export async function recordSessions(schema: string, input: RecordSessionInput) {
  for (const e of input.entries) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".session_attendance (enrollment_id, session_no, status)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (enrollment_id, session_no) DO UPDATE SET status = EXCLUDED.status`,
      e.enrollmentId, e.sessionNo, e.status);
  }
  return { saved: input.entries.length };
}

/** 수료 확정 — 기준 충족자(또는 지정/예외) 를 completed 로. 미소속·auto_queue 면 배치 대기 유입. */
export async function completeTerm(schema: string, termId: string, input: CompleteTermInput) {
  const term = await getTerm(schema, termId);
  if (!term) throw new AppError('NOT_FOUND', 404, '차수를 찾을 수 없습니다.');
  const course = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".courses WHERE id = $1::uuid`, term.course_id);
  const c = course[0];
  const criteria = term.criteria ?? c?.criteria ?? 0;
  const targetIds = input.enrollmentIds && input.enrollmentIds.length ? new Set(input.enrollmentIds) : null;

  let completed = 0; const below: string[] = [];
  for (const e of term.enrollments as any[]) {
    if (targetIds && !targetIds.has(e.id)) continue;
    const meets = (e.present_count ?? 0) >= criteria;
    if (!meets && !input.overrideBelow) { below.push(e.member_name); continue; }
    if (e.status === 'completed') continue;
    const certNo = c?.cert_enabled ? `${new Date().getFullYear()}-${String(term.name || '').replace(/\s/g, '') || 'T'}-${completed + 1}` : '';
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".enrollments SET status = 'completed', completed_date = CURRENT_DATE, cert_no = $2 WHERE id = $1::uuid`, e.id, certNo);
    completed++;
    // 미소속 + auto_queue → 배치 대기 큐 유입 (중복 방지).
    if (c?.auto_queue) {
      const inGroup = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 1 FROM "${schema}".group_members WHERE member_id = $1::uuid AND end_date IS NULL LIMIT 1`, e.member_id);
      const already = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 1 FROM "${schema}".group_placement_queue WHERE member_id = $1::uuid AND status = 'waiting' LIMIT 1`, e.member_id);
      if (!inGroup.length && !already.length) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schema}".group_placement_queue (member_id, source, note)
           VALUES ($1::uuid, 'course', $2)`, e.member_id, `${c.name}${term.name ? ' ' + term.name : ''} 수료`);
      }
    }
  }
  // 회차 진행이 끝났으면 차수 상태를 done 으로.
  await prisma.$executeRawUnsafe(`UPDATE "${schema}".course_terms SET status = 'done', updated_at = NOW() WHERE id = $1::uuid`, termId);
  return { completed, below, term: await getTerm(schema, termId) };
}

/** 교인 카드 이수 이력 (교적 연동) — member 상세에서 호출. */
export async function memberEnrollments(schema: string, memberId: string) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT e.id, e.status, e.completed_date, e.cert_no, t.name AS term_name,
            c.name AS course_name, c.stage,
            (SELECT COUNT(*)::int FROM "${schema}".session_attendance sa WHERE sa.enrollment_id = e.id AND sa.status IN ('present','makeup')) AS present_count,
            c.total_sessions, c.criteria
     FROM "${schema}".enrollments e
     JOIN "${schema}".course_terms t ON t.id = e.term_id
     JOIN "${schema}".courses c ON c.id = t.course_id
     WHERE e.member_id = $1::uuid ORDER BY e.created_at DESC`, memberId);
}
