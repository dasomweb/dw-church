import { z } from 'zod';

/**
 * 웹사이트 개발 신청서 (service application / build request).
 *
 * Platform-level (public schema) — these are PROSPECTS who don't have a tenant
 * yet. Flow: 공개 신청서 제출 → 슈퍼어드민 검토 → 승인 + 결제링크 발송 →
 * 결제 → 테넌트 생성(converted).
 */
export const APPLICATION_STATUSES = ['new', 'reviewing', 'approved', 'paid', 'converted', 'rejected'] as const;
export const APPLICATION_PLANS = ['light', 'basic', 'plus', 'pro'] as const;

// Public submission — only church name + a way to reach them are required.
export const createApplicationSchema = z.object({
  churchName: z.string().min(1).max(200),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  churchAddress: z.string().max(500).optional().nullable(),
  denomination: z.string().max(200).optional().nullable(), // 소속 교단 (인정 교단 = 패스트트랙)
  faithAffirmed: z.boolean().optional(), // 정통 신앙고백 동의 (자격 요건)
  plan: z.enum(APPLICATION_PLANS).optional().nullable(),
  billingPeriod: z.enum(['monthly', 'yearly']).optional().nullable(),
  existingUrl: z.string().max(500).optional().nullable(), // 기존 웹사이트 (마이그레이션용)
  desiredDomain: z.string().max(255).optional().nullable(),
  message: z.string().max(5000).optional().nullable(), // 교회 소개 / 요청사항
});

// Super-admin updates: workflow status, internal note, the payment link to send.
export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  adminNote: z.string().max(5000).optional().nullable(),
  paymentLink: z.string().max(1000).optional().nullable(),
  churchAddress: z.string().max(500).optional().nullable(),
  denomination: z.string().max(200).optional().nullable(),
  faithAffirmed: z.boolean().optional(),
  denominationVerified: z.boolean().optional(), // 슈퍼어드민 "정통 교단 확인" 체크
  // When true, email the paymentLink to the applicant (and set status=approved).
  sendPaymentLink: z.boolean().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
