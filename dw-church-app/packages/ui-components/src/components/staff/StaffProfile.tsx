import type { Staff } from '@dw-church/api-client';
import { useStaffMember } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export interface StaffProfileProps {
  data?: Staff;
  postId?: string;
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
      className="inline-flex items-center gap-1.5 rounded bg-surface-alt px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
    >
      {labels[type] ?? type}
    </a>
  );
}

export function StaffProfile({ data, postId, className = '' }: StaffProfileProps) {
  const { data: fetchedStaff, isLoading } = useStaffMember(postId ?? '');
  const staff = data ?? fetchedStaff;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!staff) return <EmptyState title="교역자를 찾을 수 없습니다" />;

  const snsEntries = Object.entries(staff.snsLinks ?? {}).filter(
    ([, url]) => url,
  ) as [string, string][];

  return (
    <div className={`mx-auto max-w-3xl ${className}`}>
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
        {/* Photo */}
        <div className="h-48 w-48 flex-shrink-0 overflow-hidden rounded-full border-4 border-border">
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-alt text-5xl text-text-muted">
              {staff.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            {staff.name}
          </h1>
          {staff.role && (
            <p className="mt-1 text-lg text-text-secondary">{staff.role}</p>
          )}
          {staff.department && (
            <span className="mt-2 inline-block rounded bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {staff.department}
            </span>
          )}

          {/* Contact */}
          <div className="mt-4 space-y-1 text-sm text-text-secondary">
            {staff.email && (
              <p>
                <span className="font-medium text-text-primary">이메일:</span>{' '}
                <a href={`mailto:${staff.email}`} className="hover:text-primary">
                  {staff.email}
                </a>
              </p>
            )}
            {staff.phone && (
              <p>
                <span className="font-medium text-text-primary">전화:</span>{' '}
                <a href={`tel:${staff.phone}`} className="hover:text-primary">
                  {staff.phone}
                </a>
              </p>
            )}
          </div>

          {/* SNS Links */}
          {snsEntries.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
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
          className="prose mt-8 max-w-none text-text-primary"
          dangerouslySetInnerHTML={{ __html: staff.bio }}
        />
      )}
    </div>
  );
}
