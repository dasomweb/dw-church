/**
 * Location map — Google Maps embed with title and address. The map
 * iframe stays inline (it's not a text/image element — no module
 * covers iframes). Title and address delegate to HeadingElement /
 * TextBodyElement so the inspector can override tag + typography.
 *
 * No hardcoded default copy: when title is empty the heading module
 * returns null. Operators supply their own text.
 */

import { HeadingElement, TextBodyElement } from '../elements';

interface LocationMapBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function LocationMapBlock({ props }: LocationMapBlockProps) {
  const title = (props.title as string) ?? '';
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
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
          className="mb-8 text-center"
        />
        {mapSrc && (
          <div className="mb-6 overflow-hidden rounded-xl">
            <iframe
              src={mapSrc}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Location"
            />
          </div>
        )}
        <TextBodyElement
          text={address}
          props={props}
          elementKey="address"
          defaultTag="p"
          defaultSize="body"
          className="text-center"
        />
      </div>
    </section>
  );
}
