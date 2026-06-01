import { HeadingElement, ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

/**
 * Partner / customer logo strip.
 * Per web-block-patterns-reference §2.16:
 *  - Heights normalised (32-48px), widths vary per logo
 *  - Default grayscale + opacity, full color on hover
 *  - flex-wrap with even gaps
 *  - Optional heading like "Trusted by"
 *
 * Phase-2 element-composition refactor: title delegated to
 * HeadingElement (defaultSize="overline" for the small uppercase
 * "Trusted by" look), per-item logo delegated to ImageElement. The
 * grayscale-on-hover treatment + alignment classes stay — those are
 * the block's visual identity, not generic typography.
 */
interface LogoBarBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface LogoItem {
  name: string;
  logoUrl: string;
  linkUrl?: string;
}

export function LogoBarBlock({ props }: LogoBarBlockProps) {
  const title = (props.title as string) ?? '';
  const items = (Array.isArray(props.items) ? props.items : []) as LogoItem[];
  const grayscale = props.grayscale !== false;
  const align = ((props.align as string) ?? 'center') as 'left' | 'center' | 'right';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  if (items.length === 0) return null;

  const justifyClass =
    align === 'center' ? 'justify-center'
    : align === 'right' ? 'justify-end'
    : 'justify-start';

  const titleAlignClass =
    align === 'center' ? 'text-center'
    : align === 'right' ? 'text-right'
    : '';

  return (
    <SectionShell
      props={props}
      className={sectionBg.className}
      style={{ paddingBlock: 'var(--section-py-sm)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl px-4 sm:px-6"
    >
      <div>
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="overline"
          className={`mb-6 ${titleAlignClass}`.trim()}
        />

        <ul className={`flex flex-wrap ${justifyClass} items-center gap-x-12 gap-y-8 list-none p-0 m-0`}>
          {items.map((logo, i) => {
            const img = (
              <ImageElement
                url={logo.logoUrl}
                alt={logo.name}
                props={props}
                elementKey={`items[${i}].logoUrl`}
                sizeCategory="avatar"
                baseStyle={{
                  height: 40,
                  width: 'auto',
                  filter: grayscale ? 'grayscale(1)' : undefined,
                  opacity: grayscale ? 0.7 : 1,
                  transition: 'filter var(--duration-base) var(--ease-out), opacity var(--duration-base) var(--ease-out)',
                }}
                className={grayscale ? 'hover:!grayscale-0 hover:!opacity-100' : undefined}
              />
            );
            return (
              <li key={i}>
                {logo.linkUrl ? (
                  <a href={logo.linkUrl} aria-label={logo.name} target="_blank" rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </SectionShell>
  );
}
