import { HeadingElement, TextBodyElement, ImageElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

/**
 * Testimonials block.
 * Per web-block-patterns-reference §2.8:
 *  - <figure> + <blockquote> + <figcaption> + <cite> semantic chain
 *  - 2 or 3-card grid (or single big quote for hero-style)
 *  - Optional avatar, role, company, 1-5 star rating
 *
 * Phase-2 element-composition refactor: title / subtitle / per-card
 * quote (rendered as TextBodyElement inside <blockquote> wrapper) /
 * author / role+company / avatar delegated to element modules. The
 * <blockquote> / <figure> semantic chain stays as the layout shell;
 * the inner text element owns its typography token + inspector overrides.
 */
interface TestimonialsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  rating?: number;
}

export function TestimonialsBlock({ props }: TestimonialsBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const items = (Array.isArray(props.items) ? props.items : []) as TestimonialItem[];
  const layout = ((props.layout as string) ?? 'grid-3') as 'grid-2' | 'grid-3' | 'single';
  // 'dark' joins 'subtle'/'accent' for modern marketing rhythm.
  const bgMode = ((props.bgMode as string) ?? 'subtle') as 'none' | 'subtle' | 'accent' | 'dark';

  if (items.length === 0) return null;

  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  const bgClass = sectionBg.className;
  const bgInlineStyle = sectionBg.style;
  // 2026-05-25: SectionShell + applyLayout=true (운영자 LayoutField 즉시 반영)
  const sectionWrapClass = bgClass;
  const sectionWrapStyle = { paddingBlock: 'var(--section-py-md)', ...bgInlineStyle };

  const colsClass =
    layout === 'grid-2' ? 'sm:grid-cols-2' : layout === 'grid-3' ? 'sm:grid-cols-2 lg:grid-cols-3' : '';

  // Single-quote layout uses a centered, bigger format.
  if (layout === 'single' || items.length === 1) {
    const t = items[0]!;
    return (
      <SectionShell
        props={props}
        className={sectionWrapClass}
        style={sectionWrapStyle}
        applyLayout
        defaultContentClass="mx-auto max-w-4xl px-4 sm:px-6 text-center"
      >
        <div>
          <figure>
            <blockquote>
              <HeadingElement
                text={`“${t.quote}”`}
                props={props}
                elementKey="items[0].quote"
                defaultTag="p"
                defaultSize="h2"
                baseStyle={{ margin: 0 }}
              />
            </blockquote>
            <figcaption className="mt-6 flex items-center justify-center gap-3">
              {t.avatarUrl && (
                <ImageElement
                  url={t.avatarUrl}
                  alt=""
                  props={props}
                  elementKey="items[0].avatarUrl"
                  sizeCategory="avatar"
                  className="rounded-full"
                  baseStyle={{ width: 48, height: 48, objectFit: 'cover' }}
                />
              )}
              <div className="text-left">
                <cite className="not-italic">
                  <HeadingElement
                    text={t.author}
                    props={props}
                    elementKey="items[0].author"
                    defaultTag="span"
                    defaultSize="caption"
                  />
                </cite>
                {(t.role || t.company) && (
                  <TextBodyElement
                    text={[t.role, t.company].filter(Boolean).join(', ')}
                    props={props}
                    elementKey="items[0].roleCompany"
                    defaultTag="div"
                    defaultSize="caption"
                  />
                )}
              </div>
            </figcaption>
          </figure>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      props={props}
      className={sectionWrapClass}
      style={sectionWrapStyle}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 2.25rem)' }}
      >
        {(eyebrow || title || subtitle) && (
          <header className="text-center">
            {eyebrow && (
              <EyebrowElement
                text={eyebrow}
                props={props}
                elementKey="eyebrow"
                className="mb-3"
              />
            )}
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

        <div className={`grid grid-cols-1 ${colsClass} gap-4 sm:gap-6`}>
          {items.map((t, i) => (
            <figure
              key={i}
              className="rounded-2xl p-5 sm:p-8 flex flex-col"
              style={{
                background: (bgMode === 'accent' || bgMode === 'dark') ? 'rgba(255,255,255,0.08)' : 'var(--surface)',
                border: '1px solid',
                borderColor: (bgMode === 'accent' || bgMode === 'dark') ? 'rgba(255,255,255,0.15)' : 'var(--border)',
                boxShadow: (bgMode === 'accent' || bgMode === 'dark') ? 'none' : 'var(--shadow-xs)',
              }}
            >
              {typeof t.rating === 'number' && t.rating > 0 && (
                <div className="mb-3 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} filled={si < (t.rating ?? 0)} />
                  ))}
                </div>
              )}
              <blockquote className="flex-1">
                <TextBodyElement
                  text={`“${t.quote}”`}
                  props={props}
                  elementKey={`items[${i}].quote`}
                  defaultTag="p"
                  defaultSize="body"
                  baseStyle={{ margin: 0 }}
                />
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {t.avatarUrl && (
                  <ImageElement
                    url={t.avatarUrl}
                    alt=""
                    props={props}
                    elementKey={`items[${i}].avatarUrl`}
                    sizeCategory="avatar"
                    className="rounded-full shrink-0"
                    baseStyle={{ width: 40, height: 40, objectFit: 'cover' }}
                  />
                )}
                <div>
                  <cite className="not-italic">
                    <HeadingElement
                      text={t.author}
                      props={props}
                      elementKey={`items[${i}].author`}
                      defaultTag="span"
                      defaultSize="caption"
                    />
                  </cite>
                  {(t.role || t.company) && (
                    <TextBodyElement
                      text={[t.role, t.company].filter(Boolean).join(', ')}
                      props={props}
                      elementKey={`items[${i}].roleCompany`}
                      defaultTag="div"
                      defaultSize="caption"
                    />
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ color: filled ? '#f59e0b' : 'var(--border-strong)' }}>
      <path d="M8 1l2.18 4.42 4.88.71-3.53 3.44.83 4.86L8 12.13 3.64 14.43l.83-4.86L.94 6.13l4.88-.71L8 1z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
