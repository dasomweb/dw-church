/**
 * Composite typography editor — family / weight / size / line-height /
 * letter-spacing — all reading from and writing to the same flat blob
 * shape that ElementStyle uses.
 *
 * Caller passes the relevant style record (e.g. one of
 * `props.elementStyles[<path>]`) and a mutator. We bind each subfield
 * to the right key directly, so empty cells clear the override and let
 * the theme cascade resume.
 *
 * Mode rules:
 *   • size   — px-only text input. We tried px+rem dropdowns earlier
 *              and the operator hated it ("폰트는 무조건 PX로 하면돼").
 *   • weight — preset buttons (300/400/500/600/700/800) since the
 *              theme tokens only define those rungs.
 *   • family — free text + suggestions chip strip (theme heading +
 *              body fonts) so the operator can deviate but doesn't
 *              have to memorise the family name.
 */

export interface FontFieldValue {
  fontFamily?: string;
  fontWeight?: string | number;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
}

export interface FontFieldProps {
  value: FontFieldValue;
  onChange: (next: FontFieldValue) => void;
  /** Theme font suggestions shown as quick-pick chips. */
  fontSuggestions?: Array<{ label: string; family: string }>;
  /** Show family / line-height / letter-spacing rows (default: true). */
  showAdvanced?: boolean;
}

const WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extrabold' },
];

export function FontField({
  value,
  onChange,
  fontSuggestions,
  showAdvanced = true,
}: FontFieldProps) {
  const set = <K extends keyof FontFieldValue>(key: K, raw: FontFieldValue[K] | string) => {
    const next: FontFieldValue = { ...value };
    if (raw === '' || raw === undefined || raw === null) {
      delete next[key];
    } else {
      (next[key] as FontFieldValue[K]) = raw as FontFieldValue[K];
    }
    onChange(next);
  };

  const currentWeight = value.fontWeight !== undefined ? String(value.fontWeight) : '';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Cell label="Size (px)">
          <input
            type="text"
            inputMode="decimal"
            value={value.fontSize ?? ''}
            onChange={(e) => set('fontSize', e.target.value)}
            placeholder="Default"
            className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
          />
        </Cell>
        <Cell label="Weight">
          <select
            value={currentWeight}
            onChange={(e) => set('fontWeight', e.target.value || '')}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Default</option>
            {WEIGHTS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label} ({w.value})
              </option>
            ))}
          </select>
        </Cell>
      </div>
      {showAdvanced && (
        <>
          <Cell label="Font Family">
            <input
              type="text"
              value={value.fontFamily ?? ''}
              onChange={(e) => set('fontFamily', e.target.value)}
              placeholder="Theme default"
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
            />
            {fontSuggestions && fontSuggestions.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {fontSuggestions.map((s) => {
                  const active = value.fontFamily === s.family;
                  return (
                    <button
                      key={s.family}
                      type="button"
                      onClick={() => set('fontFamily', active ? '' : s.family)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        active
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                      style={{ fontFamily: s.family }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </Cell>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="Line Height">
              <input
                type="text"
                value={value.lineHeight ?? ''}
                onChange={(e) => set('lineHeight', e.target.value)}
                placeholder="1.5"
                className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
              />
            </Cell>
            <Cell label="Letter Spacing">
              <input
                type="text"
                value={value.letterSpacing ?? ''}
                onChange={(e) => set('letterSpacing', e.target.value)}
                placeholder="0"
                className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
              />
            </Cell>
          </div>
        </>
      )}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">{label}</label>
      {children}
    </div>
  );
}
