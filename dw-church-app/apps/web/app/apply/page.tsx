'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TermsConsentModal } from '../../components/TermsConsentModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

const PLANS = [
  { id: 'basic', label: '기본', monthly: 99, yearly: 79, setup: 500 },
  { id: 'plus', label: '플러스', monthly: 149, yearly: 119, setup: 700 },
  { id: 'pro', label: '프로', monthly: 199, yearly: 159, setup: 1000 },
] as const;

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

// 신청자가 고르는 홈페이지 디자인 시안(22종). 실제 시안 HTML은
// /public/front-samples/card-<id>.html 로 서빙 → 미리보기 iframe 으로 렌더.
// 서버 presets.ts 의 id 와 1:1 대응한다. (thumb 필드는 레거시, 미사용)
const DESIGNS: { id: string; name: string; group: string; thumb: string }[] = [
  { id: '00', name: '사진 히어로형', group: '미주 한인 이민교회', thumb: 'worship-2' },
  { id: '01', name: '영문 우선형', group: '미주 한인 이민교회', thumb: 'worship-1' },
  { id: '02', name: '정착 안내형', group: '미주 한인 이민교회', thumb: 'group-1' },
  { id: '03', name: '큰 글씨형', group: '미주 한인 이민교회', thumb: 'church-2' },
  { id: '04', name: '주간 일정형', group: '미주 한인 이민교회', thumb: 'church-2' },
  { id: '05', name: '목사 인사말형', group: '소형·개척 교회', thumb: 'church-1' },
  { id: '06', name: '여백 중심형', group: '소형·개척 교회', thumb: 'sky-1' },
  { id: '07', name: '지도 우선형', group: '소형·개척 교회', thumb: 'church-1' },
  { id: '08', name: '모바일 홈형', group: '소형·개척 교회', thumb: 'worship-2' },
  { id: '09', name: '모바일 메뉴형', group: '소형·개척 교회', thumb: 'group-2' },
  { id: '10', name: '가정교회형', group: '소형·개척 교회', thumb: 'group-1' },
  { id: '11', name: '라이브 종합형', group: '완성도 레이아웃 시안', thumb: 'worship-2' },
  { id: '12', name: '좌측 사이드바', group: '완성도 레이아웃 시안', thumb: 'worship-1' },
  { id: '13', name: '매거진 타일', group: '완성도 레이아웃 시안', thumb: 'serving-2' },
  { id: '14', name: '다크 네이비', group: '완성도 레이아웃 시안', thumb: 'sermon-1' },
  { id: '15', name: '회원 대시보드', group: '완성도 레이아웃 시안', thumb: 'church-2' },
  { id: '16', name: '스토리 스크롤', group: '완성도 레이아웃 시안', thumb: 'serving-1' },
  { id: '17', name: '중앙 정렬형', group: '완성도 레이아웃 시안', thumb: 'worship-1' },
  { id: '18', name: '이번주 안내형', group: '완성도 레이아웃 시안', thumb: 'church-2' },
  { id: '19', name: '사진 갤러리', group: '완성도 레이아웃 시안', thumb: 'retreat-1' },
  { id: '20', name: '히어로 겹침형', group: '완성도 레이아웃 시안', thumb: 'worship-2' },
  { id: '21', name: '풀블리드 히어로', group: '완성도 레이아웃 시안', thumb: 'pray-1' },
];

function ApplyForm() {
  const params = useSearchParams();
  const [form, setForm] = useState<Record<string, string>>({ billingPeriod: 'yearly' });
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
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
          designChoice: form.designChoice || undefined,
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
        <label className="mb-1 block text-sm font-medium text-gray-700">홈페이지 디자인 <span className="text-gray-400">(선택)</span></label>
        <p className="mb-2 text-xs text-gray-400">시안을 눌러 <b>미리보기</b>로 확인한 뒤 선택하세요. 셋업 과정에서 교회에 맞게 조정됩니다.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DESIGNS.map((d) => {
            const on = form.designChoice === d.id;
            return (
              <div key={d.id} className={`overflow-hidden rounded-lg border transition-colors ${on ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                <button type="button" onClick={() => setPreviewId(d.id)} title="미리보기" className="relative block w-full overflow-hidden bg-white" style={{ height: 150 }}>
                  <iframe src={`/front-samples/card-${d.id}.html`} tabIndex={-1} title={d.name}
                    className="pointer-events-none origin-top-left" style={{ width: 1180, height: 1400, transform: 'scale(0.32)', border: 0 }} />
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-[11px] font-medium text-white">🔍 미리보기</span>
                  {on && <span className="absolute right-1.5 top-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">선택됨</span>}
                </button>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-gray-800">{d.name}</div>
                    <div className="truncate text-[10px] text-gray-400">{d.group}</div>
                  </div>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, designChoice: on ? '' : d.id }))}
                    className={`flex-none rounded-md px-2.5 py-1 text-[11px] font-semibold ${on ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    {on ? '선택됨' : '선택'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewId && (() => {
        const d = DESIGNS.find((x) => x.id === previewId);
        if (!d) return null;
        const on = form.designChoice === d.id;
        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/70" onClick={() => setPreviewId(null)}>
            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-gray-900">{d.name}</div>
                <div className="truncate text-[11px] text-gray-500">{d.group}</div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
                  {(['desktop', 'mobile'] as const).map((dv) => (
                    <button key={dv} type="button" onClick={() => setPreviewDevice(dv)}
                      className={`rounded-md px-3 py-1 font-medium ${previewDevice === dv ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                      {dv === 'desktop' ? '데스크톱' : '모바일'}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { setForm((f) => ({ ...f, designChoice: d.id })); setPreviewId(null); }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                  {on ? '선택됨 ✓' : '이 디자인으로 선택'}
                </button>
                <button type="button" onClick={() => setPreviewId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">닫기 ✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto bg-white shadow-xl" style={{ width: previewDevice === 'mobile' ? 390 : '100%', maxWidth: '100%', height: '100%' }}>
                <iframe src={`/front-samples/card-${d.id}.html`} title={`${d.name} 미리보기`} className="h-full w-full" style={{ border: 0 }} />
              </div>
            </div>
          </div>
        );
      })()}

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
            <p className="mt-1 text-xs text-green-600">✓ {appliedPromo.label || '쿠폰 적용됨'} — 기본 셋업비 {appliedPromo.discountPercent}% 할인</p>
          )}
          {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">기존 웹사이트 주소 <span className="text-gray-400">(있으면 — 콘텐츠 마이그레이션용)</span></label>
        <input value={form.existingUrl || ''} onChange={set('existingUrl')} className={inputCls} placeholder="https://" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">연결할 도메인 <span className="text-gray-400">(보유 또는 구입 예정 — 타사 도메인 연동 지원)</span></label>
        <input value={form.desiredDomain || ''} onChange={set('desiredDomain')} className={inputCls} placeholder="예: yourchurch.org" />
        <p className="mt-1 text-xs text-gray-400">보유하신 도메인을 사이트에 연결해 드립니다. 도메인이 없으면 구입 방법도 안내해 드립니다.</p>
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
        {state === 'submitting' ? '제출 중...' : '신청서 제출'}
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
          <h1 className="mb-3 text-3xl font-bold text-gray-900">홈페이지 신청</h1>
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
