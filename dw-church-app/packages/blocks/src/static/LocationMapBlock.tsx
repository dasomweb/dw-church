/**
 * Location map — Google Maps embed with title and address. The map
 * iframe stays inline (it's not a text/image element — no module
 * covers iframes). Title and address delegate to HeadingElement /
 * TextBodyElement so the inspector can override tag + typography.
 *
 * No hardcoded default copy: when title is empty the heading module
 * returns null. Operators supply their own text.
 */

import { HeadingElement, TextBodyElement, EyebrowElement } from '../elements';

interface LocationMapBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function LocationMapBlock({ props }: LocationMapBlockProps) {
  const title = (props.title as string) ?? '';
  const eyebrow = (props.eyebrow as string) ?? '';
  const address = (props.address as string) ?? '';
  const lat = props.lat as number | undefined;
  const lng = props.lng as number | undefined;
  const zoom = (props.zoom as number) ?? 15;

  const mapSrc = lat && lng
    ? `https://www.google.com/maps/embed/v1/view?key=&center=${lat},${lng}&zoom=${zoom}`
    : address
      ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
      : '';

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <EyebrowElement text={eyebrow} props={props} elementKey="eyebrow" />
          <HeadingElement text={title} props={props} elementKey="title" defaultTag="h2" defaultSize="h2" />
          <span aria-hidden="true" style={{ display: 'block', width: 48, height: 3, borderRadius: 2, backgroundColor: 'var(--brand-primary, var(--dw-primary, #2563eb))' }} />
        </div>
        {mapSrc && (
          <div
            className="mb-6 overflow-hidden rounded-2xl"
            style={{ border: '1px solid var(--brand-border, #e2e8f0)', boxShadow: '0 16px 40px -18px rgba(0,0,0,0.25)' }}
          >
            <iframe
              src={mapSrc}
              width="100%"
              height="420"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Location"
            />
          </div>
        )}
        {address && (
          <div className="flex items-center justify-center gap-2 text-center">
            <span aria-hidden="true" style={{ color: 'var(--brand-primary, var(--dw-primary, #2563eb))', display: 'inline-flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </span>
            <TextBodyElement text={address} props={props} elementKey="address" defaultTag="p" defaultSize="body" />
          </div>
        )}
      </div>
    </section>
  );
}
