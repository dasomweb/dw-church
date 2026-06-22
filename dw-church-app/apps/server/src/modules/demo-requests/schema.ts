import { z } from 'zod';

/**
 * 데모 체험 신청 (demo request).
 *
 * Platform-level (public schema) — prospects asking to try the demo tenant.
 * Flow: 공개 신청서 제출 → 슈퍼어드민 CRM 인박스 → 접속정보(공유 데모 계정) 발송.
 */
export const DEMO_REQUEST_STATUSES = ['new', 'contacted', 'sent', 'archived'] as const;

export const createDemoRequestSchema = z.object({
  name: z.string().min(1).max(100),
  churchName: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export const updateDemoRequestSchema = z.object({
  status: z.enum(DEMO_REQUEST_STATUSES).optional(),
  memo: z.string().max(5000).optional().nullable(),
});

// Shared demo-account access info the super-admin sends to applicants.
export const demoConfigSchema = z.object({
  loginUrl: z.string().max(500).optional().nullable(),
  loginEmail: z.string().max(200).optional().nullable(),
  loginPassword: z.string().max(200).optional().nullable(),
  messageBody: z.string().max(5000).optional().nullable(),
});

export type CreateDemoRequestInput = z.infer<typeof createDemoRequestSchema>;
export type UpdateDemoRequestInput = z.infer<typeof updateDemoRequestSchema>;
export type DemoConfigInput = z.infer<typeof demoConfigSchema>;
