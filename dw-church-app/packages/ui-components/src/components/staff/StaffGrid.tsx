import { useState } from 'react';
import type { Staff } from '@dw-church/api-client';
import { useStaff, useStaffDepartments } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { StaffCard, StaffFeatured } from './StaffCard';
import { StaffDepartmentTabs } from './StaffDepartmentTabs';

export interface StaffGridProps {
  data?: Staff[];
  department?: string;
  showFilter?: boolean;
  className?: string;
  onItemClick?: (id: string) => void;
  /** Layout mode: 'featured' (lead pastor large), 'grid', 'list' */
  layout?: 'featured' | 'grid' | 'list';
  /** Photo style: 'rect' (rectangular) or 'circle' */
  photoStyle?: 'rect' | 'circle';
  /** Grid columns: 2, 3, or 4 */
  columns?: number;
  /** Comma-separated visible fields: name,role,department,bio,contact,sns */
  showItems?: string;
}

/** Roles that qualify for featured display */
const FEATURED_ROLES = new Set(['담임목사', 'Senior Pastor', 'Lead Pastor']);

const COLUMN_CLASSES: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function StaffGrid({
  data,
  department,
  showFilter = true,
  className = '',
  onItemClick,
  layout = 'featured',
  photoStyle = 'rect',
  columns = 3,
  showItems = 'name,role,department,bio',
}: StaffGridProps) {
  const [selectedDept, setSelectedDept] = useState(department ?? '');
  const { data: fetchedStaff, isLoading } = useStaff(
    selectedDept ? { department: selectedDept } : undefined,
  );
  const { data: departments } = useStaffDepartments();

  const staffList = data ?? fetchedStaff ?? [];
  const filteredStaff = data
    ? selectedDept
      ? staffList.filter((s) => s.department === selectedDept)
      : staffList
    : staffList;

  if (!data && isLoading) return <LoadingSpinner />;

  const visibleFields = new Set(showItems.split(',').map((s) => s.trim()));

  // Separate featured from grid (only in 'featured' layout)
  const featured =
    layout === 'featured'
      ? filteredStaff.filter((s) => FEATURED_ROLES.has(s.role ?? ''))
      : [];
  const gridMembers =
    layout === 'featured'
      ? filteredStaff.filter((s) => !FEATURED_ROLES.has(s.role ?? ''))
      : filteredStaff;

  const gridCols = COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[3];

  return (
    <div className={className}>
      {showFilter && departments && departments.length > 0 && (
        <StaffDepartmentTabs
          departments={departments}
          selected={selectedDept}
          onSelect={setSelectedDept}
          className="mb-8"
        />
      )}

      {filteredStaff.length === 0 ? (
        <EmptyState title="교역자가 없습니다" />
      ) : layout === 'list' ? (
        /* List layout */
        <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
          {filteredStaff.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
            >
              {/* Photo */}
              <div
                className={`h-16 w-16 shrink-0 overflow-hidden ${
                  photoStyle === 'circle' ? 'rounded-full' : 'rounded-lg'
                } bg-gray-100`}
              >
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-300">
                    {member.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {visibleFields.has('name') && (
                  <h3 className="font-semibold text-gray-900">{member.name}</h3>
                )}
                <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                  {visibleFields.has('role') && member.role && <span>{member.role}</span>}
                  {visibleFields.has('department') && member.department && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {member.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Featured + Grid layout */
        <div className="space-y-12">
          {/* Featured staff — large horizontal card */}
          {featured.map((member) => (
            <StaffFeatured key={member.id} staff={member} />
          ))}

          {/* Grid members */}
          {gridMembers.length > 0 && (
            <div>
              {featured.length > 0 && (
                <h3 className="mb-6 text-xl font-bold text-gray-900">교역자 소개</h3>
              )}
              <div className={`grid gap-6 ${gridCols}`}>
                {gridMembers.map((member) => (
                  <StaffCard
                    key={member.id}
                    staff={member}
                    onClick={onItemClick}
                    photoStyle={photoStyle}
                    visibleFields={visibleFields}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
