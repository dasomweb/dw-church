/**
 * PlanUpgradeModal — friendly paywall surface when a Basic-plan user
 * hits a Pro-only feature (페이지 추가 / AI 생성).
 *
 * Server returns `403 PLAN_UPGRADE_REQUIRED` with a Korean message;
 * the caller catches that error and shows this modal instead of a
 * toast. The CTA either drops the user into the billing page (where
 * they upgrade their plan) or dismisses.
 *
 * Designed reusable: pass `requiredPlans` so the same modal handles
 * both "this needs Pro" and "this needs Enterprise" cases. The
 * `currentPlan` is optional — when set, it nudges the message with
 * "현재 Basic 입니다" line.
 */
import { useNavigate, useParams } from 'react-router-dom';

interface PlanUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;                        // 예: "새 페이지 추가", "AI 페이지 생성"
  requiredPlans: ('pro' | 'enterprise')[];
  currentPlan?: string | null;
}

const PLAN_PRICE_LABEL: Record<string, string> = {
  basic: 'Basic ($99/월)',
  pro: 'Pro ($149/월)',
  enterprise: 'Enterprise (별도 협의)',
};

export function PlanUpgradeModal({
  open,
  onClose,
  feature,
  requiredPlans,
  currentPlan,
}: PlanUpgradeModalProps) {
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();

  if (!open) return null;

  const goBilling = () => {
    onClose();
    navigate(`/t/${slug}/billing`);
  };

  const requiredLabel = requiredPlans.map((p) => PLAN_PRICE_LABEL[p] ?? p).join(' 또는 ');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">⭐</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">플랜 업그레이드 필요</h3>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{feature}</span> 기능은 {requiredLabel} 에서 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {currentPlan && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
            현재 플랜: <span className="font-semibold">{PLAN_PRICE_LABEL[currentPlan] ?? currentPlan}</span>
          </div>
        )}

        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
          <strong>Pro 의 주요 차이:</strong>
          <ul className="mt-1.5 space-y-1 list-disc list-inside">
            <li>새 페이지 무제한 추가</li>
            <li>AI 페이지 생성 기능</li>
            <li>섹션 추가 / 페이지 마법사 전체 사용</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            나중에
          </button>
          <button
            onClick={goBilling}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700"
          >
            업그레이드 페이지로 →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility — check an error response for the PLAN_UPGRADE_REQUIRED code
 * the server's requirePlan() middleware emits. Use in catch blocks:
 *
 *   try {
 *     await apiClient.adapter.post('/pages/generate', {...});
 *   } catch (err) {
 *     if (isPlanUpgradeError(err)) {
 *       setPaywallOpen(true);
 *       return;
 *     }
 *     showToast('error', err.message);
 *   }
 */
export function isPlanUpgradeError(err: unknown): boolean {
  if (typeof err !== 'object' || !err) return false;
  const obj = err as { code?: string; message?: string };
  if (obj.code === 'PLAN_UPGRADE_REQUIRED') return true;
  if (obj.message?.includes('플랜에서 사용할 수 있습니다')) return true;
  if (obj.message?.includes('PLAN_UPGRADE_REQUIRED')) return true;
  return false;
}
