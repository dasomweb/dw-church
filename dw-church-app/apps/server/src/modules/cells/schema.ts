import { z } from 'zod';

/**
 * 목장(셀) — small-group content module (Plus/Pro tiers).
 * One row per 목장: its name, leader, when/where it meets, and a short blurb.
 * Camel-cased on the client; stored snake_case in the tenant schema.
 */
export const createCellSchema = z.object({
  name: z.string().min(1).max(200), // 목장 이름 (e.g. "사랑목장")
  leaderName: z.string().max(100).optional().nullable(), // 목자/리더 이름
  leaderRole: z.string().max(100).optional().nullable(), // 직분 (예: 목자, 순장)
  region: z.string().max(100).optional().nullable(), // 지역/구역
  meetingDay: z.string().max(50).optional().nullable(), // 모임 요일 (예: 매주 금요일)
  meetingTime: z.string().max(50).optional().nullable(), // 모임 시간 (예: 오후 7:30)
  location: z.string().max(255).optional().nullable(), // 모임 장소
  contact: z.string().max(50).optional().nullable(), // 연락처
  description: z.string().max(5000).optional().nullable(), // 소개글
  photoUrl: z.string().url().max(1000).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export const updateCellSchema = createCellSchema.partial();

export type CreateCellInput = z.infer<typeof createCellSchema>;
export type UpdateCellInput = z.infer<typeof updateCellSchema>;
