import { prisma } from '../../config/database.js';
import type {
  CreateMemberInput, UpdateMemberInput, ListMembersQuery,
  CreateHouseholdInput, UpdateHouseholdInput, ListHouseholdsQuery,
  CreateRelationInput, CreateCodeInput, UpdateCodeInput,
} from './schema.js';

// camelCase input field → snake_case column.
const MEMBER_COLS: Record<string, string> = {
  name: 'name', nameHanja: 'name_hanja', nameEn: 'name_en', gender: 'gender',
  birthDate: 'birth_date', birthLunar: 'birth_lunar', photoUrl: 'photo_url',
  phone: 'phone', email: 'email', address: 'address', position: 'position',
  faithLevel: 'faith_level', regStatus: 'reg_status', registeredOn: 'registered_on',
  occupation: 'occupation', note: 'note', householdId: 'household_id',
  isHead: 'is_head', userId: 'user_id',
};
const HOUSEHOLD_COLS: Record<string, string> = {
  name: 'name', headMemberId: 'head_member_id', address: 'address', phone: 'phone',
  region: 'region', photoUrl: 'photo_url', memo: 'memo',
};
// Columns cast to ::uuid / ::date so empty strings don't blow up typed columns.
const UUID_COLS = new Set(['household_id', 'head_member_id', 'user_id']);
const DATE_COLS = new Set(['birth_date', 'registered_on']);

function norm(col: string, val: unknown): unknown {
  if ((UUID_COLS.has(col) || DATE_COLS.has(col)) && (val === '' || val === undefined)) return null;
  return val;
}
function cast(col: string): string {
  if (UUID_COLS.has(col)) return '::uuid';
  if (DATE_COLS.has(col)) return '::date';
  return '';
}

async function insertRow(schema: string, table: string, map: Record<string, string>, input: Record<string, unknown>) {
  const cols: string[] = [];
  const ph: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (input[key] === undefined) continue;
    cols.push(`"${col}"`);
    ph.push(`$${i++}${cast(col)}`);
    vals.push(norm(col, input[key]));
  }
  if (cols.length === 0) { cols.push('name'); ph.push('$1'); vals.push(''); } // never-empty guard
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".${table} (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`,
    ...vals,
  );
  return rows[0];
}

async function updateRow(schema: string, table: string, map: Record<string, string>, id: string, input: Record<string, unknown>) {
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (input[key] === undefined) continue;
    set.push(`"${col}" = $${i++}${cast(col)}`);
    vals.push(norm(col, input[key]));
  }
  if (set.length === 0) {
    const cur = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${schema}".${table} WHERE id = $1::uuid`, id);
    return cur[0] ?? null;
  }
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".${table} SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...vals, id,
  );
  return rows[0] ?? null;
}

// ── members ───────────────────────────────────────────────────
export async function listMembers(schema: string, q: ListMembersQuery) {
  const page = q.page ?? 1;
  const perPage = q.perPage ?? 50;
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  const status = q.regStatus ?? 'active';
  if (status !== 'all') { where.push(`m.reg_status = $${i++}`); params.push(status); }
  if (q.position) { where.push(`m.position = $${i++}`); params.push(q.position); }
  if (q.faithLevel) { where.push(`m.faith_level = $${i++}`); params.push(q.faithLevel); }
  if (q.householdId) { where.push(`m.household_id = $${i++}::uuid`); params.push(q.householdId); }
  if (q.region) { where.push(`h.region = $${i++}`); params.push(q.region); }
  if (q.q) { where.push(`(m.name ILIKE $${i} OR m.phone ILIKE $${i} OR m.email ILIKE $${i})`); params.push(`%${q.q}%`); i++; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "${schema}".members m LEFT JOIN "${schema}".households h ON h.id = m.household_id ${whereSql}`,
    ...params,
  );
  const items = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.*, h.name AS household_name, h.region AS household_region
       FROM "${schema}".members m
       LEFT JOIN "${schema}".households h ON h.id = m.household_id
       ${whereSql}
      ORDER BY m.name ASC
      LIMIT $${i++} OFFSET $${i++}`,
    ...params, perPage, (page - 1) * perPage,
  );
  return { items, total: totalRows[0]?.n ?? 0, page, perPage };
}

export async function getMember(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.*, h.name AS household_name, h.region AS household_region
       FROM "${schema}".members m
       LEFT JOIN "${schema}".households h ON h.id = m.household_id
      WHERE m.id = $1::uuid`,
    id,
  );
  const member = rows[0] ?? null;
  if (!member) return null;
  const relations = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT r.id, r.relation_type, r.to_member_id, t.name AS to_member_name, t.photo_url AS to_member_photo
       FROM "${schema}".member_relations r
       JOIN "${schema}".members t ON t.id = r.to_member_id
      WHERE r.from_member_id = $1::uuid
      ORDER BY r.created_at ASC`,
    id,
  );
  return { ...member, relations };
}

export const createMember = (schema: string, input: CreateMemberInput) =>
  insertRow(schema, 'members', MEMBER_COLS, input as Record<string, unknown>);
export const updateMember = (schema: string, id: string, input: UpdateMemberInput) =>
  updateRow(schema, 'members', MEMBER_COLS, id, input as Record<string, unknown>);
export async function deleteMember(schema: string, id: string): Promise<boolean> {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".members WHERE id = $1::uuid`, id);
  return n > 0;
}

export async function memberStats(schema: string) {
  const byStatus = await prisma.$queryRawUnsafe<{ reg_status: string; n: number }[]>(
    `SELECT reg_status, count(*)::int AS n FROM "${schema}".members GROUP BY reg_status`,
  );
  const households = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "${schema}".households`);
  const birthdays = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "${schema}".members
      WHERE birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)`,
  );
  const stat: Record<string, number> = { active: 0, newcomer: 0, inactive: 0, transferred: 0, deceased: 0 };
  for (const r of byStatus) stat[r.reg_status] = r.n;
  const active = stat.active ?? 0;
  const newcomer = stat.newcomer ?? 0;
  const inactive = stat.inactive ?? 0;
  return {
    total: active + newcomer + inactive,   // 재적 (전출·별세 제외)
    active,
    newcomer,
    households: households[0]?.n ?? 0,
    birthdaysThisMonth: birthdays[0]?.n ?? 0,
    byStatus: stat,
  };
}

// ── households ────────────────────────────────────────────────
export async function listHouseholds(schema: string, q: ListHouseholdsQuery) {
  const page = q.page ?? 1;
  const perPage = q.perPage ?? 50;
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (q.region) { where.push(`hh.region = $${i++}`); params.push(q.region); }
  if (q.q) { where.push(`(hh.name ILIKE $${i} OR hh.address ILIKE $${i})`); params.push(`%${q.q}%`); i++; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "${schema}".households hh ${whereSql}`, ...params,
  );
  const items = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT hh.*, head.name AS head_name,
            (SELECT count(*)::int FROM "${schema}".members mm WHERE mm.household_id = hh.id) AS member_count
       FROM "${schema}".households hh
       LEFT JOIN "${schema}".members head ON head.id = hh.head_member_id
       ${whereSql}
      ORDER BY hh.name ASC, hh.created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
    ...params, perPage, (page - 1) * perPage,
  );
  return { items, total: totalRows[0]?.n ?? 0, page, perPage };
}

export async function getHousehold(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".households WHERE id = $1::uuid`, id,
  );
  const hh = rows[0] ?? null;
  if (!hh) return null;
  const members = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, name, position, faith_level, gender, birth_date, phone, photo_url, is_head
       FROM "${schema}".members WHERE household_id = $1::uuid ORDER BY is_head DESC, name ASC`,
    id,
  );
  return { ...hh, members };
}

export const createHousehold = (schema: string, input: CreateHouseholdInput) =>
  insertRow(schema, 'households', HOUSEHOLD_COLS, input as Record<string, unknown>);
export const updateHousehold = (schema: string, id: string, input: UpdateHouseholdInput) =>
  updateRow(schema, 'households', HOUSEHOLD_COLS, id, input as Record<string, unknown>);
export async function deleteHousehold(schema: string, id: string): Promise<boolean> {
  // members.household_id → ON DELETE SET NULL keeps the members (un-householded).
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".households WHERE id = $1::uuid`, id);
  return n > 0;
}

// ── relations ─────────────────────────────────────────────────
const RECIPROCAL: Record<string, string> = { spouse: 'spouse', parent: 'child', child: 'parent', sibling: 'sibling' };

export async function createRelation(schema: string, input: CreateRelationInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".member_relations (from_member_id, to_member_id, relation_type)
     VALUES ($1::uuid, $2::uuid, $3) RETURNING *`,
    input.fromMemberId, input.toMemberId, input.relationType,
  );
  // Mirror the reciprocal edge so both cards show the relationship.
  const recip = RECIPROCAL[input.relationType];
  if (recip) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".member_relations (from_member_id, to_member_id, relation_type)
       VALUES ($1::uuid, $2::uuid, $3) ON CONFLICT DO NOTHING`,
      input.toMemberId, input.fromMemberId, recip,
    ).catch(() => { /* no unique constraint → duplicates avoided at app level */ });
  }
  return rows[0];
}

export async function deleteRelation(schema: string, id: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `DELETE FROM "${schema}".member_relations WHERE id = $1::uuid RETURNING from_member_id, to_member_id, relation_type`, id,
  );
  const r = rows[0];
  if (r) {
    // remove the mirrored edge too
    await prisma.$executeRawUnsafe(
      `DELETE FROM "${schema}".member_relations WHERE from_member_id = $1::uuid AND to_member_id = $2::uuid`,
      r.to_member_id, r.from_member_id,
    ).catch(() => {});
  }
  return !!r;
}

// ── codes ─────────────────────────────────────────────────────
export async function listCodes(schema: string, category?: string) {
  if (category) {
    return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".member_codes WHERE category = $1 ORDER BY sort_order ASC, label ASC`, category,
    );
  }
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".member_codes ORDER BY category ASC, sort_order ASC, label ASC`,
  );
}
export async function createCode(schema: string, input: CreateCodeInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".member_codes (category, label, sort_order, is_active)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    input.category, input.label, input.sortOrder ?? 0, input.isActive ?? true,
  );
  return rows[0];
}
export async function updateCode(schema: string, id: string, input: UpdateCodeInput) {
  // member_codes has no updated_at column, so don't use the generic updateRow.
  const map: Record<string, string> = { label: 'label', sortOrder: 'sort_order', isActive: 'is_active' };
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if ((input as Record<string, unknown>)[key] === undefined) continue;
    set.push(`"${col}" = $${i++}`);
    vals.push((input as Record<string, unknown>)[key]);
  }
  if (set.length === 0) {
    const cur = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${schema}".member_codes WHERE id = $1::uuid`, id);
    return cur[0] ?? null;
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".member_codes SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...vals, id,
  );
  return rows[0] ?? null;
}
export async function deleteCode(schema: string, id: string): Promise<boolean> {
  const n = await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".member_codes WHERE id = $1::uuid`, id);
  return n > 0;
}

// Seed a tenant's default code lists on first use (idempotent — skips if any exist).
const DEFAULT_CODES: Array<[string, string[]]> = [
  ['position', ['담임목사', '부목사', '전도사', '장로', '권사', '안수집사', '집사', '성도']],
  ['faith_level', ['세례', '유아세례', '입교', '학습', '원입']],
  ['reg_status', ['정착', '새가족', '장기결석', '전출', '별세']],
  ['visit_type', ['심방', '전화심방', '상담']],
  ['org_type', ['구역', '부서', '기관', '교회학교']],
];
export async function seedCodesIfEmpty(schema: string): Promise<number> {
  const existing = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "${schema}".member_codes`);
  if ((existing[0]?.n ?? 0) > 0) return 0;
  let seeded = 0;
  for (const [category, labels] of DEFAULT_CODES) {
    for (let s = 0; s < labels.length; s++) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".member_codes (category, label, sort_order) VALUES ($1, $2, $3)`,
        category, labels[s], s,
      );
      seeded++;
    }
  }
  return seeded;
}
