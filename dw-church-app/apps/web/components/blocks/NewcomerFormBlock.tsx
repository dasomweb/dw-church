'use client';

import { useState } from 'react';
import { DataSection } from './DataSection';

interface NewcomerFormBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

// 새가족 등록 폼 (Static Block, Pro tier). Public visitors submit their info; it
// lands in the 새가족 관리 inbox. Pure client component — POSTs to the public
// /newcomers endpoint with the tenant slug header.
export function NewcomerFormBlock({ props, slug }: NewcomerFormBlockProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const title = (props.title as string) || '새가족 등록';
  const subtitle = (props.subtitle as string) || '저희 교회를 찾아주셔서 감사합니다. 아래 정보를 남겨주시면 따뜻하게 안내해 드리겠습니다.';

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setState('submitting');
    try {
      const res = await fetch(`${API_BASE}/api/v1/newcomers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          birthDate: form.birthDate || undefined,
          gender: form.gender || undefined,
          prevChurch: form.prevChurch || undefined,
          visitPath: form.visitPath || undefined,
          faithStatus: form.faithStatus || undefined,
          familyInfo: form.familyInfo || undefined,
          prayerRequest: form.prayerRequest || undefined,
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
      <DataSection props={props} defaultBg="var(--dw-surface)" paddingClassName="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: 'var(--dw-border, #e5e7eb)' }}>
          <div className="mb-3 text-4xl">🙏</div>
          <h2 className="mb-2 text-2xl font-bold font-heading">등록해 주셔서 감사합니다</h2>
          <p className="text-sm leading-relaxed text-gray-500">
            남겨주신 정보로 곧 연락드리겠습니다. 주님의 은혜가 함께하시길 바랍니다.
          </p>
        </div>
      </DataSection>
    );
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)" paddingClassName="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold font-heading">{title}</h2>
          <p className="text-sm leading-relaxed text-gray-500">{subtitle}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: 'var(--dw-border, #e5e7eb)' }}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">이름 <span className="text-red-500">*</span></label>
            <input required value={form.name || ''} onChange={set('name')} className={inputCls} placeholder="홍길동" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">연락처</label>
              <input value={form.phone || ''} onChange={set('phone')} className={inputCls} placeholder="010-0000-0000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">이메일</label>
              <input type="email" value={form.email || ''} onChange={set('email')} className={inputCls} placeholder="name@email.com" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">주소</label>
            <input value={form.address || ''} onChange={set('address')} className={inputCls} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">신앙 상태</label>
              <select value={form.faithStatus || ''} onChange={set('faithStatus')} className={inputCls}>
                <option value="">선택</option>
                <option value="초신자">초신자 (처음 믿음)</option>
                <option value="기신자">기신자 (신앙 경험 있음)</option>
                <option value="수평이동">다른 교회에서 옮김</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">이전 교회</label>
              <input value={form.prevChurch || ''} onChange={set('prevChurch')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">어떻게 오시게 되었나요?</label>
            <input value={form.visitPath || ''} onChange={set('visitPath')} className={inputCls} placeholder="지인 소개, 검색, 이사 등" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">함께 오신 가족</label>
            <input value={form.familyInfo || ''} onChange={set('familyInfo')} className={inputCls} placeholder="배우자, 자녀 등" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">기도 제목</label>
            <textarea value={form.prayerRequest || ''} onChange={set('prayerRequest')} rows={3} className={inputCls} />
          </div>
          {state === 'error' && (
            <p className="text-sm text-red-600">등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
          )}
          <button
            type="submit"
            disabled={state === 'submitting' || !form.name?.trim()}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {state === 'submitting' ? '등록 중...' : '등록하기'}
          </button>
        </form>
      </div>
    </DataSection>
  );
}
