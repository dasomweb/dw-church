/**
 * Corporate TOC — table-of-record. Title strip on top, then a real table
 * (NO · ITEM · REF). Two columns of rows so we can fit a full catalogue
 * issue on one spread. Reads as the table of contents in an engineered-
 * goods catalogue.
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

function Row({
  entry,
  v,
}: {
  entry: TocEntry;
  v: ReturnType<typeof getStarterVisuals>;
}) {
  return (
    <div
      className="grid grid-cols-[2.5rem_1fr_3rem] gap-3 items-baseline py-2"
      style={{ borderBottom: `1px solid ${v.rule}` }}
    >
      <span
        className="font-mono tabular-nums text-xs"
        style={{ color: v.accent, letterSpacing: v.eyebrowTracking }}
      >
        {entry.number}
      </span>
      <span className="text-sm truncate" style={{ color: v.ink }}>
        {entry.label}
      </span>
      <span
        className="font-mono text-[10px] tabular-nums text-right"
        style={{ color: v.inkMuted }}
      >
        p.{entry.number}
      </span>
    </div>
  );
}

export function CorporateToc({ props }: Props) {
  const title = (props.title as string) || '';
  const entries = Array.isArray(props.entries) ? (props.entries as TocEntry[]) : [];
  const v = getStarterVisuals('corporate');

  const half = Math.ceil(entries.length / 2);
  const left = entries.slice(0, half);
  const right = entries.slice(half);

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
      <div className="absolute inset-0 flex flex-col">
        {/* Title strip */}
        <div
          className="px-10 sm:px-14 py-6 border-b"
          style={{ borderColor: v.accent, borderBottomWidth: 3 }}
        >
          <div
            className="text-[10px] uppercase mb-2"
            style={{ letterSpacing: v.eyebrowTracking, color: v.accent }}
          >
            CONTENTS
          </div>
          <h2
            data-element="title"
            style={mergeElementStyle(
              {
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-h2)',
                color: v.ink,
              },
              props,
              'title',
            )}
          >
            {title}
          </h2>
        </div>

        {/* Two-column table */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-x-12 px-10 sm:px-14 py-8 overflow-hidden">
          {entries.length === 0 ? (
            <p
              className="col-span-2 text-sm"
              style={{ color: v.inkMuted }}
            >
              Pages added after the cover will appear here in the table of contents automatically.
            </p>
          ) : (
            <>
              <div>
                {/* Column header */}
                <div
                  className="grid grid-cols-[2.5rem_1fr_3rem] gap-3 pb-2 mb-2 text-[9px] font-mono uppercase"
                  style={{
                    letterSpacing: v.eyebrowTracking,
                    color: v.inkMuted,
                    borderBottom: `2px solid ${v.ink}`,
                  }}
                >
                  <span>NO</span>
                  <span>ITEM</span>
                  <span className="text-right">REF</span>
                </div>
                {left.map((e, i) => (
                  <Row key={i} entry={e} v={v} />
                ))}
              </div>
              <div>
                <div
                  className="grid grid-cols-[2.5rem_1fr_3rem] gap-3 pb-2 mb-2 text-[9px] font-mono uppercase"
                  style={{
                    letterSpacing: v.eyebrowTracking,
                    color: v.inkMuted,
                    borderBottom: `2px solid ${v.ink}`,
                  }}
                >
                  <span>NO</span>
                  <span>ITEM</span>
                  <span className="text-right">REF</span>
                </div>
                {right.map((e, i) => (
                  <Row key={i} entry={e} v={v} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
