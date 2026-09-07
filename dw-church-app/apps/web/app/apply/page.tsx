'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import KakaoInquiryButton from '../../components/KakaoInquiryButton';

// ─────────────────────────────────────────────────────────────────────────────
// /apply — 상담 신청 (시안 상세 §1). 상담 우선 모델: 플랜 직접 선택·쿠폰·미리보기
// UI는 제거하고, 교회 사정을 듣기 위한 문의 폼만 남긴다.
// 제출은 기존 실서비스 인테이크 파이프라인(POST /api/v1/applications)을 그대로 사용한다.
//   교회명→churchName · 담당자·직함→contactName · 이메일→email · 전화→phone
//   지금 쓰는 사이트→existingUrl · 소속 교단→denomination · 교인 규모→memberProfile
//   지금 가장 불편한 것→message (상담유형 카테고리를 앞에 붙여 전달)
// 성공 시 /apply/done 으로 이동(?email= 프리필). 색·타입은 랜딩 v2 디자인 시스템.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';
const CONTAINER = 'mx-auto w-full max-w-[1080px] px-5 sm:px-10';

const inputCls =
  'w-full rounded-lg border border-[#d5dae2] px-3.5 py-3 text-[16px] text-[#16181d] outline-none placeholder:text-[#a3aab8] focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]';
const fieldLabelCls = 'mb-1.5 block text-[13.5px] font-semibold text-[#16181d]';

// 상담유형 — 4카드(2x2). 기본 첫 항목 선택. id 는 내부 값, title 은 메시지 앞에 붙는 라벨.
const CATEGORIES = [
  { id: 'homepage', title: '홈페이지 상담', desc: '새로 만들거나 지금 사이트를 바꾸려는 교회' },
  { id: 'admin', title: '교회 행정까지', desc: '교적관리·목장·새가족을 함께 두려는 교회' },
  { id: 'plant', title: '개척·미자립교회 지원', desc: '지원을 받으려는 교회, 함께 세우려는 교회' },
  { id: 'existing', title: '이미 쓰고 있어요', desc: '기존 교회의 문의와 요청' },
] as const;

// 교인 규모 — pill 선택. 값 자체가 memberProfile 로 전달된다.
const SIZES = ['50명 이하', '50–150', '150–500', '500명 이상'] as const;

function ApplyForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [form, setForm] = useState<Record<string, string>>({
    memberProfile: SIZES[0],
  });
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [confirmed, setConfirmed] = useState(false); // 신앙/약관 확인 (선택)
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');

  // 랜딩 상담 폼(native GET → /apply)에서 넘어온 값 프리필.
  // 랜딩 필드명: church / contact / email / phone / size / need.
  useEffect(() => {
    const pick = (k: string) => params.get(k) || '';
    setForm((f) => ({
      ...f,
      churchName: f.churchName || pick('church'),
      contactName: f.contactName || pick('contact'),
      email: f.email || pick('email'),
      phone: f.phone || pick('phone'),
      memberProfile: pick('size') || f.memberProfile || SIZES[0],
      message: f.message || pick('need'),
    }));
  }, [params]);

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = !!form.churchName?.trim() && !!form.email?.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || state === 'submitting') return;
    setState('submitting');

    // 상담유형을 메시지 앞에 붙여 전달 — 예: "[상담유형: 교회 행정까지] …"
    const catTitle = CATEGORIES.find((c) => c.id === category)?.title;
    const baseMsg = (form.message || '').trim();
    const message = catTitle ? `[상담유형: ${catTitle}]${baseMsg ? ' ' + baseMsg : ''}` : baseMsg || undefined;

    try {
      const res = await fetch(`${API_BASE}/api/v1/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchName: (form.churchName ?? "").trim(),
          email: (form.email ?? "").trim(),
          contactName: form.contactName?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          existingUrl: form.existingUrl?.trim() || undefined,
          denomination: form.denomination?.trim() || undefined,
          memberProfile: form.memberProfile || undefined,
          message,
          // 신앙/약관 확인은 선택 — 체크한 경우에만 함께 전달.
          ...(confirmed ? { faithAffirmed: true, termsAccepted: true } : {}),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push(`/apply/done?email=${encodeURIComponent((form.email ?? "").trim())}`);
    } catch {
      setState('error');
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
      {/* ── 좌측: 상담유형 + 폼 ── */}
      <div>
        {/* 무엇을 도와드릴까요 */}
        <span className="inline-block text-[12.5px] font-extrabold tracking-[0.06em] text-[#1466d6]">
          무엇을 도와드릴까요
        </span>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={on}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  on ? 'border-2 border-[#1466d6] bg-[#f4f8ff]' : 'border border-[#e7e9ee] bg-white hover:border-[#c9cfda]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] ${
                      on ? 'border-[#1466d6] bg-[#1466d6] text-white' : 'border-[#c9cfda] text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-[16px] font-bold text-[#16181d]">{c.title}</span>
                </div>
                <p className="mt-2 text-[14px] text-[#61697a]" style={{ lineHeight: 1.6 }}>
                  {c.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* 폼 (웜 배경 카드) */}
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-[#e7e4de] bg-[#fbfaf8] p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabelCls}>교회명 *</span>
              <input value={form.churchName || ''} onChange={set('churchName')} autoComplete="organization" className={inputCls} />
            </label>
            <label className="block">
              <span className={fieldLabelCls}>담당자 · 직함</span>
              <input value={form.contactName || ''} onChange={set('contactName')} autoComplete="name" className={inputCls} />
            </label>
            <label className="block">
              <span className={fieldLabelCls}>이메일 *</span>
              <input type="email" value={form.email || ''} onChange={set('email')} autoComplete="email" className={inputCls} />
            </label>
            <label className="block">
              <span className={fieldLabelCls}>전화</span>
              <input type="tel" value={form.phone || ''} onChange={set('phone')} autoComplete="tel" className={inputCls} />
            </label>
          </div>

          {/* 교인 규모 — pill 선택 */}
          <div className="mt-4">
            <span className={fieldLabelCls}>교인 규모</span>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => {
                const on = form.memberProfile === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, memberProfile: s }))}
                    aria-pressed={on}
                    className={`min-h-[44px] rounded-full border px-4 text-[15px] font-medium transition-colors ${
                      on ? 'border-[#1466d6] bg-[#f4f8ff] text-[#1466d6]' : 'border-[#d5dae2] bg-white text-[#4b5464] hover:border-[#c9cfda]'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-4 block">
            <span className={fieldLabelCls}>지금 쓰는 사이트 (있으면)</span>
            <input value={form.existingUrl || ''} onChange={set('existingUrl')} placeholder="https://" className={inputCls} />
          </label>
          <label className="mt-4 block">
            <span className={fieldLabelCls}>소속 교단 · 교협</span>
            <input value={form.denomination || ''} onChange={set('denomination')} placeholder="예: 미주한인예수교장로회" className={inputCls} />
          </label>
          <label className="mt-4 block">
            <span className={fieldLabelCls}>지금 가장 불편한 것</span>
            <textarea
              value={form.message || ''}
              onChange={set('message')}
              rows={4}
              placeholder="편하게 적어 주세요. 홈페이지가 없거나, 오래됐거나, 교적이 흩어져 있는 것도 좋습니다."
              className={inputCls}
            />
          </label>

          {/* 신앙/약관 확인 (선택) */}
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[14px] text-[#4b5464]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] flex-none accent-[#1466d6]"
            />
            <span style={{ lineHeight: 1.6 }}>
              정통 기독교 신앙을 고백하는 교회이며,{' '}
              <a href="/terms" className="font-semibold text-[#1466d6] hover:underline">이용약관</a>에 동의합니다. (선택)
            </span>
          </label>

          {state === 'error' && (
            <p className="mt-4 text-[14px] text-[#61697a]">
              보내는 중 문제가 생겼습니다. 잠시 후 다시 시도하시거나 <a href="mailto:info@dasomweb.com" className="font-semibold text-[#1466d6] hover:underline">info@dasomweb.com</a> 로 알려 주세요.
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || state === 'submitting'}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#2b7fff] px-6 text-[16px] font-semibold text-white transition-colors hover:bg-[#1466d6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === 'submitting' ? '보내는 중…' : '상담 신청 보내기'}
          </button>
          <p className="mt-4 text-center text-[13.5px] text-[#61697a]" style={{ lineHeight: 1.7 }}>
            보내시면 확인 메일이 바로 가고, 영업일 ○일 안에 담당자가 연락드립니다. 결제나 계약이 지금 일어나지는 않습니다.
          </p>
        </form>
      </div>

      {/* ── 우측 사이드 (3카드) ── */}
      <aside className="flex flex-col gap-5">
        {/* 이후 어떻게 진행되나요 */}
        <div className="rounded-xl border border-[#e7e9ee] bg-white p-6">
          <h2 className="text-[17px] font-bold text-[#16181d]">이후 어떻게 진행되나요</h2>
          <ol className="mt-4 space-y-4">
            {[
              '담당자가 연락드려 교회 사정을 듣습니다.',
              '어떤 구성이 맞을지와 비용을 정리해 보내 드립니다.',
              '동의하시면 결제 안내를 보내고, 확인 후 디자인·구축을 시작합니다.',
              '완성된 화면을 확인하시고 오픈합니다.',
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#f4f8ff] text-[13px] font-bold text-[#1466d6]">
                  {i + 1}
                </span>
                <span className="text-[14.5px] text-[#4b5464]" style={{ lineHeight: 1.65 }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 직접 연락 */}
        <div className="rounded-xl border border-[#e7e9ee] bg-white p-6">
          <h2 className="text-[17px] font-bold text-[#16181d]">직접 연락</h2>
          <dl className="mt-4 space-y-3 text-[14.5px]">
            <div className="flex justify-between gap-4">
              <dt className="text-[#61697a]">이메일</dt>
              <dd><a href="mailto:info@dasomweb.com" className="font-medium text-[#1466d6] hover:underline">info@dasomweb.com</a></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#61697a]">전화</dt>
              <dd><a href="tel:+14708395151" className="font-medium text-[#16181d] hover:text-[#1466d6]">1-470-839-5151</a></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#61697a]">상담 시간</dt>
              <dd className="font-medium text-[#16181d]">월–금 오전 9시–오후 5시 (EST)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-[#61697a]">주소</dt>
              <dd className="text-right font-medium text-[#16181d]" style={{ lineHeight: 1.55 }}>1172 Satellite Blvd NW Ste 110,<br />Suwanee, GA 30024</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-[#eceef2] pt-4 text-[13.5px] text-[#61697a]" style={{ lineHeight: 1.65 }}>
            전화·이메일이 편하지 않으시면 화면 오른쪽 아래 카카오톡 문의 버튼으로도 연락하실 수 있습니다.
          </p>
        </div>

        {/* 결정 전에 보실 것 (웜 배경) */}
        <div className="rounded-xl border border-[#e7e4de] bg-[#fbfaf8] p-6">
          <h2 className="text-[17px] font-bold text-[#16181d]">결정 전에 보실 것</h2>
          <ul className="mt-4 space-y-3 text-[15px]">
            {[
              { label: '함께한 교회 보기', href: '/churches' },
              { label: '결제 조건 보기', href: '/billing' },
              { label: '도움센터', href: '/help' },
            ].map((l) => (
              <li key={l.href}>
                <a href={l.href} className="flex items-center justify-between gap-2 font-medium text-[#16181d] hover:text-[#1466d6]">
                  {l.label}
                  <span aria-hidden className="text-[#1466d6]">→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <section className="bg-white">
          <div className={`${CONTAINER} py-12 sm:py-20`}>
            <div className="max-w-2xl">
              <h1 className="text-[32px] text-[#16181d] sm:text-[44px]" style={{ fontWeight: 750, letterSpacing: '-0.035em', lineHeight: 1.2 }}>
                우리 교회 이야기부터 들려주세요
              </h1>
              <p className="mt-5 text-[16px] text-[#4b5464] sm:text-[17.5px]" style={{ lineHeight: 1.85 }}>
                지금 사이트가 없어도, 무엇이 필요한지 아직 정하지 못했어도 괜찮습니다. 교회 사정을 듣고 어떤 구성이 맞을지 먼저 정리해 드립니다.
              </p>
            </div>
            <div className="mt-10">
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-[#e7e9ee] bg-white p-8 text-center text-[15px] text-[#61697a]">
                    불러오는 중…
                  </div>
                }
              >
                <ApplyForm />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
      <KakaoInquiryButton />
    </div>
  );
}
