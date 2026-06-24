'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TermsConsentModal } from '../../components/TermsConsentModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

const PLANS = [
  { id: 'light', label: '라이트', monthly: 59, yearly: 49, setup: 300 },
  { id: 'basic', label: '기본', monthly: 99, yearly: 79, setup: 500 },
  { id: 'plus', label: '플러스', monthly: 149, yearly: 119, setup: 700 },
  { id: 'pro', label: '프로', monthly: 199, yearly: 159, setup: 1000 },
] as const;

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

function ApplyForm() {
  const params = useSearchParams();
  const [form, setForm] = useState<Record<string, string>>({ billingPeriod: 'yearly' });
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [appliedPromo, setAppliedPromo] = useState<{ discountPercent: number; targetPlans: string[]; label?: string } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Preselect plan / period from the landing pricing cards (?plan=basic&period=yearly).
  useEffect(() => {
    const plan = params.get('plan');
    const period = params.get('period');
    setForm((f) => ({
      ...f,
      ...(plan && PLANS.some((p) => p.id === plan) ? { plan } : {}),
      ...(period === 'monthly' || period === 'yearly' ? { billingPeriod: period } : {}),
    }));
  }, [params]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyCoupon = async () => {
    const code = (form.couponCode || '').trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) { setAppliedPromo(null); setCouponError('사용할 수 없는 쿠폰 코드입니다.'); return; }
      const json = await res.json();
      const p = json.data;
      setAppliedPromo({ discountPercent: p.discountPercent, targetPlans: p.targetPlans || [], label: p.label });
    } catch {
      setAppliedPromo(null);
      setCouponError('확인 중 오류가 발생했습니다.');
    } finally {
      setCouponChecking(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.churchName?.trim() || !form.email?.trim() || !agreed) return;
    setState('submitting');
    try {
      const res = await fetch(`${API_BASE}/api/v1/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchName: form.churchName,
          contactName: form.contactName || undefined,
          email: form.email,
          phone: form.phone || undefined,
          churchAddress: form.churchAddress || undefined,
          denomination: form.denomination || undefined,
          plantingType: form.plantingType || undefined,
          memberProfile: form.memberProfile || undefined,
          localContext: form.localContext || undefined,
          couponCode: appliedPromo ? (form.couponCode || '').trim() : undefined,
          faithAffirmed: true,
          termsAccepted: true,
          plan: form.plan || undefined,
          billingPeriod: form.billingPeriod || undefined,
          existingUrl: form.existingUrl || undefined,
          desiredDomain: form.desiredDomain || undefined,
          message: form.message || undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-3 text-4xl">🙏</div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">신청이 접수되었습니다</h2>
        <p className="text-sm leading-relaxed text-gray-500">
          신청서를 검토한 뒤 결제 안내와 함께 이메일로 연락드리겠습니다.<br />
          교회를 위한 홈페이지, 정성껏 만들어 드리겠습니다.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">교회 이름 <span className="text-red-500">*</span></label>
        <input required value={form.churchName || ''} onChange={set('churchName')} className={inputCls} placeholder="예: 은혜교회" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">담당자 이름</label>
          <input value={form.contactName || ''} onChange={set('contactName')} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">연락처</label>
          <input value={form.phone || ''} onChange={set('phone')} className={inputCls} placeholder="예: (213) 555-0100" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">이메일 <span className="text-red-500">*</span></label>
        <input required type="email" value={form.email || ''} onChange={set('email')} className={inputCls} placeholder="name@email.com" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">교회 주소</label>
        <input value={form.churchAddress || ''} onChange={set('churchAddress')} className={inputCls} placeholder="예: 123 Main St, Los Angeles, CA 90012" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">소속 교단</label>
        <input value={form.denomination || ''} onChange={set('denomination')} className={inputCls} placeholder="소속 교단 (선택 입력, 무교단·독립교회면 비워두세요)" />
        <p className="mt-1 text-xs text-gray-400">본 서비스는 역사적 정통 기독교 신앙을 고백하는 교회를 위한 것입니다. 무교단·독립교회도 신청하실 수 있습니다.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">개척/사역 유형 <span className="text-gray-400">(선택)</span></label>
        <select
          value={form.plantingType || ''}
          onChange={(e) => setForm((f) => ({ ...f, plantingType: e.target.value }))}
          className={inputCls}
        >
          <option value="">선택 안 함</option>
          <option value="standard">전통/표준 개척</option>
          <option value="covocational">자비량/이중직 (미자립)</option>
          <option value="multisite">다중 사이트 / 캠퍼스</option>
          <option value="multiethnic">다민족/다언어 (한인 이민 등)</option>
          <option value="replant">교회 재개척</option>
          <option value="micro">마이크로 / 가정교회</option>
          <option value="other">기타</option>
        </select>
        <p className="mt-1 text-xs text-gray-400">교회가 우선으로 두는 사역 방향에 맞춰 사이트를 구성합니다.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">교회 구성원 <span className="text-gray-400">(선택)</span></label>
        <textarea value={form.memberProfile || ''} onChange={set('memberProfile')} rows={2} className={inputCls} placeholder="예: 30~40대 자녀 둔 가정이 많음, 주재원·한국에서 막 오신 분들 비중이 높음" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">지역 환경 <span className="text-gray-400">(선택)</span></label>
        <textarea value={form.localContext || ''} onChange={set('localContext')} rows={2} className={inputCls} placeholder="예: 인근에 초·중·고 학군 밀집, 근처 대학교, 한인 기업/지사 다수" />
        <p className="mt-1 text-xs text-gray-400">주변 학군·대학·한인 기업 등 지역 환경은 타깃 세대와 사역 방향에 영향을 줍니다.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">관심 플랜</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, plan: p.id }))}
              className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                form.plan === p.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="font-semibold">{p.label}</div>
              <div className="text-xs text-gray-400">${form.billingPeriod === 'yearly' ? p.yearly : p.monthly}/월</div>
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 text-xs">
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setForm((f) => ({ ...f, billingPeriod: b }))}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                form.billingPeriod === b ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {b === 'monthly' ? '월 결제' : '연 결제 (약 20% 할인)'}
            </button>
          ))}
        </div>
        {(() => {
          const sel = PLANS.find((p) => p.id === form.plan);
          if (!sel) return null;
          const yearly = form.billingPeriod === 'yearly';
          const price = yearly ? sel.yearly : sel.monthly;
          const discounted = !!appliedPromo && appliedPromo.targetPlans.includes(sel.id);
          const setupAfter = discounted ? Math.round(sel.setup * (1 - appliedPromo!.discountPercent / 100)) : sel.setup;
          return (
            <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span className="font-semibold">{sel.label}</span> · {yearly ? '연 결제' : '월 결제'} →{' '}
              <span className="font-bold">${price}/월</span>
              {yearly && <span className="text-blue-700"> (연 1회 청구)</span>}
              <span className="block text-xs text-blue-700 mt-0.5">
                + 셋업비{' '}
                {discounted ? (
                  <>
                    <s className="text-blue-400">${sel.setup}</s>{' '}
                    <b className="text-green-700">${setupAfter}</b>{' '}
                    <span className="text-green-700">({appliedPromo!.discountPercent}%↓)</span>
                  </>
                ) : (
                  `$${sel.setup}`
                )}{' '}
                (1회)
              </span>
            </div>
          );
        })()}

        {/* 쿠폰 코드 */}
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              value={form.couponCode || ''}
              onChange={(e) => { set('couponCode')(e); setAppliedPromo(null); setCouponError(''); }}
              className={`${inputCls} flex-1`}
              placeholder="쿠폰 코드 (있으면 입력)"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponChecking || !(form.couponCode || '').trim()}
              className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {couponChecking ? '확인 중...' : '적용'}
            </button>
          </div>
          {appliedPromo && (
            <p className="mt-1 text-xs text-green-600">✓ {appliedPromo.label || '쿠폰 적용됨'} — 라이트·기본 셋업비 {appliedPromo.discountPercent}% 할인</p>
          )}
          {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">기존 웹사이트 주소 <span className="text-gray-400">(있으면 — 디자인·구조 참고용)</span></label>
        <input value={form.existingUrl || ''} onChange={set('existingUrl')} className={inputCls} placeholder="https://" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">연결할 도메인 <span className="text-gray-400">(직접 구입 — 보유 중이거나 구입 예정인 주소)</span></label>
        <input value={form.desiredDomain || ''} onChange={set('desiredDomain')} className={inputCls} placeholder="예: yourchurch.org" />
        <p className="mt-1 text-xs text-gray-400">도메인은 교회에서 직접 구입하시며, 구입하신 주소를 사이트에 연결해 드립니다.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">교회 소개 / 요청사항</label>
        <textarea value={form.message || ''} onChange={set('message')} rows={4} className={inputCls} placeholder="교회 규모, 원하시는 분위기, 꼭 들어갈 내용 등을 자유롭게 적어주세요." />
      </div>

      {/* Clickwrap consent — must open Terms, scroll to the end, and accept (required) */}
      {agreed ? (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="mt-0.5 text-base leading-none">✓</span>
          <span>
            이용약관 및 신앙고백에 동의하셨습니다.{' '}
            <button type="button" onClick={() => setShowTerms(true)} className="text-green-700 underline">다시 보기</button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="flex w-full items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 transition-colors hover:bg-amber-100"
        >
          <span className="mt-0.5 text-base leading-none">📄</span>
          <span>
            <strong>이용약관 및 신앙고백 읽고 동의하기</strong> <span className="text-red-500">*</span>
            <span className="mt-0.5 block text-xs text-amber-700">신청 전 약관과 신앙고백을 끝까지 읽고 동의해 주세요. (필수)</span>
          </span>
        </button>
      )}

      {state === 'error' && (
        <p className="text-sm text-red-600">신청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
      )}
      <button
        type="submit"
        disabled={state === 'submitting' || !form.churchName?.trim() || !form.email?.trim() || !agreed}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {state === 'submitting' ? '제출 중...' : '개발 신청서 제출'}
      </button>

      <TermsConsentModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAgree={() => setAgreed(true)}
      />
      <p className="text-center text-xs text-gray-400">
        제출 후 결제 절차는 없습니다 — 검토 후 결제 안내를 이메일로 보내드립니다.
      </p>
    </form>
  );
}

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
          </Link>
          <Link href="/#plans" className="text-sm text-gray-600 hover:text-gray-900">요금제</Link>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">홈페이지 개발 신청</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            아래 신청서를 작성해 주시면 검토 후 결제 안내를 보내드립니다.<br />
            결제가 확인되면 디자인 셋업과 기본 구성을 시작합니다.
          </p>
        </div>
        <Suspense fallback={<div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">불러오는 중...</div>}>
          <ApplyForm />
        </Suspense>
      </main>
    </div>
  );
}
