import { useRef, useState } from 'react';
import { resizeImage } from '../utils/resize-image.js';

/**
 * NoteRichArea — 마크다운으로 저장하는 "노트 본문" 입력기.
 * 설교노트(SermonNoteEditor)와 말씀 묵상(DevotionManagement)이 **같은 컴포넌트**를 쓴다.
 *
 * 저장 형식: 제목 #/##/###, **굵게**, *기울임*, > 인용, - 불릿, 1. 번호,
 *            [텍스트](URL), --- 구분선, ![캡션](주소) 사진.
 * 스토어프론트는 apps/web/components/blocks/note-markdown.tsx 가 같은 규칙으로 렌더한다.
 * ⚠️ 한쪽만 고치면 본문에 날것의 마크다운 글자가 박힌다 — 규칙을 바꾸면 양쪽 + 테스트
 *    (apps/server/src/__tests__/modules/note-image-md.test.ts)를 함께 고칠 것.
 */
export function NoteRichArea({ value, onChange, placeholder, rows = 14, uploadImage }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
  /** 주면 툴바에 '사진' 버튼이 생긴다. 올린 뒤 커서 자리에 ![](주소) 를 넣는다. */
  uploadImage?: (file: File) => Promise<string>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
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
  // 사진은 **한 줄을 통째로** 차지하게 넣는다 — 스토어프론트 렌더러가 줄 전체가
  // ![](...) 일 때만 이미지로 본다(문장 중간 혼용은 서식 규칙과 충돌해 안 받는다).
  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !uploadImage) return;
    setImgBusy(true);
    setImgError(null);
    try {
      for (const f of files) {
        // R2 에 올리기 전 반드시 클라이언트 리사이즈 — 저장 용량이 하드 제약이다.
        // 본문 사진은 'content'(최대 1000px, JPEG). [[feedback_image_resize]]
        const url = await uploadImage((await resizeImage(f, 'content')).file);
        insertLine(`![](${url})`);
      }
    } catch (e) {
      // 업로드 실패는 본문을 건드리지 않는다 — 깨진 마크다운이 남는 게 더 나쁘다.
      // 대신 왜 안 들어갔는지는 반드시 알려 준다(조용한 실패가 가장 나쁘다).
      setImgError(e instanceof Error ? e.message : '사진을 올리지 못했습니다. 다시 시도해주세요.');
    } finally {
      setImgBusy(false);
      if (imgRef.current) imgRef.current.value = '';
    }
  };
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
        {uploadImage && (
          <>
            <span className="mx-1 text-gray-200">|</span>
            <button type="button" onClick={() => imgRef.current?.click()} disabled={imgBusy} className={`${b} disabled:opacity-50`} title="본문 중간에 사진 넣기">
              {imgBusy ? '올리는 중…' : '🖼 사진'}
            </button>
            <input ref={imgRef} type="file" accept="image/*" multiple onChange={pickImage} className="hidden" />
          </>
        )}
      </div>
      {imgError && <p className="border-b border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-600">{imgError}</p>}
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full resize-y border-0 px-3 py-2.5 font-mono text-sm leading-[1.7] focus:outline-none focus:ring-0" />
    </div>
  );
}
