import { LinkField } from './LinkField';

export interface ButtonItem { text: string; url: string }

/**
 * ButtonsField — 버튼을 원하는 만큼 추가/삭제하는 편집기(라벨 + 링크). 블록 인스펙터의
 * kind:'buttons' 에서 사용. props[path] 는 [{text,url}, ...] 배열. (대표님: "버튼 추가하는
 * 것으로 만들고" — 기도 요청 / 심방 신청처럼 원하는 버튼을 자유롭게 추가.)
 */
export function ButtonsField({
  value,
  onChange,
}: {
  value: ButtonItem[];
  onChange: (v: ButtonItem[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const set = (i: number, patch: Partial<ButtonItem>) =>
    onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const add = () => onChange([...items, { text: '버튼', url: '' }]);
  const del = (i: number) => onChange(items.filter((_, k) => k !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const n = [...items]; const a = n[i]!; n[i] = n[j]!; n[j] = a; onChange(n);
  };

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-md border border-gray-200 p-2">
          <div className="flex items-center gap-1">
            <input
              value={it.text ?? ''}
              onChange={(e) => set(i, { text: e.target.value })}
              placeholder="버튼 텍스트 (예: 기도 요청)"
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="위로">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="아래로">↓</button>
            <button type="button" onClick={() => del(i)} className="px-1 text-gray-300 hover:text-red-600" title="삭제">×</button>
          </div>
          <div className="mt-1">
            <LinkField value={it.url ?? ''} onChange={(url) => set(i, { url })} />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50">
        + 버튼 추가
      </button>
    </div>
  );
}
