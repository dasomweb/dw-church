/**
 * Side-by-side feature comparison grid.
 *
 * Distinct from pricing_table (which sells one package per column with
 * its own price + CTA): comparison_table is read-mostly, oriented
 * around feature parity. Use cases:
 *
 *   "Us vs. Competitor" — sales/marketing posture page
 *   "Plan A / B / C feature matrix" — sub-page that pricing_table
 *     points to for the long version
 *   "Self-hosted vs. Cloud" — deployment-mode picker for B2B SaaS
 *
 * Props shape:
 *   columns: [{ name, subtitle?, highlight?: bool }]
 *   items:   [{ feature, values: (string | boolean)[] }]
 *
 * Cell rendering:
 *   true                   → ✓ (accent color)
 *   false                  → — (gray)
 *   non-empty string       → text (mono if it looks numeric)
 *   missing                → blank
 *
 * Highlighted column gets a subtle background and a "추천" badge above
 * the column header.
 *
 * Phase-2 element-composition refactor: title / subtitle / per-column
 * name + subtitle / per-row feature delegated to HeadingElement +
 * TextBodyElement modules. Table structure (<table>/<thead>/<th>/<td>)
 * stays — the modules render their tags INSIDE the table cells so the
 * a11y semantics and operator data-element wiring both hold.
 */

import { HeadingElement, TextBodyElement } from '../elements';

interface ComparisonTableBlockProps {
  props: Record<string, unknown>;
}

interface Column {
  name: string;
  subtitle?: string;
  highlight?: boolean;
  highlightLabel?: string;
}

interface Row {
  feature: string;
  values?: Array<string | boolean>;
}

function looksNumeric(s: string): boolean {
  return /^[-+]?[\d,.]+(\s*\w{1,3})?$/.test(s.trim());
}

export function ComparisonTableBlock({ props }: ComparisonTableBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const bgMode = (props.bgMode as string) || 'subtle';
  const bgClass = bgMode === 'subtle' ? 'bg-[var(--dw-surface,#f9fafb)]' : 'bg-white';
  const columns = (Array.isArray(props.columns) ? props.columns : []) as Column[];
  const items = (Array.isArray(props.items) ? props.items : []) as Row[];

  return (
    <section className={`px-4 sm:px-6 py-16 sm:py-24 ${bgClass}`}>
      <div className="mx-auto max-w-6xl">
        {(title || subtitle) && (
          <header className="mb-8 sm:mb-10 text-center">
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <TextBodyElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="p"
              defaultSize="h3"
              className="mt-3"
            />
          </header>
        )}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-4 font-medium text-gray-500 align-bottom" />
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    scope="col"
                    className={`px-6 py-4 text-center align-bottom ${
                      col.highlight ? 'bg-[var(--accent,var(--dw-primary))]/5' : ''
                    }`}
                  >
                    {col.highlight && (
                      <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--accent,var(--dw-primary))] text-white">
                        {col.highlightLabel || ''}
                      </span>
                    )}
                    <HeadingElement
                      text={col.name || ''}
                      props={props}
                      elementKey={`columns[${idx}].name`}
                      defaultTag="div"
                      defaultSize="h5"
                    />
                    <TextBodyElement
                      text={col.subtitle || ''}
                      props={props}
                      elementKey={`columns[${idx}].subtitle`}
                      defaultTag="div"
                      defaultSize="caption"
                      className="mt-1"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  data-element={`items[${rIdx}]`}
                  className={rIdx % 2 === 1 ? 'bg-gray-50' : ''}
                >
                  <th
                    scope="row"
                    className="text-left px-6 py-3.5"
                  >
                    <TextBodyElement
                      text={row.feature || ''}
                      props={props}
                      elementKey={`items[${rIdx}].feature`}
                      defaultTag="span"
                      defaultSize="body"
                    />
                  </th>
                  {columns.map((col, cIdx) => {
                    const value = row.values?.[cIdx];
                    return (
                      <td
                        key={cIdx}
                        className={`px-6 py-3.5 text-center ${
                          col.highlight ? 'bg-[var(--accent,var(--dw-primary))]/5' : ''
                        }`}
                      >
                        {value === true ? (
                          <span
                            aria-label="Included"
                            className="text-[var(--accent,var(--dw-primary))] text-lg"
                          >
                            ✓
                          </span>
                        ) : value === false ? (
                          <span aria-label="Not included" className="text-gray-300">
                            —
                          </span>
                        ) : typeof value === 'string' && value.trim() ? (
                          <span
                            className={`text-gray-700 ${looksNumeric(value) ? 'font-mono' : ''}`}
                          >
                            {value}
                          </span>
                        ) : (
                          <span className="text-gray-300" aria-hidden="true">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
