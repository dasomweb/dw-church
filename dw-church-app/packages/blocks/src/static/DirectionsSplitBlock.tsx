import type { ReactNode } from 'react';
import { HeadingElement, EyebrowElement } from '../elements';
import { sectionBgStyle } from '../utilities/section-bg';
import { SectionShell } from '../utilities/SectionShell';

interface DirectionsSplitBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * Directions / Contact split — a Google-map embed on the LEFT and a contact
 * panel (church name / address / phone, each with an icon) on the RIGHT,
 * topped by an eyebrow + heading. Mirrors the koreanunity.org contact page
 * ("Contact / 오시는 길"). The map is built from the address (no API key) or an
 * explicit mapEmbedUrl. Reverse the columns with props.imagePosition='right'.
 */
export function DirectionsSplitBlock({ props }: DirectionsSplitBlockProps) {
  const eyebrow = (props.eyebrow as string) ?? 'Contact';
  const title = (props.title as string) ?? '오시는 길';
  const churchName = (props.churchName as string) ?? '';
  const address = (props.address as string) ?? '';
  const phone = (props.phone as string) ?? '';
  const email = (props.email as string) ?? '';
  const mapEmbedUrl = (props.mapEmbedUrl as string) ?? '';
  const mapRight = ((props.imagePosition as string) || (props.mapPosition as string)) === 'right';
  const bgMode = (props.bgMode as string) ?? 'none';
  const backgroundColor = (props.backgroundColor as string) || '';
  const sectionBg = sectionBgStyle(bgMode, backgroundColor);

  const mapSrc = mapEmbedUrl
    || (address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : '');

  const mapCol = (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        borderRadius: 'var(--brand-radius-lg, 12px)',
        overflow: 'hidden',
        border: '1px solid var(--border, rgba(0,0,0,0.08))',
        aspectRatio: '4 / 3',
        background: 'var(--bg-subtle, #f5f5f5)',
      }}
    >
      {mapSrc ? (
        <iframe
          title={title || 'map'}
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', width: '100%', height: '100%' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : null}
    </div>
  );

  const Row = ({ icon, text }: { icon: ReactNode; text: string }) =>
    text ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end' }}>
        <span aria-hidden="true" style={{ color: 'var(--brand-primary, var(--dw-primary, #1f2937))', display: 'inline-flex' }}>{icon}</span>
        <span style={{ fontSize: 'var(--fs-base, 1rem)', color: 'var(--text, #1f2937)' }}>{text}</span>
      </div>
    ) : null;

  const infoCol = (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        justifyContent: 'center',
        textAlign: 'right',
      }}
    >
      <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
      <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
        <Row icon={<IconChurch />} text={churchName} />
        <Row icon={<IconPin />} text={address} />
        <Row icon={<IconPhone />} text={phone} />
        <Row icon={<IconMail />} text={email} />
      </div>
    </div>
  );

  return (
    <SectionShell
      props={props}
      className={`${sectionBg.className} px-4 sm:px-6`.trim()}
      style={{ paddingBlock: 'var(--section-py-md)', ...sectionBg.style }}
      applyLayout
      defaultContentClass="mx-auto max-w-7xl"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: mapRight ? 'row-reverse' : 'row',
          gap: '2.5rem',
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}
        className="directions-split"
      >
        {mapCol}
        {infoCol}
      </div>
    </SectionShell>
  );
}

/* ── inline icons (currentColor; no external deps) ── */
const SZ = 18;
function IconChurch() {
  return (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v6M9 5h6M12 8 5 12v9h14v-9z" /><path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
    </svg>
  );
}
