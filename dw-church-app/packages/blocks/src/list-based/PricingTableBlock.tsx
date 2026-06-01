/**
 * Pricing table — 2/3/4 plan cards in a row.
 *
 * Per web-block-patterns-reference §2.11:
 *  - One card may be `featured` (highlighted with accent border + scale)
 *  - Tabular-nums for clean price alignment
 *  - Currency symbol smaller than the price digits
 *  - Optional monthly/yearly toggle (stub for now — emits a static label)
 *
 * Phase-2 element-composition refactor: typography, button, eyebrow markup
 * delegated to reusable element modules. Inner content width caps removed
 * (operator controls via elementStyles[key].maxWidth). Per-feature list
 * items composed via TextBodyElement so the inspector can target each
 * feature line independently.
 */
import { HeadingElement, TextBodyElement, EyebrowElement, ButtonElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface PricingTableBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface PricingItem {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  buttonText?: string;
  buttonUrl?: string;
  featured?: boolean;
}

export function PricingTableBlock({ props }: PricingTableBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const items = (Array.isArray(props.items) ? props.items : []) as PricingItem[];
  const currency = (props.currency as string) ?? '$';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (items.length === 0) return null;

  return (
    <SectionShell
      props={props}
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div>
        {(eyebrow || title || subtitle) && (
          <header className="mb-8 sm:mb-12 text-center">
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

        <div
          className="grid gap-6 items-start"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {items.map((plan, i) => (
            <article
              key={i}
              className={`relative rounded-2xl bg-white ${plan.featured ? 'border-2' : 'border'} p-6 sm:p-10`}
              style={{
                borderColor: plan.featured ? 'var(--accent)' : 'var(--border)',
                boxShadow: plan.featured ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                transform: plan.featured ? 'scale(1.02)' : undefined,
              }}
            >
              {plan.featured && (
                <span
                  className="absolute top-0 right-6 inline-block px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--text-on-accent)',
                    transform: 'translateY(-50%)',
                  }}
                >
                  Recommended
                </span>
              )}

              <HeadingElement
                text={plan.name}
                props={props}
                elementKey={`items[${i}].name`}
                defaultTag="h3"
                defaultSize="h3"
              />

              <TextBodyElement
                text={plan.description ?? ''}
                props={props}
                elementKey={`items[${i}].description`}
                defaultTag="p"
                defaultSize="caption"
                className="mt-2"
              />

              <p className="mt-6 flex items-baseline gap-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: 'var(--brand-h3, var(--fs-h3))', color: 'var(--text-muted)' }}>{currency}</span>
                <HeadingElement
                  text={plan.price}
                  props={props}
                  elementKey={`items[${i}].price`}
                  defaultTag="span"
                  defaultSize="h2"
                  baseStyle={{ letterSpacing: '-0.02em' }}
                />
                {plan.period && (
                  <TextBodyElement
                    text={`/${plan.period}`}
                    props={props}
                    elementKey={`items[${i}].period`}
                    defaultTag="span"
                    defaultSize="caption"
                  />
                )}
              </p>

              {plan.features && plan.features.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2">
                      <svg
                        className="mt-1 shrink-0"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                        style={{ color: 'var(--success)' }}
                      >
                        <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <TextBodyElement
                        text={feat}
                        props={props}
                        elementKey={`items[${i}].features[${fi}]`}
                        defaultTag="span"
                        defaultSize="body"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {plan.buttonText && plan.buttonUrl && (
                <div className="mt-8">
                  <ButtonElement
                    text={plan.buttonText}
                    href={plan.buttonUrl}
                    props={props}
                    elementKey={`items[${i}].buttonText`}
                    defaultVariant={plan.featured ? 'filled' : 'outlined'}
                    className="w-full text-center"
                    baseStyle={{ display: 'block' }}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
