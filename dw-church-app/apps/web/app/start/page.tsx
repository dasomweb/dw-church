'use client';

/**
 * /start — 정식 도입 신청서 (파이프라인 ①). 상담 우선의 /apply 와 별개로, 구성이 정해진
 * 교회가 직접 구축 범위·행정 애드온·개척감면을 골라 **실시간 자동견적**을 보고 **간이 서명**
 * 후 제출하는 화면. 가격은 서버 SoT(plan/setup/feature pricing)에서 읽고 견적은
 * POST /applications/quote 로 계산한다. 제출 → POST /applications (stage=signed).
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';
const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';
const inputCls = 'w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none placeholder:text-[#a3aab8] focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]';
const labelCls = 'mb-1.5 block text-[13.5px] font-semibold text-[#16181d]';

// 판매 대상 행정 애드온만 노출($99 에 포함된 콘텐츠 기능은 제외). 서버 feature_pricing 에서 단가.
const ADDON_KEYS = ['membership', 'smallgroup', 'newcomer', 'newcomer_registration', 'forms', 'translation', 'pwa'];

interface SetupOption { scopeKey: string; label: string; price: number; fromPrice: boolean }
interface AddonOption { featureKey: string; label: string; monthly: number }
interface Quote {
  subsidy: boolean; subscriptionMonthly: number; subscriptionLabel: string;
  setupOneTime: number; setupLabel: string; setupFrom: boolean;
  addons: { key: string; label: string; amount: number }[]; addonsMonthly: number;
  monthlyTotal: number; oneTimeTotal: number;
}

export default function StartPage() {
  const router = useRouter();
  const [setups, setSetups] = useState<SetupOption[]>([]);
  const [addonOpts, setAddonOpts] = useState<AddonOption[]>([]);
  const [buildScope, setBuildScope] = useState<string>('new');
  const [addons, setAddons] = useState<string[]>([]);
  const [subsidy, setSubsidy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');

  // 옵션 로드 (공개 SoT)
  useEffect(() => {
    (async () => {
      try {
        const [s, f] = await Promise.all([
          fetch(`${API_BASE}/api/v1/setup-pricing`).then((r) => r.json()).catch(() => ({ data: [] })),
          fetch(`${API_BASE}/api/v1/feature-pricing`).then((r) => r.json()).catch(() => ({ data: [] })),
        ]);
        const sList: SetupOption[] = (s.data ?? s ?? []).filter((x: SetupOption) => x.scopeKey !== 'subsidy_setup');
        setSetups(sList);
        if (sList[0]) setBuildScope(sList[0].scopeKey);
        const fList: AddonOption[] = (f.data ?? f ?? []).filter((x: AddonOption) => ADDON_KEYS.includes(x.featureKey));
        fList.sort((a, b) => ADDON_KEYS.indexOf(a.featureKey) - ADDON_KEYS.indexOf(b.featureKey));
        setAddonOpts(fList);
      } catch { /* 폼은 계속 동작 */ }
    })();
  }, []);

  // 실시간 견적 (구성 바뀔 때마다 서버 계산)
  const refreshQuote = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/applications/quote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildScope, addons, subsidyRequested: subsidy }),
      });
      const j = await res.json();
      setQuote(j.data ?? j);
    } catch { setQuote(null); }
  }, [buildScope, addons, subsidy]);
  useEffect(() => { void refreshQuote(); }, [refreshQuote]);

  const toggleAddon = (k: string) => setAddons((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = !!form.churchName?.trim() && !!form.email?.trim() && !!form.signedName?.trim() && agreed && (!subsidy || !!form.sponsorChurch?.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || state === 'submitting') return;
    setState('submitting');
    try {
      const res = await fetch(`${API_BASE}/api/v1/applications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchName: form.churchName!.trim(),
          email: form.email!.trim(),
          contactName: form.contactName?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          denomination: form.denomination?.trim() || undefined,
          existingUrl: form.existingUrl?.trim() || undefined,
          message: form.message?.trim() || undefined,
          buildScope,
          addons,
          subsidyRequested: subsidy,
          sponsorChurch: subsidy ? form.sponsorChurch?.trim() : undefined,
          signedName: form.signedName!.trim(),
          faithAffirmed: true,
          termsAccepted: true,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push(`/apply/done?email=${encodeURIComponent(form.email!.trim())}`);
    } catch { setState('error'); }
  };

  const money = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <section className="bg-white">
          <div className={`${CONTAINER} py-12 sm:py-16`}>
            <div className="max-w-2xl">
              <span className="text-[12.5px] font-extrabold tracking-[0.06em] text-[#1466d6]">도입 신청</span>
              <h1 className="mt-3 text-[30px] text-[#16181d] sm:text-[40px]" style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.2 }}>구성을 고르면 견적이 바로 나옵니다</h1>
              <p className="mt-4 text-[16px] text-[#4b5464]" style={{ lineHeight: 1.85 }}>구독은 월 $99 단일입니다. 교회마다 달라지는 초기 구축 범위와 교회 행정만 고르시면 됩니다. 아직 정하기 어려우시면 <a href="/apply" className="font-semibold text-[#1466d6] hover:underline">상담 신청</a>으로 시작하세요.</p>
            </div>

            <form onSubmit={submit} className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
              {/* ── 좌: 구성 ── */}
              <div className="space-y-8">
                {/* 1. 초기 구축 범위 */}
                <div>
                  <h2 className="text-[17px] font-bold text-[#16181d]">1. 초기 구축 범위 <span className="text-[#61697a] font-normal text-[14px]">(처음 한 번)</span></h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {setups.map((s) => {
                      const on = buildScope === s.scopeKey;
                      return (
                        <button key={s.scopeKey} type="button" onClick={() => setBuildScope(s.scopeKey)} aria-pressed={on}
                          className={`rounded-xl border p-4 text-left transition-colors ${on ? 'border-2 border-[#1466d6] bg-[#f4f8ff]' : 'border border-[#e7e9ee] bg-white hover:border-[#c9cfda]'}`}>
                          <div className="text-[14.5px] font-bold text-[#16181d]">{s.label}</div>
                          <div className="mt-1.5 text-[18px] font-extrabold text-[#1466d6]">{money(s.price)}{s.fromPrice ? <span className="text-[12px] font-normal text-[#61697a]"> 부터</span> : null}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 교회 행정 애드온 */}
                <div>
                  <h2 className="text-[17px] font-bold text-[#16181d]">2. 교회 행정 <span className="text-[#61697a] font-normal text-[14px]">(필요한 것만, 매달)</span></h2>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {addonOpts.map((a) => {
                      const on = addons.includes(a.featureKey);
                      return (
                        <button key={a.featureKey} type="button" onClick={() => toggleAddon(a.featureKey)} aria-pressed={on}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${on ? 'border-[#1466d6] bg-[#f4f8ff]' : 'border-[#e7e9ee] bg-white hover:border-[#c9cfda]'}`}>
                          <span className="flex items-center gap-2.5">
                            <span className={`flex h-5 w-5 flex-none items-center justify-center rounded border text-[11px] ${on ? 'border-[#1466d6] bg-[#1466d6] text-white' : 'border-[#c9cfda] text-transparent'}`}>✓</span>
                            <span className="text-[14.5px] font-medium text-[#16181d]">{a.label}</span>
                          </span>
                          <span className="text-[13.5px] font-semibold text-[#61697a]">{money(a.monthly)}/월</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 개척·미자립 지원 */}
                <div>
                  <h2 className="text-[17px] font-bold text-[#16181d]">3. 개척·미자립교회 지원 <span className="text-[#61697a] font-normal text-[14px]">(해당 시)</span></h2>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#dbe6f7] bg-[#f4f8ff] px-4 py-3.5">
                    <input type="checkbox" checked={subsidy} onChange={(e) => setSubsidy(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-[#1466d6]" />
                    <span className="text-[14px] text-[#233043]" style={{ lineHeight: 1.6 }}>첫 1년 월 <b>$39</b> · 초기 구축 <b>$200</b>으로 시작합니다. 후원 교회가 있어야 적용되며, 심사·승인 후 확정됩니다.</span>
                  </label>
                  {subsidy && (
                    <label className="mt-3 block">
                      <span className={labelCls}>후원 교회명 *</span>
                      <input value={form.sponsorChurch || ''} onChange={set('sponsorChurch')} placeholder="후원하시는 교회 이름 (TrueLight 이용 교회)" className={inputCls} />
                    </label>
                  )}
                </div>

                {/* 4. 교회 정보 */}
                <div>
                  <h2 className="text-[17px] font-bold text-[#16181d]">4. 교회 정보</h2>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className={labelCls}>교회명 *</span><input value={form.churchName || ''} onChange={set('churchName')} className={inputCls} /></label>
                    <label className="block"><span className={labelCls}>담당자 · 직함</span><input value={form.contactName || ''} onChange={set('contactName')} className={inputCls} /></label>
                    <label className="block"><span className={labelCls}>이메일 *</span><input type="email" value={form.email || ''} onChange={set('email')} className={inputCls} /></label>
                    <label className="block"><span className={labelCls}>전화</span><input type="tel" value={form.phone || ''} onChange={set('phone')} className={inputCls} /></label>
                    <label className="block"><span className={labelCls}>소속 교단</span><input value={form.denomination || ''} onChange={set('denomination')} className={inputCls} /></label>
                    <label className="block"><span className={labelCls}>지금 쓰는 사이트 (있으면)</span><input value={form.existingUrl || ''} onChange={set('existingUrl')} placeholder="https://" className={inputCls} /></label>
                  </div>
                  <label className="mt-4 block"><span className={labelCls}>요청사항</span><textarea value={form.message || ''} onChange={set('message')} rows={3} className={inputCls} /></label>
                </div>
              </div>

              {/* ── 우: 견적 요약 (sticky) + 서명 ── */}
              <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-2xl border-2 border-[#1466d6] bg-[#eef4ff] p-6">
                  <h2 className="text-[15px] font-extrabold text-[#16181d]">견적 요약</h2>
                  {quote ? (
                    <div className="mt-4 space-y-2.5 text-[14px]">
                      <Row k={quote.subscriptionLabel} v={`${money(quote.subscriptionMonthly)}/월`} strong />
                      {quote.addons.map((a) => <Row key={a.key} k={a.label} v={`${money(a.amount)}/월`} sub />)}
                      <div className="my-2 border-t border-[#c9dcff]" />
                      <Row k="매달 합계" v={`${money(quote.monthlyTotal)}/월`} strong big />
                      <Row k={`초기 구축 · ${quote.setupLabel}`} v={`${money(quote.oneTimeTotal)}${quote.setupFrom ? ' 부터' : ''}`} />
                      {quote.subsidy && <p className="mt-1 text-[12px] text-[#1466d6]">개척·미자립 지원가 적용 (심사·승인 후 확정)</p>}
                    </div>
                  ) : <p className="mt-4 text-[13px] text-[#61697a]">구성을 고르면 견적이 표시됩니다.</p>}
                  <p className="mt-4 text-[12px] text-[#61697a]" style={{ lineHeight: 1.6 }}>안내 기준가이며 최종 금액은 확인 후 확정됩니다. 연 결제 시 2개월 무료.</p>
                </div>

                {/* 간이 서명 */}
                <div className="mt-5 rounded-2xl border border-[#e7e4de] bg-[#fbfaf8] p-6">
                  <h2 className="text-[15px] font-bold text-[#16181d]">동의 및 서명</h2>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13.5px] text-[#4b5464]">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-[#1466d6]" />
                    <span style={{ lineHeight: 1.6 }}>위 견적과 <a href="/billing" className="font-semibold text-[#1466d6] hover:underline">결제 조건</a>·<a href="/terms" className="font-semibold text-[#1466d6] hover:underline">이용약관</a>에 동의하며, 정통 기독교 신앙을 고백하는 교회입니다.</span>
                  </label>
                  <label className="mt-3 block"><span className={labelCls}>서명 (이름 입력) *</span><input value={form.signedName || ''} onChange={set('signedName')} placeholder="서명하실 분 이름" className={inputCls} /></label>
                  {state === 'error' && <p className="mt-3 text-[13px] text-[#c0392b]">보내는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.</p>}
                  <button type="submit" disabled={!canSubmit || state === 'submitting'}
                    className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#2b7fff] px-6 text-[16px] font-semibold text-white hover:bg-[#1466d6] disabled:cursor-not-allowed disabled:opacity-50">
                    {state === 'submitting' ? '보내는 중…' : '서명하고 신청하기'}
                  </button>
                  <p className="mt-3 text-center text-[12px] text-[#61697a]">지금 결제되지 않습니다. 승인 후 결제 안내를 보내 드립니다.</p>
                </div>
              </aside>
            </form>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Row({ k, v, strong, sub, big }: { k: string; v: string; strong?: boolean; sub?: boolean; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`${sub ? 'text-[#61697a] pl-3' : 'text-[#233043]'} ${strong ? 'font-bold' : ''}`}>{k}</span>
      <span className={`${strong ? 'font-extrabold text-[#16181d]' : 'text-[#4b5464]'} ${big ? 'text-[19px]' : ''}`}>{v}</span>
    </div>
  );
}
