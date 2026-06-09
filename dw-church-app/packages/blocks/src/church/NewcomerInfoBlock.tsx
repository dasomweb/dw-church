/**
 * NewcomerInfoBlock (새가족 안내) — church static block in the shared set.
 * Centered welcome card: avatar/icon + title + rich-text body. Elements use
 * the design-token primitives so theme font/color sets apply.
 */
import { HeadingElement, TextBodyElement, ImageElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface NewcomerInfoBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function NewcomerInfoBlock({ props }: NewcomerInfoBlockProps) {
  const title = (props.title as string) ?? '처음 오신 분들을 환영합니다';
  const content = (props.content as string) ?? '';
  const imageUrl = (props.imageUrl as string) ?? '';

  return (
    <SectionShell
      props={props}
      applyLayout
      style={{ paddingBlock: 'var(--section-py-md)', backgroundColor: 'var(--brand-surface, var(--dw-surface, #f8fafc))' }}
      defaultContentClass="mx-auto max-w-4xl px-4 sm:px-6 text-center"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--block-gap, 1rem)' }}>
        {imageUrl ? (
          <div className="relative mb-2 h-20 w-20 overflow-hidden rounded-full">
            <ImageElement
              url={imageUrl}
              alt={title}
              props={props}
              elementKey="imageUrl"
              sizeCategory="card-grid"
              fillParent
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="mb-2 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--brand-primary, var(--dw-primary, #2563eb))', color: 'var(--brand-primary-fg, #fff)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
          </div>
        )}
        <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
        <HeadingElement text={(props.subtitle as string) ?? ''} props={props} elementKey="subtitle" defaultTag="h3" defaultSize="h3" />
        <TextBodyElement
          text={content}
          props={props}
          elementKey="content"
          defaultTag="div"
          defaultSize="body"
          html
          className="prose prose-lg mx-auto"
        />
      </div>
    </SectionShell>
  );
}
