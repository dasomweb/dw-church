import { useState } from 'react';
import type { BoxSides } from '@dw-church/design-tokens';

/**
 * 4-axis numeric box editor for BlockStyle.spacing.padding / margin.
 *
 * Stores values as a typed `BoxSides` object (px integers). Different
 * from `SpacingField` (which handles ElementStyle's string-typed
 * paddingTop / paddingRight / etc.) — this one is for section-level
 * BlockStyle.spacing where the schema is `{ top?, right?, bottom?,
 * left? }` numbers.
 *
 * Empty input on every side collapses to `undefined` so the spacing
 * field on BlockStyle drops cleanly back to the global cascade.
 *
 * Link toggle (🔗): when the four sides already share the same value
 * the field starts in linked mode — typing in any one cell broadcasts
 * to the other three. Matches SpacingField's UX so the operator's
 * muscle memory carries between element-level and section-level
 * spacing controls.
 */

export interface BoxSidesFieldProps {
  value: BoxSides | undefined;
  onChange: (next: BoxSides | undefined) => void;
  label?: string;
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const GLYPHS: Record<typeof SIDES[number], string> = {
  top: '↑',
  right: '→',
  bottom: '↓',
  left: '←',
};
const TITLES: Record<typeof SIDES[number], string> = {
  top: 'Top',
  right: 'Right',
  bottom: 'Bottom',
  left: 'Left',
};

function parsePx(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/px$/i, '');
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function asInput(n: number | undefined): string {
  return n === undefined ? '' : String(n);
}

function collapse(next: BoxSides): BoxSides | undefined {
  // If every side is undefined, drop the whole spacing.padding / margin
  // back to undefined so the global cascade picks up cleanly.
  if (next.top === undefined && next.right === undefined && next.bottom === undefined && next.left === undefined) {
    return undefined;
  }
  return next;
}

export function BoxSidesField({ value, onChange, label }: BoxSidesFieldProps) {
  const cur = SIDES.map((s) => value?.[s]);
  const allEqual = cur.every((v) => v === cur[0] && v !== undefined);
  const [linked, setLinked] = useState(allEqual);

  const setSide = (side: typeof SIDES[number], raw: string) => {
    const parsed = parsePx(raw);
    const next: BoxSides = { ...(value ?? {}) };
    if (linked) {
      for (const s of SIDES) {
        if (parsed === undefined) delete next[s];
        else next[s] = parsed;
      }
    } else {
      if (parsed === undefined) delete next[side];
      else next[side] = parsed;
    }
    onChange(collapse(next));
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          <button
            type="button"
            onClick={() => setLinked((v) => !v)}
            title={linked ? 'Edit each side separately' : 'Apply the same value to all sides'}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              linked
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {linked ? '🔗 Linked' : '⛓️‍💥 Unlinked'}
          </button>
        </div>
      )}
      <div className={linked ? '' : 'grid grid-cols-2 gap-1.5'}>
        {linked ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 w-3 text-center" title="All sides">↔</span>
            <input
              type="text"
              inputMode="numeric"
              value={asInput(value?.top)}
              onChange={(e) => setSide('top', e.target.value)}
              placeholder="px"
              className="flex-1 text-xs font-mono border border-gray-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
            />
          </div>
        ) : (
          SIDES.map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span className="text-xs text-gray-400 w-3 text-center" title={TITLES[s]}>
                {GLYPHS[s]}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={asInput(value?.[s])}
                onChange={(e) => setSide(s, e.target.value)}
                placeholder="px"
                className="flex-1 text-xs font-mono border border-gray-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
