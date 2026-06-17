import { z } from 'zod';

/**
 * 참조 교단 데이터 — 이단/사이비 필터링의 보조 장치.
 *
 * status:
 *   recognized = 정규(정통) 교단 → 신청 시 "✓ 정규 교단" 배지
 *   watch      = 주의 필요(불명확/혼합) → "? 확인 필요"
 *   cult       = 이단/사이비로 널리 규정된 단체 → "🚩 이단 의심"
 *
 * 이 데이터는 *보조*일 뿐, 최종 판단은 슈퍼어드민이 합니다(법적 안전 + 오탐 방지).
 * 코드 하드코딩이 아니라 슈퍼어드민이 관리하는 참조 테이블로 둡니다.
 */
export const DENOM_STATUSES = ['recognized', 'watch', 'cult'] as const;
export type DenomStatus = (typeof DENOM_STATUSES)[number];

export const createRefDenomSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().max(8).optional().nullable(), // 'KR' | 'US' | '' (공통)
  status: z.enum(DENOM_STATUSES),
  note: z.string().max(1000).optional().nullable(),
});

export const updateRefDenomSchema = createRefDenomSchema.partial();

export type CreateRefDenomInput = z.infer<typeof createRefDenomSchema>;
export type UpdateRefDenomInput = z.infer<typeof updateRefDenomSchema>;
