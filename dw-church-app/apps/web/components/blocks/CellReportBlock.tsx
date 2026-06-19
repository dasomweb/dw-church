'use client';

import { useState } from 'react';
import { DataSection } from './DataSection';

interface CellReportBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

// 목장사역보고서 (Cell Ministry Report) Data Block. Cell leaders submit a weekly
// report; it lands in the 폼 제출(forms) inbox under form_type 'cell_report'.
// Pure client component — POSTs to the generic /forms/:type endpoint with the
// tenant slug header. Future 교적관리 will promote attendee names into members.
export function CellReportBlock({ props, slug }: CellReportBlockProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const title = (props.title as string) || '목장 사역 보고서';
  const subtitle =
    (props.subtitle as string) ||
    '한 주간의 목장 모임을 보고해 주세요. 보고 내용은 담당 교역자에게 전달됩니다.';

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cellName?.trim()) return;
    setState('submitting');
    try {
      const res = await fetch(`${API_BASE}/api/v1/forms/cell_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug },
        body: JSON.stringify({
          cellName: form.cellName,
          leaderName: form.leaderName || undefined,
          meetingDate: form.meetingDate || undefined,
          attendeeCount: form.attendeeCount || undefined,
          attendees: form.attendees || undefined,
          visitors: form.visitors || undefined,
          offering: form.offering || undefined,
          prayerRequest: form.prayerRequest || undefined,
          report: form.report || undefined,
          notes: form.notes || undefined,
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
          <h2 className="mb-2 text-2xl font-bold font-heading">보고서가 제출되었습니다</h2>
          <p className="text-sm leading-relaxed text-gray-500">
            수고하셨습니다. 한 주간 목장을 섬겨주셔서 감사합니다.
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">목장 이름 <span className="text-red-500">*</span></label>
              <input required value={form.cellName || ''} onChange={set('cellName')} className={inputCls} placeholder="사랑목장" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">인도자</label>
              <input value={form.leaderName || ''} onChange={set('leaderName')} className={inputCls} placeholder="김목자" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">모임 날짜</label>
              <input type="date" value={form.meetingDate || ''} onChange={set('meetingDate')} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">참석 인원</label>
              <input type="number" min={0} value={form.attendeeCount || ''} onChange={set('attendeeCount')} className={inputCls} placeholder="명" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">참석자 명단</label>
            <input value={form.attendees || ''} onChange={set('attendees')} className={inputCls} placeholder="홍길동, 김철수, ..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">새가족 · 방문자</label>
            <input value={form.visitors || ''} onChange={set('visitors')} className={inputCls} placeholder="이름 / 소개" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">기도 제목</label>
            <textarea value={form.prayerRequest || ''} onChange={set('prayerRequest')} rows={3} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">모임 내용 보고</label>
            <textarea value={form.report || ''} onChange={set('report')} rows={4} className={inputCls} placeholder="말씀 나눔, 교제, 결정 사항 등" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">심방 · 특이사항</label>
            <textarea value={form.notes || ''} onChange={set('notes')} rows={2} className={inputCls} />
          </div>
          {state === 'error' && (
            <p className="text-sm text-red-600">제출 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
          )}
          <button
            type="submit"
            disabled={state === 'submitting' || !form.cellName?.trim()}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {state === 'submitting' ? '제출 중...' : '보고서 제출'}
          </button>
        </form>
      </div>
    </DataSection>
  );
}
