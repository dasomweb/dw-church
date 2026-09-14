/**
 * 자동 견적 — 신청서에서 고른 구성으로 요금을 계산한다. 가격 SoT는 정리된 세 테이블:
 *   plan_pricing(구독 $99, 감면 $39) · setup_pricing(구축 범위 $600/900/1400, 감면 $200)
 *   · feature_pricing(행정 애드온 개별 단가). 값은 슈퍼어드민 요금 관리에서 조정.
 * 화면 미리보기(POST /applications/quote)와 제출 저장(quote 스냅샷) 모두 이걸 쓴다.
 */
import { prisma } from '../../config/database.js';

export interface QuoteInput {
  buildScope?: string | null; // 'new' | 'departments' | 'migration'
  addons?: string[] | null; // feature_key[]
  subsidyRequested?: boolean | null;
}
export interface QuoteLine { key: string; label: string; amount: number }
export interface Quote {
  subsidy: boolean;
  subscriptionMonthly: number;
  subscriptionLabel: string;
  setupOneTime: number;
  setupLabel: string;
  setupFrom: boolean; // "…부터" (이관 등 변동가)
  addons: QuoteLine[];
  addonsMonthly: number;
  monthlyTotal: number; // 구독 + 애드온
  oneTimeTotal: number; // 초기 구축
  currency: 'USD';
}

const SUBSIDY_MONTHLY = 39; // 개척·미자립 첫 1년
const SUBSIDY_SETUP_KEY = 'subsidy_setup';

export async function computeQuote(input: QuoteInput): Promise<Quote> {
  const subsidy = !!input.subsidyRequested;

  // 구독료
  const planRows = await prisma.$queryRawUnsafe<{ monthly: number; label: string }[]>(
    `SELECT monthly, label FROM public.plan_pricing WHERE plan_key='basic' AND is_active=true LIMIT 1`,
  );
  const baseMonthly = Number(planRows[0]?.monthly ?? 99);
  const subscriptionMonthly = subsidy ? SUBSIDY_MONTHLY : baseMonthly;
  const subscriptionLabel = subsidy ? '개척·미자립 지원 (첫 1년)' : (planRows[0]?.label ?? '홈페이지 구독');

  // 초기 구축 (감면이면 subsidy_setup, 아니면 고른 범위)
  const setupKey = subsidy ? SUBSIDY_SETUP_KEY : (input.buildScope || 'new');
  const setupRows = await prisma.$queryRawUnsafe<{ price: number; label: string; from_price: boolean }[]>(
    `SELECT price, label, from_price FROM public.setup_pricing WHERE scope_key=$1 AND is_active=true LIMIT 1`,
    setupKey,
  );
  const setupOneTime = Number(setupRows[0]?.price ?? 0);
  const setupLabel = setupRows[0]?.label ?? '';
  const setupFrom = !!setupRows[0]?.from_price;

  // 행정 애드온
  const keys = (input.addons || []).filter((k): k is string => !!k);
  let addons: QuoteLine[] = [];
  if (keys.length > 0) {
    const rows = await prisma.$queryRawUnsafe<{ feature_key: string; label: string; monthly: number }[]>(
      `SELECT feature_key, label, monthly FROM public.feature_pricing WHERE feature_key = ANY($1::text[]) AND is_active=true ORDER BY sort_order`,
      keys,
    );
    addons = rows.map((r) => ({ key: r.feature_key, label: r.label, amount: Number(r.monthly) }));
  }
  const addonsMonthly = addons.reduce((a, l) => a + l.amount, 0);

  return {
    subsidy,
    subscriptionMonthly,
    subscriptionLabel,
    setupOneTime,
    setupLabel,
    setupFrom,
    addons,
    addonsMonthly,
    monthlyTotal: subscriptionMonthly + addonsMonthly,
    oneTimeTotal: setupOneTime,
    currency: 'USD',
  };
}
