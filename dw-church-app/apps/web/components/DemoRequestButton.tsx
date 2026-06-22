'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

type Lang = 'ko' | 'en';

const COPY: Record<Lang, {
  button: string; title: string; subtitle: string;
  name: string; church: string; email: string; phone: string; message: string;
  submit: string; sending: string; done: string; doneDesc: string; close: string; error: string;
}> = {
  ko: {
    button: '데모 체험 신청',
    title: '데모 체험 신청',
    subtitle: '실제 관리자 화면을 직접 둘러보세요. 접속 정보를 이메일로 보내드립니다.',
    name: '이름', church: '교회명', email: '이메일', phone: '연락처 (선택)', message: '문의사항 (선택)',
    submit: '신청하기', sending: '신청 중…', done: '신청이 접수되었습니다',
    doneDesc: '담당자가 확인 후 접속 정보를 보내드리겠습니다. 감사합니다.', close: '닫기',
    error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
  en: {
    button: 'Try the demo',
    title: 'Request a demo',
    subtitle: 'Explore the real admin dashboard. We will email you the access info.',
    name: 'Name', church: 'Church', email: 'Email', phone: 'Phone (optional)', message: 'Message (optional)',
    submit: 'Request', sending: 'Sending…', done: 'Request received',
    doneDesc: 'We will review and send your access info shortly. Thank you.', close: 'Close',
    error: 'Something went wrong. Please try again in a moment.',
  },
};

export default function DemoRequestButton({ lang = 'ko', className }: { lang?: Lang; className?: string }) {
  const t = COPY[lang];
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  // createPortal needs document.body — only available after mount (SSR-safe).
  useEffect(() => { setMounted(true); }, []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', churchName: '', email: '', phone: '', message: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/demo-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
    } catch {
      setErr(t.error);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    // Reset after the close animation so a reopened modal is fresh.
    setTimeout(() => { setSent(false); setErr(''); setForm({ name: '', churchName: '', email: '', phone: '', message: '' }); }, 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'rounded-lg bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:bg-gray-100 sm:px-8 sm:text-base'}
      >
        {t.button}
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8 text-left">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t.done}</h3>
                <p className="mt-2 text-sm text-gray-600">{t.doneDesc}</p>
                <button onClick={close} className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
                  {t.close}
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 className="text-lg font-bold text-gray-900">{t.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
                <div className="mt-5 space-y-3">
                  <input required value={form.name} onChange={set('name')} placeholder={t.name}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input value={form.churchName} onChange={set('churchName')} placeholder={t.church}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input required type="email" value={form.email} onChange={set('email')} placeholder={t.email}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input value={form.phone} onChange={set('phone')} placeholder={t.phone}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <textarea value={form.message} onChange={set('message')} placeholder={t.message} rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={close} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    {t.close}
                  </button>
                  <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {busy ? t.sending : t.submit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
