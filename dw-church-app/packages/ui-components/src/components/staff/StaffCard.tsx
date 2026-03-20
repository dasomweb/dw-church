import type { Staff } from '@dw-church/api-client';

export interface StaffCardProps {
  staff: Staff;
  onClick?: (id: string) => void;
  className?: string;
}

function SnsIcon({ type, url }: { type: string; url: string }) {
  const icons: Record<string, JSX.Element> = {
    facebook: (
      <svg className="dw-h-4 dw-w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg className="dw-h-4 dw-w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    youtube: (
      <svg className="dw-h-4 dw-w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="dw-text-text-muted dw-transition-colors hover:dw-text-primary"
      aria-label={type}
    >
      {icons[type]}
    </a>
  );
}

export function StaffCard({ staff, onClick, className = '' }: StaffCardProps) {
  const snsEntries = Object.entries(staff.snsLinks ?? {}).filter(
    ([, url]) => url,
  ) as [string, string][];

  return (
    <article
      className={`dw-group dw-cursor-pointer dw-overflow-hidden dw-rounded dw-border dw-border-border dw-bg-surface dw-p-6 dw-text-center dw-transition-shadow hover:dw-shadow-md ${className}`}
      onClick={() => onClick?.(staff.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(staff.id);
        }
      }}
    >
      {/* Photo */}
      <div className="dw-mx-auto dw-h-24 dw-w-24 dw-overflow-hidden dw-rounded-full dw-border-2 dw-border-border">
        {staff.photoUrl ? (
          <img
            src={staff.photoUrl}
            alt={staff.name}
            className="dw-h-full dw-w-full dw-object-cover"
            loading="lazy"
          />
        ) : (
          <div className="dw-flex dw-h-full dw-w-full dw-items-center dw-justify-center dw-bg-surface-alt dw-text-2xl dw-text-text-muted">
            {staff.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="dw-mt-4 dw-text-base dw-font-semibold dw-text-text-primary group-hover:dw-text-primary">
        {staff.name}
      </h3>
      {staff.role && (
        <p className="dw-mt-1 dw-text-sm dw-text-text-secondary">{staff.role}</p>
      )}
      {staff.department && (
        <span className="dw-mt-2 dw-inline-block dw-rounded dw-bg-primary/10 dw-px-2 dw-py-0.5 dw-text-xs dw-font-medium dw-text-primary">
          {staff.department}
        </span>
      )}

      {/* SNS Icons */}
      {snsEntries.length > 0 && (
        <div
          className="dw-mt-3 dw-flex dw-justify-center dw-gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {snsEntries.map(([type, url]) => (
            <SnsIcon key={type} type={type} url={url} />
          ))}
        </div>
      )}
    </article>
  );
}
