import type { Staff } from '@dw-church/api-client';

export interface StaffCardProps {
  staff: Staff;
  onClick?: (id: string) => void;
  className?: string;
  /** Photo shape: 'rect' (default) or 'circle' */
  photoStyle?: 'rect' | 'circle';
  /** Which fields to show (default: all) */
  visibleFields?: Set<string>;
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white"
      aria-label={type}
    >
      {icons[type]}
    </a>
  );
}

/**
 * Featured staff card — large, horizontal layout for lead pastor.
 */
export function StaffFeatured({ staff, className = '' }: { staff: Staff; className?: string }) {
  const snsEntries = Object.entries(staff.snsLinks ?? {}).filter(
    ([, url]) => url,
  ) as [string, string][];

  return (
    <div className={`overflow-hidden rounded-xl bg-white shadow-sm ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Photo — left side */}
        <div className="relative w-full md:w-2/5">
          {/* Role badge */}
          {staff.role && (
            <span className="absolute left-4 top-4 z-10 rounded bg-primary/90 px-3 py-1 text-xs font-semibold text-white">
              {staff.role}
            </span>
          )}
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="h-full min-h-[320px] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-gray-100 text-6xl font-semibold text-gray-300">
              {staff.name?.charAt(0) ?? ''}
            </div>
          )}
        </div>

        {/* Info — right side */}
        <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-8">
          <h2 className="text-2xl font-bold text-gray-900">{staff.name}</h2>

          {/* Bio */}
          {staff.bio && (
            <div
              className="mt-4 text-sm leading-relaxed text-gray-600"
              dangerouslySetInnerHTML={{ __html: staff.bio }}
            />
          )}

          {/* SNS Icons */}
          {snsEntries.length > 0 && (
            <div className="mt-5 flex gap-2">
              {snsEntries.map(([type, url]) => (
                <SnsIcon key={type} type={type} url={url} />
              ))}
            </div>
          )}

          {/* Department */}
          {staff.department && (
            <div className="mt-5 border-t border-gray-100 pt-5">
              <span className="text-sm font-medium text-gray-900">{staff.department} 사역</span>
            </div>
          )}

          {/* Contact */}
          <div className="mt-4 space-y-1">
            {staff.email && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">이메일:</span> {staff.email}
              </p>
            )}
            {staff.phone && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">전화:</span> {staff.phone}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid staff card — rectangular photo with role badge.
 */
export function StaffCard({ staff, onClick, className = '', photoStyle = 'rect', visibleFields }: StaffCardProps) {
  const show = (field: string) => !visibleFields || visibleFields.has(field);
  const PASTEL_COLORS = [
    'bg-teal-50', 'bg-rose-50', 'bg-sky-50', 'bg-amber-50',
    'bg-emerald-50', 'bg-violet-50', 'bg-pink-50', 'bg-cyan-50',
  ];
  const bgColor = PASTEL_COLORS[
    staff.name?.charCodeAt(0) ? staff.name.charCodeAt(0) % PASTEL_COLORS.length : 0
  ];

  return (
    <article
      className={`group overflow-hidden rounded-xl bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(staff.id)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(staff.id);
        }
      }}
    >
      {/* Photo */}
      {photoStyle === 'circle' ? (
        <div className="flex justify-center pt-8">
          <div className={`h-32 w-32 overflow-hidden rounded-full ${bgColor}`}>
            {staff.photoUrl ? (
              <img src={staff.photoUrl} alt={staff.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-gray-300">{staff.name?.charAt(0) ?? ''}</div>
            )}
          </div>
        </div>
      ) : (
        <div className={`relative aspect-[4/5] w-full overflow-hidden ${bgColor}`}>
          {staff.photoUrl ? (
            <img src={staff.photoUrl} alt={staff.name} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-gray-300">{staff.name?.charAt(0) ?? ''}</div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`px-4 pb-5 pt-4 ${photoStyle === 'circle' ? 'text-center' : ''}`}>
        {show('name') && (
          <h3 className="text-base font-bold text-gray-900 transition-colors duration-200 group-hover:text-primary">
            {staff.name}
          </h3>
        )}

        {/* Role */}
        {show('role') && staff.role && (
          <p className="mt-1 text-[13px] text-gray-500">{staff.role}</p>
        )}

        {/* Department */}
        {show('department') && staff.department && (
          <p className="mt-1 text-[13px] text-gray-500">{staff.department}</p>
        )}

        {/* Short bio excerpt */}
        {show('bio') && staff.bio && (
          <p
            className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-gray-400"
            dangerouslySetInnerHTML={{
              __html: staff.bio.replace(/<[^>]*>/g, '').slice(0, 80),
            }}
          />
        )}
      </div>
    </article>
  );
}
