/**
 * Editorial TOC — single-column, oversized display numbers, ample line
 * spacing. The number is the visual hero; the label sits beside it in a
 * smaller serif. Reads like a magazine masthead.
 */

import {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
} from '../../../utilities/catalog-page';
import { getStarterVisuals } from '../../../utilities/catalog-starter-visuals';
import { mergeElementStyle } from '../../../utilities/element-styles';

interface TocEntry {
  number: string;
  label: string;
}

interface Props {
  props: Record<string, unknown>;
}

export function EditorialToc({ props }: Props) {
  const title = (props.title as string) || '';
  const entries = Array.isArray(props.entries) ? (props.entries as TocEntry[]) : [];
  const v = getStarterVisuals('editorial');

  return (
    <div
      className={CATALOG_SPREAD_CLASS}
      style={{
        aspectRatio: CATALOG_SPREAD_ASPECT,
        background: (props.pageBackgroundColor as string) || v.paper,
        borderColor: v.rule,
        color: v.ink,
        fontFamily: v.bodyFamily,
      }}
    >
      <div className="absolute inset-0 grid grid-cols-[1fr_2fr]">
        {/* Left rail — title and meta */}
        <div
          className="flex flex-col justify-end p-12 sm:p-16 border-r"
          style={{ borderColor: v.rule }}
        >
          <div
            className="text-[10px] uppercase mb-4"
            style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
          >
            INDEX
          </div>
          <h2
            data-element="title"
            style={mergeElementStyle(
              {
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-h1)',
                lineHeight: 1,
                color: v.ink,
              },
              props,
              'title',
            )}
          >
            {title}
          </h2>
        </div>

        {/* Right — entries list */}
        <div className="flex flex-col justify-center p-12 sm:p-16">
          {entries.length === 0 ? (
            <p className="text-sm italic" style={{ color: v.inkMuted }}>
              Pages added after the cover will appear here in the table of contents automatically.
            </p>
          ) : (
            <ol className="space-y-5">
              {entries.slice(0, 14).map((e, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-6 pb-3"
                  style={{ borderBottom: `1px solid ${v.rule}` }}
                >
                  <span
                    className="font-mono tabular-nums shrink-0"
                    style={{
                      color: v.accent,
                      fontFamily: v.headingFamily,
                      fontSize: 'var(--fs-h2)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      width: '3.5rem',
                    }}
                  >
                    {e.number}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontFamily: v.headingFamily,
                      fontWeight: '400',
                      fontSize: 'var(--fs-lg)',
                      color: v.ink,
                      letterSpacing: v.headingTracking,
                      fontStyle: 'italic',
                    }}
                  >
                    {e.label}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
