/**
 * InfoColumnsField — info_columns 블록의 `items`(정보 칸) 편집기.
 * 각 칸 = { title, variant, rows:[{label,value}] }.
 *   - variant 'split'(기본): 라벨 왼쪽 / 값 오른쪽 (예배 시간표)
 *   - variant 'list': 고정폭 라벨 + 설명 (처음 오시는 분께)
 * 칸 추가/삭제/순서 + 칸별 제목·형식 + 행(라벨/값) 추가/삭제.
 * 스토어프론트 InfoColumnsBlock 이 렌더하는 shape 와 동일 — 변환 없음.
 *
 * 대표님 2026-09-06: 좁은 인스펙터에서 값 입력칸이 0폭으로 찌그러져 안 보이던
 * 문제 fix — 행 입력은 w-full 없이 label(고정폭)+value(flex-1 min-w-0)로 배치.
 * 라벨/값 구분 헤더를 칸마다 한 번 노출해 어느 칸이 뭔지 즉시 보이게 함.
 */
export interface InfoRow { label?: string; value?: string }
export interface InfoItem { title?: string; variant?: string; rows?: InfoRow[]; content?: string }

// 행 입력용 클래스 — INP 와 달리 w-full 을 넣지 않는다(flex 자식이라 폭은 flex 가 결정).
const FLD = 'rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500';
const TITLE = 'w-full rounded border border-gray-300 px-2 py-1 text-xs font-semibold outline-none focus:border-blue-500';

export function InfoColumnsField({
  value,
  onChange,
}: {
  value: InfoItem[];
  onChange: (v: InfoItem[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const setItem = (i: number, patch: Partial<InfoItem>) =>
    onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const addItem = () => onChange([...items, { title: '', variant: 'split', rows: [{ label: '', value: '' }] }]);
  const delItem = (i: number) => onChange(items.filter((_, k) => k !== i));
  const moveItem = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= items.length) return;
    const a = [...items]; const t = a[i]!; a[i] = a[j]!; a[j] = t; onChange(a);
  };
  const rowsOf = (it: InfoItem) => (Array.isArray(it.rows) ? it.rows : []);
  const setRow = (i: number, ri: number, patch: Partial<InfoRow>) =>
    setItem(i, { rows: rowsOf(items[i]!).map((r, k) => (k === ri ? { ...r, ...patch } : r)) });
  const addRow = (i: number) => setItem(i, { rows: [...rowsOf(items[i]!), { label: '', value: '' }] });
  const delRow = (i: number, ri: number) => setItem(i, { rows: rowsOf(items[i]!).filter((_, k) => k !== ri) });

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const isList = it.variant === 'list';
        return (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/60 p-2.5">
            {/* 칸 헤더 — 번호 배지 + 제목 + 이동/삭제 */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded bg-gray-300/70 text-[10px] font-bold text-gray-600">{i + 1}</span>
              <input className={`${TITLE} flex-1`} placeholder="칸 제목 (예: 주일예배 Sunday)" value={it.title ?? ''} onChange={(e) => setItem(i, { title: e.target.value })} />
              <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="위로">↑</button>
              <button type="button" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="아래로">↓</button>
              <button type="button" onClick={() => delItem(i)} className="px-1 text-gray-300 hover:text-red-600" title="칸 삭제">×</button>
            </div>

            {/* 형식 */}
            <label className="mb-2 flex items-center gap-2 text-[11px] text-gray-500">
              형식
              <select className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-[11px]" value={it.variant ?? 'split'} onChange={(e) => setItem(i, { variant: e.target.value })}>
                <option value="split">값을 오른쪽에 (예배 시간표)</option>
                <option value="list">라벨 + 설명 (안내)</option>
              </select>
            </label>

            {/* 행 목록 — 라벨/값 구분 헤더 + 입력 */}
            <div className="rounded-md border border-gray-200 bg-white p-2">
              <div className="mb-1 flex items-center gap-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <span className="w-24 flex-none">라벨</span>
                <span className="flex-1">{isList ? '설명' : '값'}</span>
                <span className="w-4 flex-none" />
              </div>
              <div className="space-y-1">
                {rowsOf(it).map((r, ri) => (
                  <div key={ri} className="flex items-center gap-1">
                    <input className={`${FLD} w-24 flex-none`} placeholder={isList ? '항목명' : '예: 한국어 예배'} value={r.label ?? ''} onChange={(e) => setRow(i, ri, { label: e.target.value })} />
                    <input className={`${FLD} min-w-0 flex-1`} placeholder={isList ? '예: 교회 뒤편 무료 주차장' : '예: 11:00 AM'} value={r.value ?? ''} onChange={(e) => setRow(i, ri, { value: e.target.value })} />
                    <button type="button" onClick={() => delRow(i, ri)} className="w-4 flex-none text-gray-300 hover:text-red-600" title="행 삭제">×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addRow(i)} className="mt-1.5 text-[11px] font-semibold text-blue-600 hover:underline">+ 행 추가</button>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={addItem} className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50">+ 칸 추가</button>
    </div>
  );
}
