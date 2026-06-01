import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

interface SubscriptionInfo {
  status: string;
  interval: 'month' | 'year' | null;
  amountCents: number;
  currency: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  productName: string | null;
}

interface InvoiceItem {
  id: string;
  date: string;
  description: string;
  status: string;
  amountCents: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

interface BillingInfo {
  plan: string;
  isActive: boolean;
  hasStripeCustomer: boolean;
  subscription: SubscriptionInfo | null;
  invoices: InvoiceItem[];
}

const PLAN_META: Record<string, { name: string; tagline: string }> = {
  free:       { name: 'Free',       tagline: '시작하기 좋은 무료 플랜' },
  basic:      { name: 'Basic',      tagline: '소규모 교회를 위한 기본 기능' },
  pro:        { name: 'Pro',        tagline: '중대형 교회용 — 무제한 콘텐츠 + AI' },
  enterprise: { name: 'Enterprise', tagline: '맞춤 계약 플랜' },
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  paid:           { label: '결제 완료', cls: 'bg-green-100 text-green-700' },
  open:           { label: '미결제',    cls: 'bg-amber-100 text-amber-700' },
  draft:          { label: '초안',      cls: 'bg-gray-100 text-gray-700' },
  void:           { label: '취소',      cls: 'bg-gray-100 text-gray-500' },
  uncollectible:  { label: '회수불가',  cls: 'bg-red-100 text-red-700' },
};

function formatMoney(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  // Most users will be in USD; fall back to plain number if currency unknown.
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function BillingPage() {
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);
  const token = session?.accessToken;
  const { slug = '' } = useParams<{ slug: string }>();

  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState<string>('all');

  const headers = { Authorization: `Bearer ${token || ''}` };
  const billingPath = `/t/${slug}/billing`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/billing/info', { headers });
        if (!res.ok) throw new Error('billing info load failed');
        const json = (await res.json()) as { data: BillingInfo };
        if (!cancelled) setInfo(json.data);
      } catch {
        if (!cancelled) showToast('error', '결제 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [token]);

  const handleManageInStripe = async () => {
    if (!info?.hasStripeCustomer) {
      showToast('error', '먼저 플랜을 구독해주세요.');
      return;
    }
    setRedirecting(true);
    try {
      const res = await fetch('/api/v1/billing/portal', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: `${window.location.origin}${billingPath}` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || 'Portal 생성 실패');
      }
      const json = await res.json() as { url: string };
      window.location.href = json.url;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Portal 열기 실패');
      setRedirecting(false);
    }
  };

  // Group invoices by month for the dropdown filter (descending — newest first)
  const invoiceMonths = useMemo(() => {
    if (!info?.invoices) return [];
    const set = new Set<string>();
    for (const inv of info.invoices) {
      const d = new Date(inv.date);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(ym);
    }
    return Array.from(set).sort().reverse();
  }, [info]);

  const visibleInvoices = useMemo(() => {
    if (!info?.invoices) return [];
    if (invoiceMonth === 'all') return info.invoices;
    return info.invoices.filter((inv) => inv.date.startsWith(invoiceMonth));
  }, [info, invoiceMonth]);

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 text-sm text-gray-400 text-center">불러오는 중...</div>;
  }
  if (!info) {
    return <div className="max-w-4xl mx-auto py-12 text-sm text-gray-400 text-center">결제 정보를 표시할 수 없습니다.</div>;
  }

  const planMeta = PLAN_META[info.plan] ?? { name: info.plan, tagline: '' };
  const sub = info.subscription;
  const isMonthly = sub?.interval === 'month';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top banner: annual switch CTA — only shown on monthly active subs */}
      {sub && isMonthly && !sub.cancelAtPeriodEnd && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 flex items-center justify-between">
          <div className="text-sm">
            <p className="font-semibold text-indigo-900">연간 결제로 전환하면 20% 할인</p>
            <p className="text-xs text-indigo-700 mt-0.5">"Manage in Stripe"에서 청구 주기를 연간으로 변경할 수 있습니다.</p>
          </div>
          <button
            onClick={handleManageInStripe}
            disabled={redirecting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {redirecting ? '이동 중...' : '업그레이드'}
          </button>
        </div>
      )}

      {/* Section 1: Current Plan */}
      <section className="bg-white border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">현재 플랜</h3>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold text-gray-900">{planMeta.name}</p>
              {sub && sub.amountCents > 0 && (
                <p className="text-sm text-gray-500">
                  {formatMoney(sub.amountCents, sub.currency)} / {sub.interval === 'year' ? '년' : '월'}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{planMeta.tagline}</p>
            {sub && (
              <p className="text-xs text-gray-600 mt-3">
                {sub.cancelAtPeriodEnd
                  ? <>다음 갱신일에 해지 예정 — <span className="font-medium">{formatDate(sub.currentPeriodEnd)}</span></>
                  : <>다음 갱신일: <span className="font-medium">{formatDate(sub.currentPeriodEnd)}</span></>}
              </p>
            )}
          </div>
          <button
            onClick={handleManageInStripe}
            disabled={redirecting || !info.hasStripeCustomer}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
          >
            플랜 변경
          </button>
        </div>
      </section>

      {/* Section 2: Payment */}
      <section className="bg-white border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">결제 수단</h3>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-700">결제 카드, 영수증 이메일 등은 Stripe Customer Portal에서 관리합니다.</p>
          <button
            onClick={handleManageInStripe}
            disabled={redirecting || !info.hasStripeCustomer}
            className="border border-gray-300 bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
          >
            Stripe에서 관리
          </button>
        </div>
        {!info.hasStripeCustomer && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
            아직 결제 수단이 없습니다. 유료 플랜을 선택하면 자동으로 등록됩니다.
          </p>
        )}
      </section>

      {/* Section 3: Invoices */}
      <section className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">청구 내역</h3>
          {invoiceMonths.length > 0 && (
            <select
              value={invoiceMonth}
              onChange={(e) => setInvoiceMonth(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="all">전체</option>
              {invoiceMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
        {visibleInvoices.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-gray-400">청구된 인보이스가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-5 py-2 font-medium">날짜</th>
                <th className="text-left px-5 py-2 font-medium">설명</th>
                <th className="text-left px-5 py-2 font-medium">상태</th>
                <th className="text-right px-5 py-2 font-medium">금액</th>
                <th className="text-right px-5 py-2 font-medium">인보이스</th>
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((inv) => {
                const badge = STATUS_BADGES[inv.status] ?? { label: inv.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3 text-gray-700 truncate max-w-xs">{inv.description}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{formatMoney(inv.amountCents, inv.currency)}</td>
                    <td className="px-5 py-3 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 text-xs"
                        >
                          보기
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Section 4: Cancel */}
      {sub && !sub.cancelAtPeriodEnd && (
        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">구독 해지</h3>
              <p className="text-sm text-gray-600 mt-2">
                떠나신다면 아쉽습니다. 해지는 Stripe 포털에서 처리되며, 다음 결제일까지는 모든 기능을 계속 사용할 수 있습니다.
              </p>
            </div>
            <button
              onClick={handleManageInStripe}
              disabled={redirecting}
              className="border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
            >
              구독 해지
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
