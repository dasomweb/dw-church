import { useState } from 'react';
import type { SermonNoteContent, SermonNoteCongregation, SermonNoteCongregationKey } from '@dw-church/api-client';
import { useDWChurchClient } from '@dw-church/api-client';
import { FormField, inputClass } from './FormField';
import { MultiImageUpload } from './ImageUpload';
import { useToast } from './Toast';

// 설교노트 편집기 — 온라인 주보 설교노트 섹션과 독립 설교노트 관리에서 "똑같이" 사용하는 공용 컴포넌트.
// 회중(장년/EM/Youth/어린이/Kids)별 제목·본문(마크다운, 한/영) + 어린이/Kids 카툰 + 소그룹 나눔질문.
const btnAiClass = 'inline-flex items-center gap-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 disabled:opacity-50';
const btnGhost = 'text-sm text-blue-600 hover:underline';
const btnDelRow = 'text-red-500 hover:text-red-700 text-sm shrink-0';

const TABS: [SermonNoteCongregationKey, string][] = [
  ['adult', '장년'], ['em', 'EM'], ['youth', 'Youth'], ['children', '어린이'], ['kids', 'Kids'],
];

const NOTE_PLACEHOLDER = `# 설교 제목
## 소제목
본문 내용을 문단으로 씁니다.

- 불릿 항목
1. 번호 목록
> 인용 / 성경 구절
--- (구분선)`;

export function SermonNoteEditor({ content, onChange }: { content: SermonNoteContent; onChange: (next: SermonNoteContent) => void }) {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<SermonNoteCongregationKey>('adult');
  const [busy, setBusy] = useState<string | null>(null);

  const cong = content.congregations ?? {};
  const study = content.study ?? {};
  const cur: SermonNoteCongregation = cong[tab] ?? {};

  const setCong = (key: SermonNoteCongregationKey, patch: Partial<SermonNoteCongregation>) =>
    onChange({ ...content, congregations: { ...cong, [key]: { ...(cong[key] ?? {}), ...patch } } });
  const setStudy = (patch: Partial<NonNullable<SermonNoteContent['study']>>) =>
    onChange({ ...content, study: { ...study, ...patch } });

  const uploadImage = async (file: File): Promise<string> => (await client!.uploadFile(file, 'sermon-notes')).url;
  const translateMany = async (texts: string[]): Promise<Record<string, string>> => {
    const list = texts.map((t) => (t || '').trim()).filter(Boolean);
    if (list.length === 0) return {};
    return client!.translate(list, 'en');
  };

  const translateNote = async (key: SermonNoteCongregationKey) => {
    const text = (cong[key]?.text ?? '').trim();
    if (!text) { showToast('error', '먼저 노트(한국어)를 입력하세요.'); return; }
    setBusy(`note-${key}`);
    try {
      const map = await translateMany([text]);
      const en = map[text] ?? '';
      if (!en) { showToast('error', '번역에 실패했습니다. 직접 입력해주세요.'); return; }
      setCong(key, { textEn: en });
      showToast('success', '영어로 번역했습니다. 확인해주세요.');
    } catch { showToast('error', '번역에 실패했습니다.'); }
    finally { setBusy(null); }
  };

  const translateStudy = async () => {
    const keys = ['observation', 'correlation', 'application'] as const;
    const all = keys.flatMap((k) => study[k] ?? []);
    if (!all.some((q) => (q || '').trim())) { showToast('error', '먼저 나눔 질문을 입력하세요.'); return; }
    setBusy('study');
    try {
      const map = await translateMany(all);
      const next = { ...study };
      for (const k of keys) next[`${k}En`] = (study[k] ?? []).map((q) => (q?.trim() ? (map[q.trim()] ?? '') : ''));
      onChange({ ...content, study: next });
      showToast('success', '나눔 질문을 영어로 번역했습니다. 확인해주세요.');
    } catch { showToast('error', '번역에 실패했습니다.'); }
    finally { setBusy(null); }
  };

  const hasCartoon = tab === 'children' || tab === 'kids';

  return (
    <div className="space-y-4">
      <FormField label="성경 본문 (선택)">
        <input value={content.scripture ?? ''} onChange={(e) => onChange({ ...content, scripture: e.target.value })} placeholder="예: 요한복음 5:1–18" className={inputClass} />
      </FormField>

      {/* 회중 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([k, label]) => {
          const filled = !!((cong[k]?.text || '').trim() || (cong[k]?.title || '').trim() || (cong[k]?.cartoonImageUrls?.length));
          return (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${tab === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {label}{filled ? ' •' : ''}
            </button>
          );
        })}
      </div>

      {/* 선택 회중 편집 */}
      <div className="rounded-lg border border-gray-200 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{TABS.find(([k]) => k === tab)?.[1]} 설교노트</span>
          <button type="button" onClick={() => void translateNote(tab)} disabled={busy === `note-${tab}`} className={btnAiClass}>
            {busy === `note-${tab}` ? '번역 중…' : '🌐 영어 자동번역'}
          </button>
        </div>
        <FormField label="제목">
          <input value={cur.title ?? ''} onChange={(e) => setCong(tab, { title: e.target.value })} placeholder="예: 기적에 머물 것인가, 사명으로 나아갈 것인가" className={inputClass} />
        </FormField>
        <FormField label="설교노트 · 한국어">
          <textarea value={cur.text ?? ''} onChange={(e) => setCong(tab, { text: e.target.value })} rows={14} placeholder={NOTE_PLACEHOLDER} className={`${inputClass} font-mono text-sm`} />
        </FormField>
        <FormField label="설교노트 · English">
          <textarea value={cur.textEn ?? ''} onChange={(e) => setCong(tab, { textEn: e.target.value })} rows={14} placeholder="English sermon note (markdown)" className={`${inputClass} font-mono text-sm`} />
        </FormField>

        {hasCartoon && (
          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">설교 카툰 · 한국어</p>
              <MultiImageUpload value={cur.cartoonImageUrls ?? []} onChange={(urls) => setCong(tab, { cartoonImageUrls: urls })} onUpload={uploadImage} resize="content" max={12} label="" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Sermon cartoon · English</p>
              <MultiImageUpload value={cur.cartoonImageUrlsEn ?? []} onChange={(urls) => setCong(tab, { cartoonImageUrlsEn: urls })} onUpload={uploadImage} resize="content" max={12} label="" />
            </div>
          </div>
        )}
      </div>

      {/* 소그룹 나눔 질문 (전체 공용) */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">소그룹 나눔 질문 (본문 연계)</span>
          <button type="button" onClick={() => void translateStudy()} disabled={busy === 'study'} className={btnAiClass}>
            {busy === 'study' ? '번역 중…' : '🌐 영어 자동번역'}
          </button>
        </div>
        <BilingualQuestionList label="관찰 질문" items={study.observation ?? []} itemsEn={study.observationEn ?? []} onChange={(ko, en) => setStudy({ observation: ko, observationEn: en })} />
        <BilingualQuestionList label="상관 질문" items={study.correlation ?? []} itemsEn={study.correlationEn ?? []} onChange={(ko, en) => setStudy({ correlation: ko, correlationEn: en })} />
        <BilingualQuestionList label="적용 질문" items={study.application ?? []} itemsEn={study.applicationEn ?? []} onChange={(ko, en) => setStudy({ application: ko, applicationEn: en })} />
      </div>
    </div>
  );
}

function BilingualQuestionList({ label, items, itemsEn, onChange }: { label: string; items: string[]; itemsEn: string[]; onChange: (items: string[], itemsEn: string[]) => void }) {
  const ko = items ?? [];
  const en = itemsEn ?? [];
  const enAt = (i: number) => en[i] ?? '';
  const setKo = (i: number, v: string) => onChange(ko.map((x, idx) => (idx === i ? v : x)), ko.map((_, idx) => enAt(idx)));
  const setEn = (i: number, v: string) => onChange(ko, ko.map((_, idx) => (idx === i ? v : enAt(idx))));
  const add = () => onChange([...ko, ''], [...ko.map((_, i) => enAt(i)), '']);
  const remove = (i: number) => onChange(ko.filter((_, idx) => idx !== i), ko.map((_, idx) => enAt(idx)).filter((_, idx) => idx !== i));
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <div className="space-y-2">
        {ko.map((q, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-5 shrink-0 pt-2.5 font-mono text-xs text-gray-400">{i + 1}.</span>
            <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
              <textarea value={q} onChange={(e) => setKo(i, e.target.value)} rows={2} placeholder="질문 (한국어)" className={inputClass} />
              <textarea value={enAt(i)} onChange={(e) => setEn(i, e.target.value)} rows={2} placeholder="Question (English)" className={inputClass} />
            </div>
            <button type="button" onClick={() => remove(i)} className={`${btnDelRow} pt-2`}>삭제</button>
          </div>
        ))}
        <button type="button" onClick={add} className={btnGhost}>+ {label} 추가</button>
      </div>
    </div>
  );
}
