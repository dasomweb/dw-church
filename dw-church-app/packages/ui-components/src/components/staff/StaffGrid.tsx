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
}

/** Roles that should be featured (large layout) */
const FEATURED_ROLES = new Set(['담임목사', 'Senior Pastor', 'Lead Pastor']);

export function StaffGrid({
  data,
  department,
  showFilter = true,
  className = '',
  onItemClick,
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

  // Separate featured (lead pastor) from grid members
  const featured = filteredStaff.filter((s) => FEATURED_ROLES.has(s.role ?? ''));
  const gridMembers = filteredStaff.filter((s) => !FEATURED_ROLES.has(s.role ?? ''));

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
      ) : (
        <div className="space-y-12">
          {/* Featured staff — large horizontal card */}
          {featured.map((member) => (
            <StaffFeatured key={member.id} staff={member} />
          ))}

          {/* Grid members */}
          {gridMembers.length > 0 && (
            <div>
              {featured.length > 0 && (
                <h3 className="mb-6 text-xl font-bold text-gray-900">
                  교역자 소개
                </h3>
              )}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {gridMembers.map((member) => (
                  <StaffCard key={member.id} staff={member} onClick={onItemClick} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
