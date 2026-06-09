import { HeadingElement, TextBodyElement, EyebrowElement, ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface LogoTitleBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * Logo + Title block — a logo/emblem image shown together with a heading,
 * an eyebrow label, and an optional subtitle. Two layouts:
 *   - 'horizontal' (default): logo LEFT, a thin divider, then eyebrow + title
 *     on the RIGHT — the koreanunity.org "SBC · OUR FAITH · Baptist Faith and
 *     Message" header pattern.
 *   - 'center': logo on top, title + subtitle centered below.
 * All elements are inspector-editable (logoUrl / eyebrow / title / subtitle).
 */
export function LogoTitleBlock({ props }: LogoTitleBlockProps) {
  const logoUrl = (props.logoUrl as string) || (props.imageUrl as string) || '';
  const eyebrow = (props.eyebrow as string) ?? '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const variant = ((props.variant as string) || (props.layout as string) || 'horizontal') as 'horizontal' | 'center';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  const logoWidth = Number(props.logoWidth) || (variant === 'center' ? 96 : 72);

  const logo = logoUrl ? (
    <ImageElement
      url={logoUrl}
      alt={title || 'logo'}
      props={props}
      elementKey="logoUrl"
      sizeCategory="card-grid"
      baseStyle={{ width: `${logoWidth}px`, height: 'auto', objectFit: 'contain', flexShrink: 0 }}
    />
  ) : null;

  if (variant === 'center') {
    return (
      <SectionShell
        props={props}
        className={`${sectionBg.className} px-4 sm:px-6`.trim()}
        style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
        applyLayout
        defaultContentClass="mx-auto max-w-3xl"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--block-gap, 1rem)' }}>
          {logo}
          <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
          <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
          {subtitle ? <TextBodyElement text={subtitle} props={props} elementKey="subtitle" defaultTag="p" defaultSize="overline" /> : null}
        </div>
      </SectionShell>
    );
  }

  // horizontal: logo | divider | (eyebrow + title + subtitle)
  return (
    <SectionShell
      props={props}
      className={`${sectionBg.className} px-4 sm:px-6`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-5xl"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {logo}
        {logo ? <div aria-hidden="true" style={{ alignSelf: 'stretch', width: 1, background: 'var(--border, rgba(0,0,0,0.12))' }} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
          <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
          <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h3" />
          {subtitle ? <TextBodyElement text={subtitle} props={props} elementKey="subtitle" defaultTag="p" defaultSize="body" /> : null}
        </div>
      </div>
    </SectionShell>
  );
}
