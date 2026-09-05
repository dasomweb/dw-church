import { z } from 'zod';

/**
 * 교적관리 (membership) — Phase 1: 교인 명부(member) · 세대(household) ·
 * 가족관계(relation) · 코드(직분/신급/등록상태 등). 교회 행정 애드온이며 전부
 * 내부(관리자) 전용 — 공개 스토어프론트에 노출되지 않습니다. 클라이언트는
 * camelCase, 테넌트 스키마에는 snake_case 로 저장합니다.
 */

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
  .optional()
  .nullable();

// ── 교인(member) ──────────────────────────────────────────────
export const createMemberSchema = z.object({
  name: z.string().min(1).max(120),
  nameHanja: z.string().max(120).optional().nullable(),
  nameEn: z.string().max(120).optional().nullable(),
  gender: z.enum(['M', 'F', '']).optional().nullable(),
  birthDate: dateStr,
  birthLunar: z.boolean().optional(),
  photoUrl: z.string().max(1000).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  position: z.string().max(60).optional().nullable(),      // 직분
  positionCourtesy: z.boolean().optional(),                // true=타 교회에서 받은 직분(본 교회 임명 아님)
  faithLevel: z.string().max(60).optional().nullable(),    // 신급
  regStatus: z.enum(['active', 'newcomer', 'inactive', 'transferred', 'deceased']).optional(),
  registeredOn: dateStr,
  occupation: z.string().max(120).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  householdId: z.string().uuid().optional().nullable(),
  isHead: z.boolean().optional(),
  userId: z.string().uuid().optional().nullable(),
});
export const updateMemberSchema = createMemberSchema.partial();

export const listMembersQuerySchema = z.object({
  q: z.string().max(200).optional(),               // 이름·전화·이메일 검색
  region: z.string().max(100).optional(),          // 세대 구역
  position: z.string().max(60).optional(),         // 직분
  faithLevel: z.string().max(60).optional(),       // 신급
  regStatus: z.enum(['active', 'newcomer', 'inactive', 'transferred', 'deceased', 'all']).optional(),
  householdId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(2000).optional(),
});

// ── 세대(household) ───────────────────────────────────────────
export const createHouseholdSchema = z.object({
  name: z.string().max(120).optional().nullable(),
  headMemberId: z.string().uuid().optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  region: z.string().max(100).optional().nullable(),       // 구역 (텍스트; 조직 트리는 다음 단계)
  photoUrl: z.string().max(1000).optional().nullable(),
  memo: z.string().max(1000).optional().nullable(),
});
export const updateHouseholdSchema = createHouseholdSchema.partial();

export const listHouseholdsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(2000).optional(),
});

// ── 가족관계(relation) ────────────────────────────────────────
export const createRelationSchema = z.object({
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  relationType: z.enum(['spouse', 'child', 'parent', 'sibling']),
});

// ── 코드(직분/신급/등록상태/심방유형/조직유형) ────────────────
export const CODE_CATEGORIES = ['position', 'faith_level', 'reg_status', 'visit_type', 'org_type', 'sacrament_type'] as const;
export const createCodeSchema = z.object({
  category: z.enum(CODE_CATEGORIES),
  label: z.string().min(1).max(80),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const updateCodeSchema = createCodeSchema.partial().omit({ category: true });

// ── 엑셀(CSV) 가져오기 (MB-05) ────────────────────────────────
export const importMembersSchema = z.object({
  csv: z.string().max(5_000_000).optional(),
  rows: z.array(z.record(z.any())).max(50_000).optional(),
  createHouseholds: z.boolean().optional(),
});

// ── 예배(service) ─────────────────────────────────────────────
export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  weekday: z.string().max(20).optional(),
  time: z.string().max(20).optional(),
  sortOrder: z.number().int().optional(),
});
export const updateServiceSchema = createServiceSchema.partial().extend({ isActive: z.boolean().optional() });

// ── 출석(attendance) ──────────────────────────────────────────
export const recordAttendanceSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recordedBy: z.string().max(120).optional(),
  entries: z.array(z.object({
    memberId: z.string().uuid(),
    status: z.enum(['present', 'absent', 'online']),
  })).max(2000),
});

// ── 심방(visit) ───────────────────────────────────────────────
export const createVisitSchema = z.object({
  memberId: z.string().uuid(),
  visitor: z.string().max(120).optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  visitType: z.string().max(40).optional(),
  content: z.string().max(4000).optional(),
  prayer: z.string().max(2000).optional(),
  followup: z.string().max(2000).optional(),
  visibility: z.enum(['self', 'pastors', 'all']).optional(),
  status: z.enum(['planned', 'done']).optional(),
});
export const updateVisitSchema = createVisitSchema.partial().omit({ memberId: true });

// ── 직분 임명(appointment) — 개별/일괄, 연초 서리집사 임명 등 ──
export const appointMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(1000),
  position: z.string().min(1).max(60),
  courtesy: z.boolean().optional(),                                        // 타 교회에서 받은 직분이면 true
  appointedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  note: z.string().max(300).optional(),
});

// ── 성례(sacrament) ───────────────────────────────────────────
export const createSacramentSchema = z.object({
  memberId: z.string().uuid(),
  sacType: z.string().min(1).max(40),  // 세례·침례·유아세례·헌아식·입교·성찬 등 (교적 코드에서 관리)
  sacDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  officiant: z.string().max(120).optional(),
  place: z.string().max(200).optional(),   // 받은 교회(타교단 포함)
  certNo: z.string().max(60).optional(),
  recognized: z.boolean().optional(),      // 본 교회 인정 여부 (멤버십/직분 요건)
});

// ── 이동(transfer) ────────────────────────────────────────────
export const createTransferSchema = z.object({
  memberId: z.string().uuid(),
  trType: z.enum(['in', 'out', 'dismissal', 'death']),  // 전입·전출·이명·별세
  trDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  counterpart: z.string().max(200).optional(),
  reason: z.string().max(1000).optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
export type ListHouseholdsQuery = z.infer<typeof listHouseholdsQuerySchema>;
export type CreateRelationInput = z.infer<typeof createRelationSchema>;
export type CreateCodeInput = z.infer<typeof createCodeSchema>;
export type UpdateCodeInput = z.infer<typeof updateCodeSchema>;
