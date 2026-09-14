import { TextBodyElement, ImageElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';
import { SectionHeadingRule } from '../utilities/SectionHeadingRule';

interface ProseImageBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * Prose + Image (stacked) — a bold section heading with a full-width rule,
 * a rich-text body, and a full-width image (below by default, above if
 * imagePosition='above'). Distinct from text_image (side-by-side split):
 * this is the "설립 목적 / 소개" one-column reading layout with the signature
 * ruled heading. Fully token- + prop-driven; reusable on any tenant.
 */
export function ProseImageBlock({ props }: ProseImageBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const body = (props.body as string) ?? (props.content as string) ?? '';
  const imageUrl = (props.imageUrl as string) ?? '';
  const imageAlt = (props.imageAlt as string) ?? title;
  const imagePosition = ((props.imagePosition as string) ?? 'below') as 'above' | 'below';
  const showRule = props.showRule !== false; // default true
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (!title && !body && !imageUrl) return null;

  const imageEl = imageUrl ? (
    <ImageElement
      url={imageUrl}
      alt={imageAlt}
      props={props}
      elementKey="imageUrl"
      sizeCategory="hero-bg"
      className="w-full"
      baseStyle={{ borderRadius: 'var(--r-lg, var(--brand-radius-lg, 16px))', width: '100%' }}
    />
  ) : null;

  return (
    <SectionShell
      props={props}
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-4xl px-4 sm:px-6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1.5rem)' }}>
        {eyebrow && <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />}
        <SectionHeadingRule props={props} title={title} showRule={showRule} />
        {imagePosition === 'above' && imageEl}
        {body && (
          <TextBodyElement
            text={body}
            props={props}
            elementKey="body"
            defaultTag="div"
            defaultSize="body"
            html
            className="prose prose-lg max-w-none"
          />
        )}
        {imagePosition === 'below' && imageEl}
      </div>
    </SectionShell>
  );
}
