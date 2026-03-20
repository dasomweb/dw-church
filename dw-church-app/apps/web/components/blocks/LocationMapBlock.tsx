interface LocationMapBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function LocationMapBlock({ props }: LocationMapBlockProps) {
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
    <section className="px-6 py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">오시는 길</h2>
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
              title="교회 위치"
            />
          </div>
        )}
        {address && (
          <p className="text-center text-gray-600">{address}</p>
        )}
      </div>
    </section>
  );
}
