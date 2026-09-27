import { useRef, useState } from 'react';
import type { SermonNoteContent, SermonNoteCongregation, SermonNoteCongregationKey } from '@dw-church/api-client';
import { useDWChurchClient } from '@dw-church/api-client';
import { FormField, inputClass } from './FormField';
import { ImageUpload, MultiImageUpload } from './ImageUpload';
import { useToast } from './Toast';

// 설교노트 편집기 — 온라인 주보 설교노트 섹션과 독립 설교노트 관리에서 "똑같이" 쓰는 공용 컴포넌트.
// 회중(장년/EM/Youth/어린이/Kids)별: 제목 · 본문(리치 텍스트, 한/영) · 어린이/Kids 카툰 · 회중별 소그룹 나눔질문.
const btnAiClass = 'inline-flex items-center gap-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 disabled:opacity-50';
const btnGhost = 'text-sm text-blue-600 hover:underline';
const btnDelRow = 'text-red-500 hover:text-red-700 text-sm shrink-0';

const TABS: [SermonNoteCongregationKey, string][] = [
  ['adult', '청장년'], ['em', 'EM'], ['youth', 'Youth'], ['children', '어린이'], ['kids', 'Kids'],
];
type Study = NonNullable<SermonNoteCongregation['study']>;

// ── 리치 텍스트 입력 (마크다운 저장) — 스토어프론트가 동일 규칙으로 렌더 ──
// 제목 #/##/###, **굵게**, *기울임*, > 인용, - 불릿, 1. 번호, [텍스트](URL), --- 구분선.
function NoteRichArea({ value, onChange, placeholder, rows = 14 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const apply = (make: (sel: string, v: string, s: number, e: number) => { text: string; ns: number; ne: number }) => {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const { text, ns, ne } = make(value.slice(s, e), value, s, e);
    onChange(text);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ns, ne); });
  };
  const wrap = (b: string, a: string) => apply((sel, v, s, e) => ({ text: v.slice(0, s) + b + sel + a + v.slice(e), ns: s + b.length, ne: e + b.length }));
  const prefixLine = (pfx: string) => apply((_sel, v, s, e) => {
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    const nl = v.indexOf('\n', e); const le = nl === -1 ? v.length : nl;
    const block = v.slice(ls, le).split('\n').map((l) => pfx + l.replace(/^(#{1,6}\s|>\s|-\s|\d+\.\s)/, '')).join('\n');
    return { text: v.slice(0, ls) + block + v.slice(le), ns: ls, ne: ls + block.length };
  });
  const insertLine = (txt: string) => apply((_sel, v, s) => {
    const pre = s > 0 && v[s - 1] !== '\n' ? '\n' : '';
    const ins = `${pre}${txt}\n`;
    return { text: v.slice(0, s) + ins + v.slice(s), ns: s + ins.length, ne: s + ins.length };
  });
  const link = () => { const u = window.prompt('링크 URL을 입력하세요', 'https://'); if (u) wrap('[', `](${u})`); };
  const b = 'px-1.5 py-0.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded';
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/60 px-2 py-1.5">
        <button type="button" onClick={() => prefixLine('## ')} className={b} title="제목">제목</button>
        <button type="button" onClick={() => prefixLine('### ')} className={b} title="소제목">소제목</button>
        <span className="mx-1 text-gray-200">|</span>
        <button type="button" onClick={() => wrap('**', '**')} className={`${b} font-bold`} title="굵게">B</button>
        <button type="button" onClick={() => wrap('*', '*')} className={`${b} italic`} title="기울임">/</button>
        <button type="button" onClick={() => prefixLine('> ')} className={b} title="인용">인용</button>
        <span className="mx-1 text-gray-200">|</span>
        <button type="button" onClick={() => prefixLine('- ')} className={b} title="불릿">•</button>
        <button type="button" onClick={() => prefixLine('1. ')} className={b} title="번호">1.</button>
        <button type="button" onClick={link} className={b} title="링크">링크</button>
        <button type="button" onClick={() => insertLine('---')} className={b} title="구분선">―</button>
      </div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full resize-y border-0 px-3 py-2.5 font-mono text-sm leading-[1.7] focus:outline-none focus:ring-0" />
    </div>
  );
}

export function SermonNoteEditor({ content, onChange }: { content: SermonNoteContent; onChange: (next: SermonNoteContent) => void }) {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<SermonNoteCongregationKey>('adult');
  const [busy, setBusy] = useState<string | null>(null);

  const cong = content.congregations ?? {};
  const cur: SermonNoteCongregation = cong[tab] ?? {};
  // 하위호환: 회중별 study 없고 최상위 content.study 가 있으면 청장년에서 폴백 노출.
  const curStudy: Study = cur.study ?? (tab === 'adult' ? (content.study ?? {}) : {});

  const setCong = (key: SermonNoteCongregationKey, patch: Partial<SermonNoteCongregation>) =>
    onChange({ ...content, congregations: { ...cong, [key]: { ...(cong[key] ?? {}), ...patch } } });
  const setStudy = (key: SermonNoteCongregationKey, patch: Partial<Study>) =>
    setCong(key, { study: { ...(cong[key]?.study ?? (key === 'adult' ? content.study : {}) ?? {}), ...patch } });

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

  const translateStudy = async (key: SermonNoteCongregationKey) => {
    const st = curStudy;
    const keys = ['observation', 'correlation', 'application'] as const;
    const all = keys.flatMap((k) => st[k] ?? []);
    if (!all.some((q) => (q || '').trim())) { showToast('error', '먼저 나눔 질문을 입력하세요.'); return; }
    setBusy(`study-${key}`);
    try {
      const map = await translateMany(all);
      const next: Study = { ...st };
      for (const k of keys) next[`${k}En`] = (st[k] ?? []).map((q) => (q?.trim() ? (map[q.trim()] ?? '') : ''));
      setCong(key, { study: next });
      showToast('success', '나눔 질문을 영어로 번역했습니다. 확인해주세요.');
    } catch { showToast('error', '번역에 실패했습니다.'); }
    finally { setBusy(null); }
  };

  const hasCartoon = tab === 'children' || tab === 'kids';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_240px]">
        <FormField label="성경 본문 (선택)">
          <input value={content.scripture ?? ''} onChange={(e) => onChange({ ...content, scripture: e.target.value })} placeholder="예: 요한복음 5:1–18" className={inputClass} />
        </FormField>
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">대표 이미지</p>
          <ImageUpload label="" value={content.thumbnailUrl ?? ''} onChange={(url) => onChange({ ...content, thumbnailUrl: url })} onUpload={uploadImage} resize="content" aspectRatio="4/3" />
          <p className="mt-1 text-xs text-gray-400">홈 '최근 설교노트'에 표시됩니다.</p>
        </div>
      </div>

      {/* 회중 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([k, label]) => {
          const c = cong[k];
          const st = c?.study ?? (k === 'adult' ? content.study : undefined);
          const filled = !!((c?.text || '').trim() || (c?.title || '').trim() || (c?.cartoonImageUrls?.length) || (st && ['observation', 'correlation', 'application'].some((q) => ((st as any)[q] ?? []).some((x: string) => (x || '').trim()))));
          return (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${tab === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {label}{filled ? ' •' : ''}
            </button>
          );
        })}
      </div>

      {/* 선택 회중 편집 */}
      <div className="rounded-lg border border-gray-200 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{TABS.find(([k]) => k === tab)?.[1]} 설교노트</span>
          <button type="button" onClick={() => void translateNote(tab)} disabled={busy === `note-${tab}`} className={btnAiClass}>
            {busy === `note-${tab}` ? '번역 중…' : '🌐 본문 영어 자동번역'}
          </button>
        </div>
        <FormField label="제목">
          <input value={cur.title ?? ''} onChange={(e) => setCong(tab, { title: e.target.value })} placeholder="예: 기적에 머물 것인가, 사명으로 나아갈 것인가" className={inputClass} />
        </FormField>
        <FormField label="설교노트 · 한국어">
          <NoteRichArea value={cur.text ?? ''} onChange={(v) => setCong(tab, { text: v })} placeholder="설교노트 본문 — 상단 서식 버튼(제목/굵게/인용/불릿/번호/링크)을 활용하세요." />
        </FormField>
        <FormField label="설교노트 · English">
          <NoteRichArea value={cur.textEn ?? ''} onChange={(v) => setCong(tab, { textEn: v })} placeholder="English sermon note (rich text)" />
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

        {/* 회중별 소그룹 나눔 질문 */}
        <div className="border-t border-gray-100 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">소그룹 나눔 질문 ({TABS.find(([k]) => k === tab)?.[1]})</span>
            <button type="button" onClick={() => void translateStudy(tab)} disabled={busy === `study-${tab}`} className={btnAiClass}>
              {busy === `study-${tab}` ? '번역 중…' : '🌐 질문 영어 자동번역'}
            </button>
          </div>
          <BilingualQuestionList label="관찰 질문" items={curStudy.observation ?? []} itemsEn={curStudy.observationEn ?? []} onChange={(ko, en) => setStudy(tab, { observation: ko, observationEn: en })} />
          <BilingualQuestionList label="상관 질문" items={curStudy.correlation ?? []} itemsEn={curStudy.correlationEn ?? []} onChange={(ko, en) => setStudy(tab, { correlation: ko, correlationEn: en })} />
          <BilingualQuestionList label="적용 질문" items={curStudy.application ?? []} itemsEn={curStudy.applicationEn ?? []} onChange={(ko, en) => setStudy(tab, { application: ko, applicationEn: en })} />
        </div>
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
