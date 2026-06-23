// Shared plan constants for the super-admin dashboard.

// 결제 모델 (2026-06-01 확정): Free 없음. Basic = 콘텐츠 편집만, Pro = + 페이지 추가,
// Enterprise = 별도 협의 (가격 노출 안 함, MRR 계산은 0 처리).
// "free" 키는 기존 데이터 호환용으로 남겨두지만 가격 0 + 회색 처리.
export const PLAN_PRICES: Record<string, number> = { basic: 99, pro: 149, enterprise: 0, free: 0 };

export const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-amber-100 text-amber-700',
  pro: 'bg-purple-100 text-purple-700',
  basic: 'bg-blue-100 text-blue-700',
  free: 'bg-gray-100 text-gray-600',
};
