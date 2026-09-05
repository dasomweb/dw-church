import { z } from 'zod';

/** 스몰그룹 STEP 1 (골격: 프리셋 + 조직) 입력 스키마. camelCase 로 받아 서비스에서 snake 매핑. */

const modelEnum = z.enum(['A', 'B', 'C', 'D']);

const levelDefSchema = z.object({
  level: z.number().int().min(1).max(3),
  name: z.string().min(1).max(40),
  leaderTitle: z.string().max(40).default(''),
  leaderRequired: z.boolean().default(false),
});

const terminologySchema = z.object({
  org: z.string().max(40),
  leader: z.string().max(40),
  subleader: z.string().max(40),
  member: z.string().max(40),
  meeting: z.string().max(40),
  report: z.string().max(40),
  finder: z.string().max(40),
}).partial();

const reportItemSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  type: z.enum(['attendance', 'number', 'text', 'textarea', 'list']),
  private: z.boolean().optional(),
});

const courseSeedSchema = z.object({
  name: z.string().min(1).max(80),
  stage: z.string().max(20).default(''),
  sessions: z.number().int().min(1).max(60),
  criteria: z.number().int().min(0).max(60),
  required: z.enum(['required', 'optional', 'leader']),
});

/** SG-01 운영 모델 설정 — 프리셋 개별 수정. */
export const updatePresetSchema = z.object({
  model: modelEnum.optional(),
  levelDefs: z.array(levelDefSchema).max(3).optional(),
  terminology: terminologySchema.optional(),
  allowMulti: z.boolean().optional(),
  reportItems: z.array(reportItemSchema).max(20).optional(),
  courseSet: z.array(courseSeedSchema).max(30).optional(),
  metrics: z.array(z.string().max(40)).max(12).optional(),
  isConfigured: z.boolean().optional(),
});

/** 프리셋을 특정 모델 기본값으로 초기화 (용어·계층·리포트·과정 전부 리셋). */
export const applyPresetSchema = z.object({ model: modelEnum });

// ── 조직(groups) ──────────────────────────────────────────
export const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  level: z.number().int().min(1).max(3).default(1),
  parentId: z.string().uuid().nullable().optional(),
  leaderMemberId: z.string().uuid().nullable().optional(),
  subleaderMemberId: z.string().uuid().nullable().optional(),
  meetingDay: z.string().max(20).optional(),
  meetingTime: z.string().max(20).optional(),
  meetingPlace: z.string().max(200).optional(),
  status: z.enum(['active', 'paused', 'closed']).optional(),
  originGroupId: z.string().uuid().nullable().optional(),
  year: z.number().int().min(1900).max(2200).nullable().optional(),
  region: z.string().max(100).optional(),
  intro: z.string().max(2000).optional(),
  photoUrl: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const listGroupsQuerySchema = z.object({
  status: z.enum(['active', 'paused', 'closed', 'all']).optional(),
  level: z.coerce.number().int().min(1).max(3).optional(),
  parentId: z.string().uuid().optional(),
  leaderMemberId: z.string().uuid().optional(),
  q: z.string().max(120).optional(),
  isPublic: z.coerce.boolean().optional(),
});

// ── 소속(group_members) ───────────────────────────────────
const roleEnum = z.enum(['leader', 'subleader', 'member', 'preleader']);
const reasonEnum = z.enum(['new', 'reorg', 'move', 'request', 'disband', 'other', '']);

export const addGroupMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: roleEnum.default('member'),
  reason: reasonEnum.optional(),
  startDate: z.string().optional(),
  isTemporary: z.boolean().optional(),
});

/** 명단 일괄 배정 (GR-02) — 여러 교인을 한 조직에 붙인다. */
export const assignMembersSchema = z.object({
  groupId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1).max(500),
  role: roleEnum.default('member'),
  reason: reasonEnum.optional(),
  isTemporary: z.boolean().optional(),
});

export const updateGroupMemberSchema = z.object({
  role: roleEnum.optional(),
  reason: reasonEnum.optional(),
  endDate: z.string().nullable().optional(),
  isTemporary: z.boolean().optional(),
});

// ── 배치 대기 큐(group_placement_queue) ───────────────────
export const createQueueSchema = z.object({
  memberId: z.string().uuid().nullable().optional(),
  name: z.string().max(120).optional(),
  contact: z.string().max(200).optional(),
  source: z.enum(['course', 'inquiry', 'transfer', 'manual']).default('manual'),
  note: z.string().max(1000).optional(),
});

export const placeFromQueueSchema = z.object({
  groupId: z.string().uuid(),
  role: roleEnum.default('member'),
  reason: reasonEnum.optional(),
});

export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type AssignMembersInput = z.infer<typeof assignMembersSchema>;
export type UpdateGroupMemberInput = z.infer<typeof updateGroupMemberSchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type PlaceFromQueueInput = z.infer<typeof placeFromQueueSchema>;
