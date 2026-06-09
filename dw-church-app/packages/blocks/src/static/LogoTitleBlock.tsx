import { HeadingElement, TextBodyElement, ImageElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface LogoTitleBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * Logo + Title block — a centered emblem/logo image above a heading and a
 * small subtitle line. Mirrors the koreanunity.org vision-page header pattern
 * (logo shown together with the page title). All three are inspector-editable
 * elements (logoUrl / title / subtitle); typography + colors come from the
 * theme tokens.
 */
export function LogoTitleBlock({ props }: LogoTitleBlockProps) {
  const logoUrl = (props.logoUrl as string) || (props.imageUrl as string) || '';
  const title = (props.title as string) ?? '';
  const subtitle = (props.subtitle as string) ?? '';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);
  // Operator-tunable logo size (px). Default 96 reads well centered above a title.
  const logoWidth = Number(props.logoWidth) || 96;

  return (
    <SectionShell
      props={props}
      className={`${sectionBg.className} px-4 sm:px-6`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-3xl"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--block-gap, 1rem)',
        }}
      >
        {logoUrl ? (
          <ImageElement
            url={logoUrl}
            alt={title || 'logo'}
            props={props}
            elementKey="logoUrl"
            sizeCategory="card-grid"
            baseStyle={{ width: `${logoWidth}px`, height: 'auto', objectFit: 'contain' }}
          />
        ) : null}
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
        />
        {subtitle ? (
          <TextBodyElement
            text={subtitle}
            props={props}
            elementKey="subtitle"
            defaultTag="p"
            defaultSize="overline"
          />
        ) : null}
      </div>
    </SectionShell>
  );
}
