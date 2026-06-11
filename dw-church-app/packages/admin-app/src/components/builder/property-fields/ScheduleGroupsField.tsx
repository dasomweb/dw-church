import { Fragment } from 'react';

/**
 * Repeater editor for the `schedule_split` block's `groups` prop. Each
 * group is a titled schedule table: { title, columns[], rows[][] }. The
 * operator can add / remove / reorder groups, edit each group's title and
 * column headers, and add / remove / edit rows.
 *
 * Ported from the tenant PageEditor's ScheduleGroupsEditor so the
 * super-admin builder edits the SAME data shape the storefront
 * ScheduleSplitBlock renders ({ title, columns, rows }) — no transform.
 *
 * Reorder controls (▲ / ▼) are added on top of the tenant editor since
 * the builder's inspector lacks the drag-to-reorder the tenant canvas has.
 */

export interface ScheduleGroup {
  title?: string;
  columns?: string[];
  rows?: string[][];
}

export interface ScheduleGroupsFieldProps {
  value: ScheduleGroup[];
  onChange: (next: ScheduleGroup[]) => void;
}

export function ScheduleGroupsField({ value, onChange }: ScheduleGroupsFieldProps) {
  const groups = Array.isArray(value) ? value : [];
  const colsOf = (g: ScheduleGroup) => (g.columns && g.columns.length ? g.columns : ['예배', '시간', '장소']);

  const setGroup = (gi: number, patch: Partial<ScheduleGroup>) => {
    const a = [...groups]; a[gi] = { ...a[gi]!, ...patch }; onChange(a);
  };
  const setCol = (gi: number, ci: number, val: string) => {
    const c = [...colsOf(groups[gi]!)]; c[ci] = val; setGroup(gi, { columns: c });
  };
  const setCell = (gi: number, ri: number, ci: number, val: string) => {
    const rows = (groups[gi]!.rows || []).map((r) => [...r]);
    while (rows[ri]!.length < colsOf(groups[gi]!).length) rows[ri]!.push('');
    rows[ri]![ci] = val; setGroup(gi, { rows });
  };
  const addRow = (gi: number) => setGroup(gi, { rows: [...(groups[gi]!.rows || []), colsOf(groups[gi]!).map(() => '')] });
  const removeRow = (gi: number, ri: number) => setGroup(gi, { rows: (groups[gi]!.rows || []).filter((_, i) => i !== ri) });
  const removeGroup = (gi: number) => onChange(groups.filter((_, i) => i !== gi));
  const moveGroup = (gi: number, dir: 'up' | 'down') => {
    const gj = dir === 'up' ? gi - 1 : gi + 1;
    if (gj < 0 || gj >= groups.length) return;
    const a = [...groups]; const t = a[gi]!; a[gi] = a[gj]!; a[gj] = t; onChange(a);
  };
  const addGroup = () => onChange([...groups, { title: '새 표', columns: ['예배', '시간', '장소'], rows: [['', '', '']] }]);

  return (
    <div className="space-y-2">
      {groups.map((g, gi) => {
        const c = colsOf(g);
        const gridCols = `repeat(${c.length}, 1fr) auto`;
        return (
          <div key={gi} className="border border-gray-200 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center gap-1">
              <input
                value={g.title || ''}
                onChange={(e) => setGroup(gi, { title: e.target.value })}
                placeholder="표 제목 (예: 주일 예배)"
                className="border border-gray-300 rounded px-2 py-1 text-xs font-medium flex-1 focus:border-blue-500 outline-none"
              />
              <button type="button" onClick={() => moveGroup(gi, 'up')} disabled={gi === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] px-0.5">▲</button>
              <button type="button" onClick={() => moveGroup(gi, 'down')} disabled={gi === groups.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] px-0.5">▼</button>
              <button type="button" onClick={() => removeGroup(gi)} className="text-red-400 hover:text-red-600 text-[10px] px-1 whitespace-nowrap">표 삭제</button>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: gridCols }}>
              {c.map((col, ci) => (
                <input
                  key={`h${ci}`}
                  value={col}
                  onChange={(e) => setCol(gi, ci, e.target.value)}
                  className="border border-gray-200 rounded px-1 py-0.5 text-[10px] bg-gray-50 font-medium focus:border-blue-500 outline-none"
                />
              ))}
              <span />
              {(g.rows || []).map((row, ri) => (
                <Fragment key={ri}>
                  {c.map((_, ci) => (
                    <input
                      key={ci}
                      value={row[ci] || ''}
                      onChange={(e) => setCell(gi, ri, ci, e.target.value)}
                      className="border border-gray-300 rounded px-1 py-0.5 text-xs focus:border-blue-500 outline-none"
                    />
                  ))}
                  <button type="button" onClick={() => removeRow(gi, ri)} className="text-red-400 hover:text-red-600 text-[10px]">×</button>
                </Fragment>
              ))}
            </div>
            <button type="button" onClick={() => addRow(gi)} className="text-[10px] text-blue-600 hover:text-blue-800">+ 행 추가</button>
          </div>
        );
      })}
      <button type="button" onClick={addGroup} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ 표 추가</button>
    </div>
  );
}
