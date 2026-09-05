import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  presetPayload, resolveTerminology, PRESETS,
  type GroupModel,
} from './presets.js';
import type {
  UpdatePresetInput, CreateGroupInput, UpdateGroupInput, ListGroupsQuery,
  AddGroupMemberInput, AssignMembersInput, UpdateGroupMemberInput,
  CreateQueueInput, PlaceFromQueueInput,
} from './schema.js';

/** JS string[] → Postgres array literal (for `$n::text[]`). */
function toPgTextArray(arr: string[]): string {
  return `{${arr.map((t) => `"${String(t).replace(/(["\\])/g, '\\$1')}"`).join(',')}}`;
}
function normTags(tags?: string[] | null): string[] {
  return Array.from(new Set((tags ?? []).map((t) => t.trim()).filter(Boolean)));
}

// camelCase input → snake_case column, for groups.
const GROUP_COLS: Record<string, string> = {
  name: 'name', level: 'level', parentId: 'parent_id',
  leaderMemberId: 'leader_member_id', subleaderMemberId: 'subleader_member_id',
  meetingDay: 'meeting_day', meetingTime: 'meeting_time', meetingPlace: 'meeting_place',
  status: 'status', originGroupId: 'origin_group_id', year: 'year', region: 'region',
  intro: 'intro', photoUrl: 'photo_url', isPublic: 'is_public', sortOrder: 'sort_order',
};
const GROUP_UUID = new Set(['parent_id', 'leader_member_id', 'subleader_member_id', 'origin_group_id']);

function gNorm(col: string, val: unknown): unknown {
  if (GROUP_UUID.has(col) && (val === '' || val === undefined)) return null;
  return val;
}
function gCast(col: string): string {
  return GROUP_UUID.has(col) ? '::uuid' : '';
}

// ── 프리셋(group_preset) ───────────────────────────────────
export async function getPreset(schema: string) {
  await prisma.$executeRawUnsafe(`INSERT INTO "${schema}".group_preset (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".group_preset WHERE id = 1`);
  const row = rows[0] ?? {};
  const model = (row.model || 'A') as GroupModel;
  // 최초(미설정)면 모델 기본값을 채워 돌려준다 — 프론트가 바로 렌더.
  const configured = !!row.is_configured;
  const base = PRESETS[model] ?? PRESETS.A;
  const levelDefs = Array.isArray(row.level_defs) && row.level_defs.length ? row.level_defs : base.levelDefs;
  const reportItems = Array.isArray(row.report_items) && row.report_items.length ? row.report_items : base.reportItems;
  const courseSet = Array.isArray(row.course_set) && row.course_set.length ? row.course_set : base.courseSet;
  const metrics = Array.isArray(row.metrics) && row.metrics.length ? row.metrics : base.metrics;
  return {
    model,
    label: base.label,
    levelDefs,
    terminology: resolveTerminology(model, row.terminology),
    allowMulti: typeof row.allow_multi === 'boolean' ? row.allow_multi : base.allowMulti,
    reportItems,
    courseSet,
    metrics,
    isConfigured: configured,
    updatedAt: row.updated_at ?? null,
    // 참고용: 선택 가능한 모델 목록.
    models: Object.values(PRESETS).map((p) => ({ model: p.model, label: p.label })),
  };
}

const PRESET_JSONB: Record<string, string> = {
  levelDefs: 'level_defs', terminology: 'terminology', reportItems: 'report_items',
  courseSet: 'course_set', metrics: 'metrics',
};

export async function updatePreset(schema: string, input: UpdatePresetInput) {
  await prisma.$executeRawUnsafe(`INSERT INTO "${schema}".group_preset (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (input.model !== undefined) { set.push(`model = $${i++}`); vals.push(input.model); }
  if (input.allowMulti !== undefined) { set.push(`allow_multi = $${i++}`); vals.push(input.allowMulti); }
  if (input.isConfigured !== undefined) { set.push(`is_configured = $${i++}`); vals.push(input.isConfigured); }
  for (const [key, col] of Object.entries(PRESET_JSONB)) {
    const v = (input as any)[key];
    if (v !== undefined) { set.push(`"${col}" = $${i++}::jsonb`); vals.push(JSON.stringify(v)); }
  }
  if (set.length) {
    set.push('updated_at = NOW()');
    await prisma.$executeRawUnsafe(`UPDATE "${schema}".group_preset SET ${set.join(', ')} WHERE id = 1`, ...vals);
  }
  return getPreset(schema);
}

/** 프리셋을 모델 기본값으로 초기화 — 용어·계층·리포트·과정 전부 리셋 + is_configured=true. */
export async function applyPreset(schema: string, model: GroupModel) {
  const p = presetPayload(model);
  await prisma.$executeRawUnsafe(`INSERT INTO "${schema}".group_preset (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  await prisma.$executeRawUnsafe(
    `UPDATE "${schema}".group_preset
     SET model = $1, level_defs = $2::jsonb, terminology = $3::jsonb, allow_multi = $4,
         report_items = $5::jsonb, course_set = $6::jsonb, metrics = $7::jsonb,
         is_configured = TRUE, updated_at = NOW()
     WHERE id = 1`,
    p.model, JSON.stringify(p.levelDefs), JSON.stringify(p.terminology), p.allowMulti,
    JSON.stringify(p.reportItems), JSON.stringify(p.courseSet), JSON.stringify(p.metrics),
  );
  return getPreset(schema);
}

// ── 조직(groups) ──────────────────────────────────────────
// 각 조직에 소속(활성) 인원수 + 리더 이름을 함께 매단다.
const GROUP_SELECT = (schema: string) => `
  SELECT g.*,
         lm.name AS leader_name, lm.photo_url AS leader_photo,
         (SELECT COUNT(*)::int FROM "${schema}".group_members gm
            WHERE gm.group_id = g.id AND gm.end_date IS NULL) AS member_count
  FROM "${schema}".groups g
  LEFT JOIN "${schema}".members lm ON lm.id = g.leader_member_id
`;

export async function listGroups(schema: string, q: ListGroupsQuery) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  const status = q.status ?? 'active';
  if (status !== 'all') { where.push(`g.status = $${i++}`); params.push(status); }
  if (q.level) { where.push(`g.level = $${i++}`); params.push(q.level); }
  if (q.parentId) { where.push(`g.parent_id = $${i++}::uuid`); params.push(q.parentId); }
  if (q.leaderMemberId) { where.push(`g.leader_member_id = $${i++}::uuid`); params.push(q.leaderMemberId); }
  if (q.isPublic !== undefined) { where.push(`g.is_public = $${i++}`); params.push(q.isPublic); }
  if (q.q) { where.push(`g.name ILIKE $${i++}`); params.push(`%${q.q}%`); }
  const sql = `${GROUP_SELECT(schema)} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY g.sort_order ASC, g.name ASC`;
  return prisma.$queryRawUnsafe<any[]>(sql, ...params);
}

/** parent_id 기준 트리 (최대 3단). 루트(parent 없음)부터 children[] 로 중첩. */
export async function getGroupTree(schema: string, status: string = 'active') {
  const flat = await listGroups(schema, { status: status as any });
  const byId = new Map<string, any>();
  for (const g of flat) { g.children = []; byId.set(g.id, g); }
  const roots: any[] = [];
  for (const g of flat) {
    const parent = g.parent_id ? byId.get(g.parent_id) : null;
    if (parent) parent.children.push(g);
    else roots.push(g);
  }
  return roots;
}

export async function getGroup(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`${GROUP_SELECT(schema)} WHERE g.id = $1::uuid`, id);
  const group = rows[0];
  if (!group) return null;
  group.members = await listGroupMembers(schema, id);
  const parent = group.parent_id
    ? (await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM "${schema}".groups WHERE id = $1::uuid`, group.parent_id))[0]
    : null;
  group.parent = parent ?? null;
  group.children = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, status FROM "${schema}".groups WHERE parent_id = $1::uuid ORDER BY sort_order, name`, id,
  );
  return group;
}

export async function createGroup(schema: string, input: CreateGroupInput) {
  const cols: string[] = [];
  const ph: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(GROUP_COLS)) {
    if ((input as any)[key] === undefined) continue;
    cols.push(`"${col}"`); ph.push(`$${i++}${gCast(col)}`); vals.push(gNorm(col, (input as any)[key]));
  }
  if (input.tags !== undefined) { cols.push('"tags"'); ph.push(`$${i++}::text[]`); vals.push(toPgTextArray(normTags(input.tags))); }
  if (!cols.length) throw new AppError('BAD_INPUT', 400, '조직 정보를 입력하세요.');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".groups (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`, ...vals,
  );
  return rows[0];
}

export async function updateGroup(schema: string, id: string, input: UpdateGroupInput) {
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(GROUP_COLS)) {
    if ((input as any)[key] === undefined) continue;
    set.push(`"${col}" = $${i++}${gCast(col)}`); vals.push(gNorm(col, (input as any)[key]));
  }
  if (input.tags !== undefined) { set.push(`"tags" = $${i++}::text[]`); vals.push(toPgTextArray(normTags(input.tags))); }
  if (!set.length) {
    const cur = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".groups WHERE id = $1::uuid`, id);
    return cur[0] ?? null;
  }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".groups SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id,
  );
  return rows[0] ?? null;
}

export async function deleteGroup(schema: string, id: string) {
  // 자식 조직이 있으면 삭제 막고 안내 (트리 무결성).
  const kids = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int AS n FROM "${schema}".groups WHERE parent_id = $1::uuid`, id);
  if ((kids[0]?.n ?? 0) > 0) {
    throw new AppError('HAS_CHILDREN', 409, '하위 조직이 있어 삭제할 수 없습니다. 먼저 하위 조직을 옮기거나 삭제하세요.');
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".groups WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}

// ── 소속(group_members) ───────────────────────────────────
export async function listGroupMembers(schema: string, groupId: string) {
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT gm.*, m.name AS member_name, m.photo_url AS member_photo, m.position,
            m.birth_date, hh.name AS household_name
     FROM "${schema}".group_members gm
     JOIN "${schema}".members m ON m.id = gm.member_id
     LEFT JOIN "${schema}".households hh ON hh.id = m.household_id
     WHERE gm.group_id = $1::uuid AND gm.end_date IS NULL
     ORDER BY CASE gm.role WHEN 'leader' THEN 0 WHEN 'subleader' THEN 1 WHEN 'preleader' THEN 2 ELSE 3 END,
              m.name ASC`,
    groupId,
  );
}

/** 조직들의 소속 상태 — 미소속 명단 배정 화면(GR-02)에서 쓰는 member_id → group 맵. */
export async function memberGroupMap(schema: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT gm.member_id, g.id AS group_id, g.name AS group_name, gm.role
     FROM "${schema}".group_members gm JOIN "${schema}".groups g ON g.id = gm.group_id
     WHERE gm.end_date IS NULL`,
  );
  return rows;
}

async function ensureNotDuplicateMember(schema: string, groupId: string, memberId: string) {
  const dup = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM "${schema}".group_members WHERE group_id = $1::uuid AND member_id = $2::uuid AND end_date IS NULL`,
    groupId, memberId,
  );
  return dup.length > 0;
}

/** 단일 배정 — 중복소속 비허용(모델 A/B/C)이면 기존 활성 소속을 자동 종료(이동). */
export async function addGroupMember(schema: string, groupId: string, input: AddGroupMemberInput) {
  if (await ensureNotDuplicateMember(schema, groupId, input.memberId)) {
    throw new AppError('ALREADY_MEMBER', 409, '이미 이 조직에 소속된 교인입니다.');
  }
  const preset = await getPreset(schema);
  if (!preset.allowMulti) {
    // 중복 소속 비허용: 다른 조직의 활성 소속을 종료 처리한다.
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".group_members SET end_date = CURRENT_DATE
       WHERE member_id = $1::uuid AND end_date IS NULL`,
      input.memberId,
    );
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".group_members (group_id, member_id, role, reason, start_date, is_temporary)
     VALUES ($1::uuid, $2::uuid, $3, $4, COALESCE($5::date, CURRENT_DATE), $6) RETURNING *`,
    groupId, input.memberId, input.role, input.reason ?? '', input.startDate || null, !!input.isTemporary,
  );
  return rows[0];
}

/** 일괄 배정 (GR-02) — 결과 { added, skipped }. */
export async function assignMembers(schema: string, input: AssignMembersInput) {
  let added = 0; const skipped: string[] = [];
  for (const memberId of input.memberIds) {
    try {
      await addGroupMember(schema, input.groupId, {
        memberId, role: input.role, reason: input.reason, isTemporary: input.isTemporary,
      });
      added++;
    } catch (e) {
      if (e instanceof AppError && e.code === 'ALREADY_MEMBER') { skipped.push(memberId); continue; }
      throw e;
    }
  }
  return { added, skipped };
}

export async function updateGroupMember(schema: string, id: string, input: UpdateGroupMemberInput) {
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (input.role !== undefined) { set.push(`role = $${i++}`); vals.push(input.role); }
  if (input.reason !== undefined) { set.push(`reason = $${i++}`); vals.push(input.reason); }
  if (input.isTemporary !== undefined) { set.push(`is_temporary = $${i++}`); vals.push(input.isTemporary); }
  if (input.endDate !== undefined) { set.push(`end_date = $${i++}::date`); vals.push(input.endDate || null); }
  if (!set.length) {
    const cur = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".group_members WHERE id = $1::uuid`, id);
    return cur[0] ?? null;
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".group_members SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`, ...vals, id,
  );
  return rows[0] ?? null;
}

/** 소속 해제 — 이력 보존 위해 end_date 만 찍는다(soft). */
export async function removeGroupMember(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".group_members SET end_date = CURRENT_DATE WHERE id = $1::uuid AND end_date IS NULL RETURNING id`, id,
  );
  return rows.length > 0;
}

// ── 배치 대기 큐(group_placement_queue) — GR-09 ────────────
export async function listQueue(schema: string, status: string = 'waiting') {
  const where = status === 'all' ? '' : 'WHERE q.status = $1';
  const params = status === 'all' ? [] : [status];
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT q.*, m.name AS member_name, m.photo_url AS member_photo, m.birth_date,
            m.address, hh.name AS household_name
     FROM "${schema}".group_placement_queue q
     LEFT JOIN "${schema}".members m ON m.id = q.member_id
     LEFT JOIN "${schema}".households hh ON hh.id = m.household_id
     ${where} ORDER BY q.created_at DESC`,
    ...params,
  );
}

export async function createQueueItem(schema: string, input: CreateQueueInput) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "${schema}".group_placement_queue (member_id, name, contact, source, note)
     VALUES ($1::uuid, $2, $3, $4, $5) RETURNING *`,
    input.memberId || null, input.name ?? '', input.contact ?? '', input.source, input.note ?? '',
  );
  return rows[0];
}

/** 큐 항목을 조직에 배치 — group_members 에 넣고 큐 상태를 placed 로. */
export async function placeFromQueue(schema: string, queueId: string, input: PlaceFromQueueInput) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${schema}".group_placement_queue WHERE id = $1::uuid`, queueId);
  const item = rows[0];
  if (!item) return null;
  if (!item.member_id) throw new AppError('NO_MEMBER', 400, '교인으로 등록되지 않은 문의는 먼저 교적에 등록해야 배치할 수 있습니다.');
  await addGroupMember(schema, input.groupId, { memberId: item.member_id, role: input.role, reason: input.reason ?? 'new' });
  const upd = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "${schema}".group_placement_queue SET status = 'placed', placed_group_id = $1::uuid, updated_at = NOW()
     WHERE id = $2::uuid RETURNING *`,
    input.groupId, queueId,
  );
  return upd[0];
}

export async function deleteQueueItem(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`DELETE FROM "${schema}".group_placement_queue WHERE id = $1::uuid RETURNING id`, id);
  return rows.length > 0;
}
