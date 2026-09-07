import { useEffect, useRef, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';

interface Board { id: string; title: string; slug: string }

/**
 * BoardMultiSelectField — 게시판 블록의 소스(게시판)를 dropdown 체크박스로 여러 개
 * 선택. props.boardSlugs = string[] (선택한 게시판 slug 배열)로 저장.
 * 대표님 2026-09-06: "게시판도 선택해서 가져올 수 있도록 dropdown으로, 여러개를".
 *
 * 단일 slug(props.boardSlug) 하위호환: 상위(BLOCK_DEFS/registry)에서 초기값을
 * [boardSlug]로 넘겨주면 여기서 배열로만 다룬다.
 *
 * BoardSelectField 와 동일하게 client.adapter 로 직접 fetch — super-admin 빌더에서
 * 훅 캐시가 테넌트 slug 설정 이전의 빈 값으로 굳는 걸 피한다.
 */
export function BoardMultiSelectField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const client = useDWChurchClient();
  const [boards, setBoards] = useState<Board[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selected = Array.isArray(value) ? value : [];

  useEffect(() => {
    if (!client) return;
    let alive = true;
    (async () => {
      try {
        const res = await client.adapter.get<{ data: Board[] }>('/api/v1/boards');
        if (alive) setBoards(res?.data ?? []);
      } catch { /* leave empty */ }
    })();
    return () => { alive = false; };
  }, [client]);

  // 바깥 클릭 시 닫기.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (slug: string) => {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  };

  const labelOf = (slug: string) => boards.find((b) => b.slug === slug)?.title ?? slug;
  const summary = selected.length === 0
    ? '게시판 선택…'
    : selected.length === 1
      ? labelOf(selected[0]!)
      : `${labelOf(selected[0]!)} 외 ${selected.length - 1}개`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-2 py-1.5 text-left text-sm outline-none focus:border-blue-500"
      >
        <span className={selected.length ? 'text-gray-900' : 'text-gray-400'}>{summary}</span>
        <span className="ml-2 text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {boards.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">등록된 게시판이 없습니다.</div>
          ) : (
            boards.map((b) => (
              <label key={b.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={selected.includes(b.slug)}
                  onChange={() => toggle(b.slug)}
                />
                <span className="flex-1 truncate">{b.title}</span>
                <span className="text-[10px] text-gray-400">{b.slug}</span>
              </label>
            ))
          )}
        </div>
      )}
      {selected.length > 1 && (
        <p className="mt-1 text-[11px] text-gray-400">여러 게시판을 선택하면 사이트에서 게시판별로 나뉘어 표시됩니다.</p>
      )}
    </div>
  );
}
