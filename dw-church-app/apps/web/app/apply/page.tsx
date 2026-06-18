'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
  const [faithAffirmed, setFaithAffirmed] = useState(false);
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.churchName?.trim() || !form.email?.trim() || !faithAffirmed) return;
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
          faithAffirmed: true,
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
        <input value={form.denomination || ''} onChange={set('denomination')} className={inputCls} placeholder="예: 예장합동, 예장통합, 기감, 미국장로교(PCUSA), 무교단 등" />
        <p className="mt-1 text-xs text-gray-400">본 서비스는 정통 기독교 신앙고백을 따르는 교회를 대상으로 합니다. 무교단·독립교회도 신청하실 수 있습니다.</p>
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
          return (
            <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span className="font-semibold">{sel.label}</span> · {yearly ? '연 결제' : '월 결제'} →{' '}
              <span className="font-bold">${price}/월</span>
              {yearly && <span className="text-blue-700"> (연 1회 청구)</span>}
              <span className="block text-xs text-blue-700 mt-0.5">+ 셋업비 ${sel.setup} (1회)</span>
            </div>
          );
        })()}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">기존 웹사이트 주소 <span className="text-gray-400">(있으면 — 콘텐츠 이전에 사용)</span></label>
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

      {/* Statement of Faith — positive eligibility (required) */}
      <label className="flex items-start gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={faithAffirmed}
          onChange={(e) => setFaithAffirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0"
        />
        <span>
          우리 교회는 사도신경·니케아 신경으로 요약되는 정통 기독교 신앙(삼위일체 하나님, 예수 그리스도의 신성·대속의 죽음과 부활, 성경의 권위, 그리스도의 재림)을 고백합니다. <span className="text-red-500">*</span>
          {' '}
          <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">신앙고백 전문</a>
        </span>
      </label>

      {state === 'error' && (
        <p className="text-sm text-red-600">신청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
      )}
      <button
        type="submit"
        disabled={state === 'submitting' || !form.churchName?.trim() || !form.email?.trim() || !faithAffirmed}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {state === 'submitting' ? '제출 중...' : '개발 신청서 제출'}
      </button>
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
            결제가 확인되면 디자인 셋업과 콘텐츠 이전을 시작합니다.
          </p>
        </div>
        <Suspense fallback={<div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">불러오는 중...</div>}>
          <ApplyForm />
        </Suspense>
      </main>
    </div>
  );
}
