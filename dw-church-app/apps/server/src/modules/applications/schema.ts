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
// 교회 개척/사역 유형 (Send Network 모델) — 교회마다 우선 사역 지향점이 달라
// AI 빌더가 콘텐츠를 그 유형에 맞춰 생성한다.
export const APPLICATION_PLANTING_TYPES = ['standard', 'covocational', 'multisite', 'multiethnic', 'replant', 'micro', 'other'] as const;

// Public submission — only church name + a way to reach them are required.
export const createApplicationSchema = z.object({
  churchName: z.string().min(1).max(200),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  churchAddress: z.string().max(500).optional().nullable(),
  denomination: z.string().max(200).optional().nullable(), // 소속 교단 (인정 교단 = 패스트트랙)
  faithAffirmed: z.boolean().optional(), // 정통 신앙고백 동의 (자격 요건)
  termsAccepted: z.boolean().optional(), // 이용약관·신앙고백 클릭랩 동의 (끝까지 읽고 동의)
  plan: z.enum(APPLICATION_PLANS).optional().nullable(),
  billingPeriod: z.enum(['monthly', 'yearly']).optional().nullable(),
  existingUrl: z.string().max(500).optional().nullable(), // 기존 웹사이트 (마이그레이션용)
  desiredDomain: z.string().max(255).optional().nullable(),
  message: z.string().max(5000).optional().nullable(), // 교회 소개 / 요청사항
  plantingType: z.enum(APPLICATION_PLANTING_TYPES).optional().nullable(), // 개척/사역 유형
  memberProfile: z.string().max(1000).optional().nullable(), // 교회 구성원 (연령대·주재원/한국 신규 유입 등)
  localContext: z.string().max(1000).optional().nullable(), // 지역 환경 (학군·대학·한인 기업 등)
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
