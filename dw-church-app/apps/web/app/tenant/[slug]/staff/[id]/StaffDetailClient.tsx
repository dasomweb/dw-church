'use client';

import type { Staff } from '@dw-church/api-client';
import Link from 'next/link';

interface StaffDetailClientProps {
  staff: Staff;
  slug: string;
}

function SnsLink({ type, url }: { type: string; url: string }) {
  const labels: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-[var(--dw-primary)]/10 hover:text-[var(--dw-primary)]"
    >
      {labels[type] ?? type}
    </a>
  );
}

export function StaffDetailClient({ staff, slug }: StaffDetailClientProps) {
  const snsEntries = Object.entries(staff.snsLinks ?? {}).filter(
    ([, url]) => url,
  ) as [string, string][];

  return (
    <div>
      <Link
        href="/staff"
        className="mb-8 inline-block text-sm text-[var(--dw-primary)] hover:underline"
      >
        &larr; 교역자 목록
      </Link>

      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
        {/* Large Photo */}
        <div className="h-64 w-64 flex-shrink-0 overflow-hidden rounded-full border-4 border-gray-200 shadow-lg">
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-6xl text-gray-400">
              {staff.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold font-heading">{staff.name}</h1>
          {staff.role && (
            <p className="mt-2 text-lg text-gray-600">{staff.role}</p>
          )}
          {staff.department && (
            <span className="mt-3 inline-block rounded-full bg-[var(--dw-primary)]/10 px-4 py-1.5 text-sm font-medium text-[var(--dw-primary)]">
              {staff.department}
            </span>
          )}

          {/* Contact */}
          <div className="mt-6 space-y-2 text-sm text-gray-600">
            {staff.email && (
              <p>
                <span className="font-medium text-gray-900">이메일:</span>{' '}
                <a href={`mailto:${staff.email}`} className="hover:text-[var(--dw-primary)]">
                  {staff.email}
                </a>
              </p>
            )}
            {staff.phone && (
              <p>
                <span className="font-medium text-gray-900">전화:</span>{' '}
                <a href={`tel:${staff.phone}`} className="hover:text-[var(--dw-primary)]">
                  {staff.phone}
                </a>
              </p>
            )}
          </div>

          {/* SNS Links */}
          {snsEntries.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {snsEntries.map(([type, url]) => (
                <SnsLink key={type} type={type} url={url} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {staff.bio && (
        <div
          className="prose mt-10 max-w-none"
          dangerouslySetInnerHTML={{ __html: staff.bio }}
        />
      )}
    </div>
  );
}
