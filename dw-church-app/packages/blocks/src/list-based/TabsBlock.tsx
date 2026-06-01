'use client';

import { useState } from 'react';
import { HeadingElement, TextBodyElement, EyebrowElement, ButtonElement, ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';

/**
 * Tabbed category filter + grid — Stanislav Bau "Unsere Kategorien"
 * pattern. Ross-section of marketing sites: a horizontal pill tab bar
 * (Innenausbau / Trockenbau / Technische Installationen / ...) drives
 * a 3-column card grid below it.
 *
 * Rendering model:
 *   - tabs[]   : an array of categories. Active tab is tracked in
 *                local state — no router parameter, no URL hash.
 *   - cards[]  : every card has a `tab` field naming which tab it
 *                belongs to. Cards with no tab field show on every
 *                tab (rare; "all" pattern).
 *   - Each card mirrors FeaturesGrid's image-card layout.
 *
 * Phase-2 element-composition refactor: title / subtitle / eyebrow /
 * footer CTA + per-card title / description / image / button delegated
 * to element modules. The tab bar (pills with active-state) stays
 * inline because the toggle button is intrinsic to the variant (it's
 * navigation, not content).
 */

interface TabsBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface TabSpec {
  id: string;
  label: string;
}

interface TabCard {
  tab?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export function TabsBlock({ props }: TabsBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  const onDark = bgMode === 'dark' || bgMode === 'accent';
  const buttonText = (props.buttonText as string) || '';
  const buttonUrl = (props.buttonUrl as string) || '';

  // Tabs: a list of { id, label }. Operator might write items with just
  // a label (id absent) — derive id from label so the comparison still
  // works. Filter out any rows missing a label.
  const rawTabs = Array.isArray(props.tabs) ? props.tabs : [];
  const tabs: TabSpec[] = rawTabs
    .map((t) => {
      if (typeof t === 'string') return { id: t, label: t };
      const obj = t as { id?: string; label?: string };
      const label = obj.label?.trim() ?? '';
      const id = obj.id?.trim() || label.toLowerCase().replace(/\s+/g, '-');
      return label ? { id, label } : null;
    })
    .filter((t): t is TabSpec => t !== null);

  const rawCards = Array.isArray(props.cards) ? props.cards : Array.isArray(props.items) ? props.items : [];
  const cards: TabCard[] = rawCards
    .map((c) => {
      const obj = c as TabCard;
      return {
        tab: obj.tab,
        title: String(obj.title ?? '').trim(),
        description: obj.description ? String(obj.description) : undefined,
        imageUrl: obj.imageUrl ? String(obj.imageUrl) : undefined,
        buttonText: obj.buttonText ? String(obj.buttonText) : undefined,
        buttonUrl: obj.buttonUrl ? String(obj.buttonUrl) : undefined,
      };
    })
    .filter((c) => c.title);

  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');
  if (tabs.length === 0 || cards.length === 0) return null;

  const visibleCards = cards.map((c, i) => ({ card: c, originalIndex: i })).filter((x) => !x.card.tab || x.card.tab === active);

  return (
    <section className={sectionBg.className} style={{ paddingBlock: 'var(--section-py-md, 4rem)', ...sectionBg.style }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {(eyebrow || title || subtitle) && (
          <header className="mb-8 sm:mb-10 text-center">
            <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <HeadingElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="h5"
              defaultSize="h3"
            />
          </header>
        )}

        {/* tab bar — horizontal pill row, scrolls on mobile if it overflows.
         * Tab buttons stay inline (not ButtonElement) because the active
         * vs inactive state is intrinsic to the tab control variant, not
         * a generic CTA. */}
        <div
          role="tablist"
          aria-label="Categories"
          className="mb-8 sm:mb-10 flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className="rounded-full px-5 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive
                    ? onDark
                      ? '#fff'
                      : 'var(--accent, var(--dw-primary, #059669))'
                    : onDark
                      ? 'rgba(255, 255, 255, 0.10)'
                      : 'rgba(0, 0, 0, 0.04)',
                  color: isActive
                    ? onDark
                      ? 'var(--accent, var(--dw-primary, #059669))'
                      : 'var(--text-on-accent, #ffffff)'
                    : onDark
                      ? '#fff'
                      : 'var(--text-secondary, #4b5563)',
                  border: '1px solid',
                  borderColor: isActive
                    ? 'transparent'
                    : onDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'var(--border, #e5e7eb)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* card grid for the active tab */}
        <ul
          role="tabpanel"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 list-none p-0 m-0"
        >
          {visibleCards.map(({ card: c, originalIndex: i }) => (
            <li
              key={`${active}-${i}`}
              className="rounded-2xl overflow-hidden border transition-all hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: onDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--surface, #ffffff)',
                borderColor: onDark ? 'rgba(255, 255, 255, 0.10)' : 'var(--border, #e5e7eb)',
              }}
            >
              <div className="relative w-full bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
                {c.imageUrl ? (
                  <ImageElement
                    url={c.imageUrl}
                    alt={c.title}
                    props={props}
                    elementKey={`cards[${i}].imageUrl`}
                    sizeCategory="card-grid"
                    fillParent
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft,rgba(0,0,0,0.04))] to-transparent" />
                )}
              </div>
              <div className="p-4 sm:p-6">
                <HeadingElement
                  text={c.title}
                  props={props}
                  elementKey={`cards[${i}].title`}
                  defaultTag="h3"
                  defaultSize="h4"
                />
                <TextBodyElement
                  text={c.description ?? ''}
                  props={props}
                  elementKey={`cards[${i}].description`}
                  defaultTag="p"
                  defaultSize="body"
                  className="mt-2"
                />
                {c.buttonText && c.buttonUrl && (
                  <div className="mt-4">
                    <ButtonElement
                      text={c.buttonText}
                      href={c.buttonUrl}
                      props={props}
                      elementKey={`cards[${i}].buttonText`}
                      defaultVariant="ghost"
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {buttonText && buttonUrl && (
          <div className="mt-10 text-center">
            <ButtonElement
              text={buttonText}
              href={buttonUrl}
              props={props}
              elementKey="buttonText"
              defaultVariant="filled"
            />
          </div>
        )}
      </div>
    </section>
  );
}
