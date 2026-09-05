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

// ── 모임 리포트 (meeting_reports) — STEP 2 ────────────────
const attStatusEnum = z.enum(['present', 'absent', 'online']);
const reportAttendanceSchema = z.object({
  memberId: z.string().uuid(),
  status: attStatusEnum.default('present'),
  broughtNewcomer: z.boolean().optional(),
});

/** 리포트 작성/저장 — (group_id, meeting_date) 기준 upsert. 임시저장 or 제출. */
export const upsertReportSchema = z.object({
  groupId: z.string().uuid(),
  meetingDate: z.string().min(8), // YYYY-MM-DD
  author: z.string().max(120).optional(),
  status: z.enum(['draft', 'submitted']).default('draft'),
  items: z.record(z.string(), z.any()).optional(),        // 공개 항목값 (나눔·기도제목 …)
  privateItems: z.record(z.string(), z.any()).optional(), // 교역자만 열람 (돌봄 요청)
  attendance: z.array(reportAttendanceSchema).max(500).optional(),
  newcomerCount: z.number().int().min(0).max(999).optional(),
});

/** 교역자 확인(RP-03/04) — 확인자·코멘트. */
export const confirmReportSchema = z.object({
  confirmer: z.string().max(120).optional(),
  confirmComment: z.string().max(2000).optional(),
  unconfirm: z.boolean().optional(), // true 면 확인 취소(다시 submitted)
});

export const listReportsQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'confirmed', 'all']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const monitoringQuerySchema = z.object({
  parentId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(26).optional(),
});

export type UpsertReportInput = z.infer<typeof upsertReportSchema>;
export type ConfirmReportInput = z.infer<typeof confirmReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type MonitoringQuery = z.infer<typeof monitoringQuerySchema>;

// ── 교육 과정 · 차수 · 수강 · 출결 (STEP 3) ────────────────
const requiredEnum = z.enum(['required', 'optional', 'leader', 'none']);

export const createCourseSchema = z.object({
  name: z.string().min(1).max(80),
  stage: z.string().max(20).optional(),
  prereqCourseId: z.string().uuid().nullable().optional(),
  totalSessions: z.number().int().min(1).max(60).default(8),
  criteria: z.number().int().min(0).max(60).default(6),
  required: requiredEnum.default('optional'),
  target: z.array(z.string().max(40)).max(20).optional(),
  recordHistory: z.boolean().optional(),
  autoQueue: z.boolean().optional(),
  certEnabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const updateCourseSchema = createCourseSchema.partial();

export const createTermSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().max(60).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  weekday: z.string().max(20).optional(),
  time: z.string().max(20).optional(),
  place: z.string().max(200).optional(),
  instructor: z.string().max(120).optional(),
  capacity: z.number().int().min(0).max(999).optional(),
  status: z.enum(['planned', 'ongoing', 'done']).optional(),
});
export const updateTermSchema = createTermSchema.omit({ courseId: true }).partial();

export const enrollSchema = z.object({
  termId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1).max(200),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(['applied', 'enrolled', 'completed', 'dropped']).optional(),
  waitlist: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

/** 회차 출결 일괄 기록 — enrollmentId 별 sessionNo 상태. */
export const recordSessionSchema = z.object({
  entries: z.array(z.object({
    enrollmentId: z.string().uuid(),
    sessionNo: z.number().int().min(1).max(60),
    status: z.enum(['present', 'absent', 'makeup']),
  })).min(1).max(2000),
});

/** 수료 확정 — 기준 충족자만(기본) 또는 지정 enrollmentIds(예외 승인 포함). */
export const completeTermSchema = z.object({
  enrollmentIds: z.array(z.string().uuid()).max(500).optional(),
  overrideBelow: z.boolean().optional(), // 기준 미달자도 강제 수료(예외 승인)
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateTermInput = z.infer<typeof createTermSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
export type EnrollInput = z.infer<typeof enrollSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type RecordSessionInput = z.infer<typeof recordSessionSchema>;
export type CompleteTermInput = z.infer<typeof completeTermSchema>;

export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type AssignMembersInput = z.infer<typeof assignMembersSchema>;
export type UpdateGroupMemberInput = z.infer<typeof updateGroupMemberSchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type PlaceFromQueueInput = z.infer<typeof placeFromQueueSchema>;
