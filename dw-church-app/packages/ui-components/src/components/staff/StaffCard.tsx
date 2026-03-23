import type { Staff } from '@dw-church/api-client';

export interface StaffCardProps {
  staff: Staff;
  onClick?: (id: string) => void;
  className?: string;
}

function SnsIcon({ type, url }: { type: string; url: string }) {
  const icons: Record<string, JSX.Element> = {
    facebook: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    youtube: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-all duration-200 hover:bg-primary hover:text-white"
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
      className={`group cursor-pointer overflow-hidden rounded-lg bg-white px-6 pb-6 pt-8 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${className}`}
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
      {/* Circular photo */}
      <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-[3px] border-gray-100 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg">
        {staff.photoUrl ? (
          <img
            src={staff.photoUrl}
            alt={staff.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-3xl font-semibold text-gray-300">
            {staff.name?.charAt(0) ?? ''}
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="mt-4 text-base font-bold text-gray-900 transition-colors duration-200 group-hover:text-primary">
        {staff.name}
      </h3>

      {/* Role */}
      {staff.role && (
        <p className="mt-1 text-[13px] text-gray-500">{staff.role}</p>
      )}

      {/* Department badge */}
      {staff.department && (
        <span className="mt-2.5 inline-block rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
          {staff.department}
        </span>
      )}

      {/* SNS Icons */}
      {snsEntries.length > 0 && (
        <div
          className="mt-4 flex justify-center gap-2"
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
