import type { Staff } from '@dw-church/api-client';
import { useStaffMember } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export interface StaffProfileProps {
  data?: Staff;
  postId?: number;
  className?: string;
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
      className="dw-inline-flex dw-items-center dw-gap-1.5 dw-rounded dw-bg-surface-alt dw-px-3 dw-py-1.5 dw-text-sm dw-text-text-secondary dw-transition-colors hover:dw-bg-primary/10 hover:dw-text-primary"
    >
      {labels[type] ?? type}
    </a>
  );
}

export function StaffProfile({ data, postId, className = '' }: StaffProfileProps) {
  const { data: fetchedStaff, isLoading } = useStaffMember(postId ?? 0);
  const staff = data ?? fetchedStaff;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!staff) return <EmptyState title="교역자를 찾을 수 없습니다" />;

  const snsEntries = Object.entries(staff.snsLinks ?? {}).filter(
    ([, url]) => url,
  ) as [string, string][];

  return (
    <div className={`dw-mx-auto dw-max-w-3xl ${className}`}>
      <div className="dw-flex dw-flex-col dw-items-center dw-gap-8 md:dw-flex-row md:dw-items-start">
        {/* Photo */}
        <div className="dw-h-48 dw-w-48 dw-flex-shrink-0 dw-overflow-hidden dw-rounded-full dw-border-4 dw-border-border">
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="dw-h-full dw-w-full dw-object-cover"
            />
          ) : (
            <div className="dw-flex dw-h-full dw-w-full dw-items-center dw-justify-center dw-bg-surface-alt dw-text-5xl dw-text-text-muted">
              {staff.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="dw-flex-1 dw-text-center md:dw-text-left">
          <h1 className="dw-text-2xl dw-font-bold dw-text-text-primary md:dw-text-3xl">
            {staff.name}
          </h1>
          {staff.role && (
            <p className="dw-mt-1 dw-text-lg dw-text-text-secondary">{staff.role}</p>
          )}
          {staff.department && (
            <span className="dw-mt-2 dw-inline-block dw-rounded dw-bg-primary/10 dw-px-3 dw-py-1 dw-text-sm dw-font-medium dw-text-primary">
              {staff.department}
            </span>
          )}

          {/* Contact */}
          <div className="dw-mt-4 dw-space-y-1 dw-text-sm dw-text-text-secondary">
            {staff.email && (
              <p>
                <span className="dw-font-medium dw-text-text-primary">이메일:</span>{' '}
                <a href={`mailto:${staff.email}`} className="hover:dw-text-primary">
                  {staff.email}
                </a>
              </p>
            )}
            {staff.phone && (
              <p>
                <span className="dw-font-medium dw-text-text-primary">전화:</span>{' '}
                <a href={`tel:${staff.phone}`} className="hover:dw-text-primary">
                  {staff.phone}
                </a>
              </p>
            )}
          </div>

          {/* SNS Links */}
          {snsEntries.length > 0 && (
            <div className="dw-mt-4 dw-flex dw-flex-wrap dw-gap-2">
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
          className="dw-prose dw-mt-8 dw-max-w-none dw-text-text-primary"
          dangerouslySetInnerHTML={{ __html: staff.bio }}
        />
      )}
    </div>
  );
}
