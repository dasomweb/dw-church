import type { CSSProperties } from 'react';
import { HeadingElement, TextBodyElement, ButtonElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface ButtonGroupBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

interface ButtonItem {
  text?: string;
  label?: string;
  url?: string;
  href?: string;
  target?: string;
}

/**
 * Button Group block — an optional heading/subtitle above a row of MULTIPLE
 * buttons. Mirrors the koreanunity.org vision-page section that links out to
 * several resources at once. Buttons come from props.buttons[] ({ text, url,
 * target }); the first defaults to a filled style, the rest outlined. They
 * wrap on small screens. Alignment via props.align (left/center/right).
 */
export function ButtonGroupBlock({ props }: ButtonGroupBlockProps) {
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const buttons = Array.isArray(props.buttons) ? (props.buttons as ButtonItem[]) : [];
  const align = ((props.align as string) || 'center') as 'left' | 'center' | 'right';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const textAlign = align as CSSProperties['textAlign'];

  return (
    <SectionShell
      props={props}
      className={`${sectionBg.className} px-4 sm:px-6`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-5xl"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: justify,
          textAlign,
          gap: 'var(--block-gap, 1.25rem)',
        }}
      >
        {title ? (
          <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
        ) : null}
        {subtitle ? (
          <TextBodyElement text={subtitle} props={props} elementKey="subtitle" defaultTag="p" defaultSize="body" />
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: justify }}>
          {buttons.map((b, i) => {
            const label = b.text || b.label || '';
            const href = b.url || b.href || '';
            if (!label) return null;
            return (
              <ButtonElement
                key={i}
                text={label}
                href={href}
                props={props}
                elementKey={`button-${i}`}
                defaultVariant={i === 0 ? 'filled' : 'outlined'}
                target={b.target === '_blank' ? '_blank' : '_self'}
              />
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
