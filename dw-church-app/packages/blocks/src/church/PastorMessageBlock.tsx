/**
 * PastorMessageBlock (담임목사 인사) — church static block, ported into the
 * shared @dw-church/blocks set so the storefront AND the super-admin builder
 * render it identically and its elements consume the design-token system
 * (--brand-* typography families + scales + colors) exactly like every
 * b2bsmart block.
 *
 * Element composition (tokens apply automatically):
 *   title       → HeadingElement  (h2 / --brand-h2 / --brand-font-heading)
 *   message     → TextBodyElement (body / --brand-body / --brand-font-body)
 *   pastorTitle → TextBodyElement (caption)
 *   pastorName  → HeadingElement  (h5)
 *   imageUrl    → ImageElement
 *
 * Layout: variant 'left' = photo first, 'right' (default) = text first.
 */
import type { CSSProperties } from 'react';
import { HeadingElement, TextBodyElement, EyebrowElement, ImageElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface PastorMessageBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function PastorMessageBlock({ props }: PastorMessageBlockProps) {
  const title = (props.title as string) ?? '';
  const pastorName = (props.pastorName as string) ?? '';
  const pastorTitle = (props.pastorTitle as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const eyebrow = (props.eyebrow as string) ?? '';
  // `message` is the historical key; theme-set templates use `content`.
  const message = (props.message as string) || (props.content as string) || '';
  // pastorPhotoUrl is the theme-set key; imageUrl is the inspector key.
  const imageUrl = (props.imageUrl as string) || (props.pastorPhotoUrl as string) || '';
  const pos = (props.variant as string) || (props.layout as string) || 'right';
  const imageFirst = pos === 'left';
  // Column ratio (text:image), e.g. '2-1' = text twice the image width (so the
  // photo can read smaller than the message). Applied on md+ via a CSS var so
  // the layout stays single-column on mobile. For image-first, swap the order.
  const [textFr, imgFr] = ((props.columnRatio as string) || '1-1')
    .split('-')
    .map((n) => Number(n) || 1);
  const colsValue = imageFirst ? `${imgFr}fr ${textFr}fr` : `${textFr}fr ${imgFr}fr`;

  return (
    <SectionShell
      props={props}
      applyLayout
      style={{ paddingBlock: 'var(--section-py-md)' }}
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div
        className="grid grid-cols-1 items-center gap-12 md:[grid-template-columns:var(--pm-cols,1fr_1fr)]"
        style={{ ['--pm-cols' as string]: colsValue } as CSSProperties}
      >
        <div
          className={imageFirst ? 'order-2' : 'order-1'}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-gap, 1rem)' }}
        >
          <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
          <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
          {/* accent rule under the heading — a small church-y flourish */}
          <span aria-hidden="true" style={{ display: 'block', width: 48, height: 3, borderRadius: 2, backgroundColor: 'var(--brand-primary, var(--dw-primary, #2563eb))' }} />
          <HeadingElement text={subtitle} props={props} elementKey="subtitle" defaultTag="h3" defaultSize="h3" />
          <TextBodyElement
            text={message}
            props={props}
            elementKey="message"
            defaultTag="div"
            defaultSize="body"
            html
            className="prose prose-lg"
          />
          {(pastorName || pastorTitle) && (
            <div className="mt-2 border-t pt-4" style={{ borderColor: 'var(--brand-border, #e2e8f0)' }}>
              <TextBodyElement text={pastorTitle} props={props} elementKey="pastorTitle" defaultTag="p" defaultSize="caption" />
              <HeadingElement text={pastorName} props={props} elementKey="pastorName" defaultTag="p" defaultSize="h5" />
            </div>
          )}
        </div>
        {imageUrl && (
          <div
            className={`relative overflow-hidden ${imageFirst ? 'order-1' : 'order-2'}`}
            style={{ aspectRatio: '4 / 5', borderRadius: 'var(--r-lg, var(--brand-radius-lg, 16px))', boxShadow: '0 20px 40px -16px rgba(0,0,0,0.25)' }}
          >
            <ImageElement
              url={imageUrl}
              alt={pastorName || title}
              props={props}
              elementKey="imageUrl"
              sizeCategory="split-side"
              fillParent
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </SectionShell>
  );
}
