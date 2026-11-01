import { useState } from 'react';
import type { SermonNoteContent, SermonNoteCongregation, SermonNoteCongregationKey } from '@dw-church/api-client';
import { useDWChurchClient } from '@dw-church/api-client';
import { FormField, inputClass } from './FormField';
import { ImageUpload, MultiImageUpload } from './ImageUpload';
import { MultiFileUpload } from './MultiFileUpload';
import { NoteRichArea } from './NoteRichArea';
import { useToast } from './Toast';
import { useAuthStore } from '../stores/auth';

// 설교노트 편집기 — 온라인 주보 설교노트 섹션과 독립 설교노트 관리에서 "똑같이" 쓰는 공용 컴포넌트.
// 회중(장년/EM/Youth/어린이/Kids)별: 제목 · 본문(리치 텍스트, 한/영) · 어린이/Kids 카툰 · 회중별 소그룹 나눔질문.
/** Kids 설교노트 기본 부모 안내 문구 — 교회가 비워두면 이게 나간다. */
export const KIDS_PARENT_GUIDE = '부모가 아이에게 성경을 가르쳐 주세요.';

const btnAiClass = 'inline-flex items-center gap-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 disabled:opacity-50';
const btnGhost = 'text-sm text-blue-600 hover:underline';
const btnDelRow = 'text-red-500 hover:text-red-700 text-sm shrink-0';

const TABS: [SermonNoteCongregationKey, string][] = [
  ['adult', '청장년'], ['em', 'EM'], ['youth', 'Youth'], ['children', '어린이'], ['kids', 'Kids'],
];
type Study = NonNullable<SermonNoteCongregation['study']>;

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

  // 자동번역(LLM 비용 발생)은 슈퍼어드민만 — 일반 권한에는 버튼 자체를 숨긴다.
  const isSuperAdmin = useAuthStore((st) => !!st.session?.user?.isSuperAdmin);
  const uploadImage = async (file: File): Promise<string> => (await client!.uploadFile(file, 'sermon-notes')).url;
  // 문서(PDF·워드)는 리사이즈 대상이 아니다. 서버가 비이미지 파일은 원본 파일명을
  // R2 키에 보존하므로 다운로드 시 의미 있는 이름으로 떨어진다.
  const uploadDoc = async (file: File): Promise<string> => (await client!.uploadFile(file, 'sermon-notes')).url;
  // 실패 사유를 사람 말로. 특히 예산/할당량 소진은 반드시 알려야 한다.
  const failMsg = (reason?: string): string =>
    reason === 'quota' ? '번역 한도(예산)가 소진되어 번역하지 못했습니다. 관리자에게 문의하세요.'
    : reason === 'no_key' ? '번역 키가 설정되어 있지 않습니다.'
    : reason === 'truncated' ? '본문이 너무 길어 번역이 중간에 잘렸습니다. 나눠서 시도해주세요.'
    : '번역에 실패했습니다. 직접 입력해주세요.';

  const translateMany = async (
    texts: string[],
  ): Promise<{ map: Record<string, string>; failed: Set<string>; reason?: string }> => {
    const list = texts.map((t) => (t || '').trim()).filter(Boolean);
    if (list.length === 0) return { map: {}, failed: new Set() };
    const r = await client!.translateAdmin(list, 'en');
    return { map: r.translations, failed: new Set(r.failed ?? []), reason: r.reason };
  };

  const translateNote = async (key: SermonNoteCongregationKey) => {
    const text = (cong[key]?.text ?? '').trim();
    const title = (cong[key]?.title ?? '').trim();
    if (!text) { showToast('error', '먼저 노트(한국어)를 입력하세요.'); return; }
    setBusy(`note-${key}`);
    try {
      // 제목도 함께 번역한다(영어 제목 칸이 비어 있지 않게).
      const { map, failed, reason } = await translateMany([text, title]);
      const en = map[text] ?? '';
      // 서버는 실패해도 원문을 그대로 돌려준다(렌더링 폴백). 그걸 영어 칸에 쓰면
      // 한글이 그대로 들어가므로, 실패 목록/동일 여부를 보고 막는다.
      if (!en || failed.has(text) || en === text) { showToast('error', failMsg(reason)); return; }
      const titleEn = title ? (map[title] ?? '') : '';
      const okTitle = !!titleEn && !failed.has(title) && titleEn !== title;
      setCong(key, okTitle ? { textEn: en, titleEn } : { textEn: en });
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
      const { map, failed, reason } = await translateMany(all);
      const next: Study = { ...st };
      // 실패한 항목은 비워 둔다 — 한글을 영어 칸에 넣지 않는다.
      for (const k of keys) next[`${k}En`] = (st[k] ?? []).map((q) => {
        const t = (q ?? '').trim();
        if (!t) return '';
        const en = map[t] ?? '';
        return (!en || failed.has(t) || en === t) ? '' : en;
      });
      setCong(key, { study: next });
      const anyFail = all.some((q) => { const t = (q ?? '').trim(); return t && (failed.has(t) || (map[t] ?? '') === t || !map[t]); });
      if (anyFail) { showToast('error', failMsg(reason)); return; }
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
          <ImageUpload label="" value={content.thumbnailUrl ?? ''} onChange={(url) => onChange({ ...content, thumbnailUrl: url })} onUpload={uploadImage} resize="content" aspectRatio="3/2" />
          <p className="mt-1 text-xs text-gray-400">홈 '최근 설교노트'와 설교노트 보기 페이지에 표시됩니다. (3:2 가로형 권장 — 예: 1920×1280)</p>
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
          {isSuperAdmin && (
            <button type="button" onClick={() => void translateNote(tab)} disabled={busy === `note-${tab}`} className={btnAiClass}>
              {busy === `note-${tab}` ? '번역 중…' : '🌐 본문 영어 자동번역'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="제목 · 한국어">
            <input value={cur.title ?? ''} onChange={(e) => setCong(tab, { title: e.target.value })} placeholder="예: 기적에 머물 것인가, 사명으로 나아갈 것인가" className={inputClass} />
          </FormField>
          <FormField label="제목 · ENGLISH">
            <input value={cur.titleEn ?? ''} onChange={(e) => setCong(tab, { titleEn: e.target.value })} placeholder="예: Stay at the Miracle, or Move to the Mission?" className={inputClass} />
          </FormField>
        </div>
        <FormField label="설교노트 · 한국어">
          <NoteRichArea value={cur.text ?? ''} onChange={(v) => setCong(tab, { text: v })} uploadImage={uploadImage} placeholder="설교노트 본문 — 상단 서식 버튼(제목/굵게/인용/불릿/번호/링크/사진)을 활용하세요." />
        </FormField>
        <FormField label="설교노트 · English">
          <NoteRichArea value={cur.textEn ?? ''} onChange={(v) => setCong(tab, { textEn: v })} uploadImage={uploadImage} placeholder="English sermon note (rich text)" />
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
            <div className="md:col-span-2">
              <MultiFileUpload
                label="활동학습 자료 (PDF · 워드)"
                value={cur.activityFiles ?? []}
                onChange={(files) => setCong(tab, { activityFiles: files })}
                onUpload={uploadDoc}
                max={10}
                help="아이와 함께 풀 활동지·색칠공부 등을 올리면 설교노트 보기 페이지에서 내려받을 수 있습니다. 파일당 25MB까지. 이름 칸을 고치면 사이트에 그 이름으로 보입니다."
              />
            </div>
            {tab === 'kids' && (
              <div className="md:col-span-2">
                <FormField label="부모 안내 문구">
                  <input
                    value={cur.parentGuide ?? ''}
                    onChange={(e) => setCong(tab, { parentGuide: e.target.value })}
                    placeholder={KIDS_PARENT_GUIDE}
                    className={inputClass}
                  />
                </FormField>
                <p className="mt-1 text-xs text-gray-400">
                  Kids 설교노트 맨 위에 표시됩니다. 비워두면 기본 문구(&ldquo;{KIDS_PARENT_GUIDE}&rdquo;)가 나갑니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 회중별 소그룹 나눔 질문 */}
        <div className="border-t border-gray-100 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">소그룹 나눔 질문 ({TABS.find(([k]) => k === tab)?.[1]})</span>
            {isSuperAdmin && (
              <button type="button" onClick={() => void translateStudy(tab)} disabled={busy === `study-${tab}`} className={btnAiClass}>
                {busy === `study-${tab}` ? '번역 중…' : '🌐 질문 영어 자동번역'}
              </button>
            )}
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
