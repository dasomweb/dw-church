import { z } from 'zod';

/**
 * 새가족 등록 — public intake form + admin management (Pro tier).
 * The PUBLIC submission (createNewcomerSchema) is intentionally lenient: only a
 * name is required so the form never blocks a sincere visitor. Admin-only fields
 * (status / memo) live in updateNewcomerSchema.
 */
export const NEWCOMER_STATUSES = ['new', 'contacted', 'registered', 'archived'] as const;

export const createNewcomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  birthDate: z.string().max(40).optional().nullable(), // free-form (생년월일/연령대)
  gender: z.string().max(20).optional().nullable(),
  prevChurch: z.string().max(200).optional().nullable(), // 이전 교회
  visitPath: z.string().max(300).optional().nullable(), // 어떻게 오게 되셨나요
  faithStatus: z.string().max(100).optional().nullable(), // 신앙 상태 (초신자/기신자 등)
  familyInfo: z.string().max(1000).optional().nullable(), // 동반 가족
  prayerRequest: z.string().max(2000).optional().nullable(), // 기도 제목
});

export const updateNewcomerSchema = z.object({
  status: z.enum(NEWCOMER_STATUSES).optional(),
  memo: z.string().max(2000).optional().nullable(), // 교역자 메모
  // Admins may also correct the submitted fields.
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  birthDate: z.string().max(40).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  prevChurch: z.string().max(200).optional().nullable(),
  visitPath: z.string().max(300).optional().nullable(),
  faithStatus: z.string().max(100).optional().nullable(),
  familyInfo: z.string().max(1000).optional().nullable(),
  prayerRequest: z.string().max(2000).optional().nullable(),
});

export type CreateNewcomerInput = z.infer<typeof createNewcomerSchema>;
export type UpdateNewcomerInput = z.infer<typeof updateNewcomerSchema>;
