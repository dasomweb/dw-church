import { useState, useEffect } from 'react';
import { useBillingStatus, useBillingCheckout, useBillingPortal } from '@dw-church/api-client';

interface PlanFeature {
  label: string;
  free: string | boolean;
  basic: string | boolean;
  pro: string | boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  { label: '페이지', free: '1개', basic: '무제한', pro: '무제한' },
  { label: '설교', free: '50개', basic: '무제한', pro: '무제한' },
  { label: '앨범', free: '10개', basic: '무제한', pro: '무제한' },
  { label: '테마', free: '기본', basic: '전체', pro: '전체' },
  { label: '커스텀 도메인', free: false, basic: true, pro: true },
  { label: '우선 지원', free: false, basic: false, pro: true },
  { label: '고급 분석', free: false, basic: false, pro: true },
];

const PLAN_INFO: Record<string, { name: string; price: string; description: string }> = {
  free: { name: 'Free', price: '무료', description: '시작하기 좋은 기본 플랜' },
  basic: { name: 'Basic', price: '$19/월', description: '성장하는 교회를 위한 플랜' },
  pro: { name: 'Pro', price: '$49/월', description: '모든 기능을 활용하는 프로 플랜' },
};

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function BillingPage() {
  const { data: billing, isLoading, error } = useBillingStatus();
  const checkoutMutation = useBillingCheckout();
  const portalMutation = useBillingPortal();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // If the billing API returns 503 (not configured), show graceful message
  const isNotConfigured =
    error && 'status' in error && (error as { status: number }).status === 503;

  if (isNotConfigured) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            결제 시스템 준비 중
          </h2>
          <p className="text-yellow-700">
            결제 시스템이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const currentPlan = billing?.plan ?? 'free';
  const subscriptionStatus = billing?.subscriptionStatus;
  const currentPeriodEnd = billing?.currentPeriodEnd;

  const handleUpgrade = async (plan: string) => {
    try {
      const baseUrl = window.location.origin;
      const result = await checkoutMutation.mutateAsync({
        plan,
        successUrl: `${baseUrl}/billing?success=true`,
        cancelUrl: `${baseUrl}/billing?canceled=true`,
      });
      window.location.href = result.url;
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'body' in err
          ? String((err as { body: string }).body)
          : '결제 세션을 생성하지 못했습니다.';
      setToast({ message, type: 'error' });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await portalMutation.mutateAsync(
        `${window.location.origin}/billing`,
      );
      window.location.href = result.url;
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'body' in err
          ? String((err as { body: string }).body)
          : '구독 관리 페이지를 열 수 없습니다.';
      setToast({ message, type: 'error' });
    }
  };

  // Check for success/cancel query params
  const params = new URLSearchParams(window.location.search);
  const showSuccess = params.get('success') === 'true';
  const showCanceled = params.get('canceled') === 'true';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Success / Cancel banners */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800 text-sm">구독이 완료되었습니다! 잠시 후 반영됩니다.</p>
        </div>
      )}
      {showCanceled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-yellow-800 text-sm">결제가 취소되었습니다.</p>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">현재 플랜</h2>
            <div className="mt-1 flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                currentPlan === 'pro'
                  ? 'bg-purple-100 text-purple-700'
                  : currentPlan === 'basic'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                {PLAN_INFO[currentPlan]?.name ?? currentPlan}
              </span>
              {subscriptionStatus && (
                <span className={`text-sm ${
                  subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
                    ? 'text-green-600'
                    : 'text-yellow-600'
                }`}>
                  {subscriptionStatus === 'active' ? '활성' :
                    subscriptionStatus === 'trialing' ? '체험 중' :
                      subscriptionStatus === 'past_due' ? '결제 연체' :
                        subscriptionStatus}
                </span>
              )}
            </div>
            {currentPeriodEnd && (
              <p className="mt-1 text-sm text-gray-500">
                다음 결제일: {new Date(currentPeriodEnd).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
          {currentPlan !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={portalMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {portalMutation.isPending ? '이동 중...' : '구독 관리'}
            </button>
          )}
        </div>
      </div>

      {/* Plan comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">플랜 비교</h2>
          <p className="text-sm text-gray-500 mt-1">교회에 맞는 플랜을 선택하세요</p>
        </div>

        {/* Plan headers */}
        <div className="grid grid-cols-4 border-b border-gray-100">
          <div className="p-4" />
          {(['free', 'basic', 'pro'] as const).map((plan) => (
            <div key={plan} className={`p-4 text-center ${currentPlan === plan ? 'bg-blue-50' : ''}`}>
              <h3 className="font-semibold text-gray-900">{PLAN_INFO[plan].name}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{PLAN_INFO[plan].price}</p>
              <p className="text-xs text-gray-500 mt-1">{PLAN_INFO[plan].description}</p>
            </div>
          ))}
        </div>

        {/* Feature rows */}
        {PLAN_FEATURES.map((feature, idx) => (
          <div
            key={feature.label}
            className={`grid grid-cols-4 ${idx < PLAN_FEATURES.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <div className="p-4 text-sm font-medium text-gray-700">{feature.label}</div>
            {(['free', 'basic', 'pro'] as const).map((plan) => {
              const value = feature[plan];
              return (
                <div
                  key={plan}
                  className={`p-4 text-center text-sm ${currentPlan === plan ? 'bg-blue-50' : ''}`}
                >
                  {typeof value === 'boolean' ? (
                    value ? <CheckIcon /> : <XIcon />
                  ) : (
                    <span className="text-gray-700">{value}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Action row */}
        <div className="grid grid-cols-4 border-t border-gray-200 bg-gray-50">
          <div className="p-4" />
          {(['free', 'basic', 'pro'] as const).map((plan) => (
            <div key={plan} className="p-4 text-center">
              {currentPlan === plan ? (
                <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-gray-200 rounded-lg cursor-default">
                  현재 플랜
                </span>
              ) : plan === 'free' ? (
                currentPlan !== 'free' ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalMutation.isPending}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    다운그레이드
                  </button>
                ) : null
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={checkoutMutation.isPending}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                    plan === 'pro'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {checkoutMutation.isPending ? '처리 중...' : '업그레이드'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
