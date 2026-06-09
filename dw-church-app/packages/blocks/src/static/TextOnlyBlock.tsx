import { HeadingElement, TextBodyElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface TextOnlyBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * Text-only intro block — pilot for the reusable element modules
 * (Phase 2 of the Webflow/Elementor-style element-composition refactor).
 *
 * 2026-05-25: SectionShell 로 마이그레이션 + applyLayout=true. 운영자가
 * 인스펙터에서 LayoutField (Height / Align / Background Width / Container
 * Width) 를 바꾸면 즉시 storefront 에 반영. 이전엔 인스펙터만 노출되고
 * 실제 효과 없는 상태였음.
 */
export function TextOnlyBlock({ props }: TextOnlyBlockProps) {
  const title = (props.title as string) ?? '';
  const content = (props.content as string) ?? '';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  // `--block-gap` is set by the BlockRenderer wrapper when the operator
  // configures BlockStyle.spacing.gap. Fallback (1.5rem ≈ mb-6) matches
  // the prior margin so untouched tenants render identically.
  return (
    <SectionShell
      props={props}
      className={`${sectionBg.className} px-4 sm:px-6`.trim()}
      style={{
        paddingBlock: 'var(--section-py-md)',
        ...sectionBg.style,
      }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--block-gap, 1.5rem)',
        }}
      >
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
        />
        <HeadingElement
          text={(props.subtitle as string) ?? ''}
          props={props}
          elementKey="subtitle"
          defaultTag="h3"
          defaultSize="h3"
        />
        <TextBodyElement
          text={content}
          props={props}
          elementKey="content"
          defaultTag="div"
          defaultSize="body"
          html
          className="prose prose-lg"
        />
      </div>
    </SectionShell>
  );
}
