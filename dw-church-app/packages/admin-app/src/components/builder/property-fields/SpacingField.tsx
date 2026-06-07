import { useEffect, useState } from 'react';

/**
 * 4-axis spacing editor (top / right / bottom / left).
 *
 * Stores values back as a flat record under `${prefix}Top`,
 * `${prefix}Right`, etc. — the shape BlockRenderer's containerStyle
 * already consumes. Empty values are stripped so the storefront
 * default kicks back in cleanly.
 *
 * Link toggle (🔗): when the four axes already share the same value
 * the field starts in linked mode — typing in any one cell broadcasts
 * to the other three. Toggling off lets the operator dial each side
 * separately. Heuristic, but matches the default-empty case (all
 * undefined → linked) and the common "120px on every side" case.
 */

export interface SpacingFieldProps {
  /** Storage prefix — what BlockRenderer reads. */
  prefix: 'padding' | 'margin';
  /** Full record from props.containerStyle (extra keys ignored). */
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  /** Display label above the four cells. */
  label?: string;
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
const GLYPHS: Record<typeof SIDES[number], string> = {
  Top: '↑',
  Right: '→',
  Bottom: '↓',
  Left: '←',
};
const TITLES: Record<typeof SIDES[number], string> = {
  Top: 'Top',
  Right: 'Right',
  Bottom: 'Bottom',
  Left: 'Left',
};

export function SpacingField({ prefix, values, onChange, label }: SpacingFieldProps) {
  const initial = SIDES.map((s) => values[`${prefix}${s}`] ?? '');
  const allEqual = initial.every((v) => v === initial[0]);
  const [linked, setLinked] = useState(allEqual);

  // Re-sync linked flag when an external change arrives that breaks
  // or restores the symmetry — saves the operator from a stale UI
  // state when they swap sections.
  useEffect(() => {
    const cur = SIDES.map((s) => values[`${prefix}${s}`] ?? '');
    if (cur.every((v) => v === cur[0])) {
      // restore link only if currently unlinked but values have
      // become symmetric — don't override an explicit user toggle.
      setLinked((prev) => (prev ? prev : prev));
    }
  }, [values, prefix]);

  const setSide = (side: typeof SIDES[number], raw: string) => {
    const trimmed = raw.trim();
    const next = { ...values };
    const apply = (key: string) => {
      if (trimmed) next[key] = trimmed;
      else delete next[key];
    };
    if (linked) {
      for (const s of SIDES) apply(`${prefix}${s}`);
    } else {
      apply(`${prefix}${side}`);
    }
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">
          {label ?? (prefix === 'padding' ? 'Padding' : 'Margin')}
        </span>
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
      <div className={linked ? '' : 'grid grid-cols-2 gap-1.5'}>
        {linked ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 w-3 text-center" title="All sides">↔</span>
            <input
              type="text"
              value={values[`${prefix}Top`] ?? ''}
              onChange={(e) => setSide('Top', e.target.value)}
              placeholder="—"
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
                value={values[`${prefix}${s}`] ?? ''}
                onChange={(e) => setSide(s, e.target.value)}
                placeholder="—"
                className="flex-1 text-xs font-mono border border-gray-300 rounded px-1.5 py-1 focus:border-blue-500 outline-none"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
