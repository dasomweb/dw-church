import { useState } from 'react';
import type { Staff } from '@dw-church/api-client';
import { useStaff, useStaffDepartments } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { StaffCard } from './StaffCard';
import { StaffDepartmentTabs } from './StaffDepartmentTabs';

export interface StaffGridProps {
  data?: Staff[];
  department?: string;
  showFilter?: boolean;
  className?: string;
  onItemClick?: (id: number) => void;
}

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

  return (
    <div className={className}>
      {showFilter && departments && departments.length > 0 && (
        <StaffDepartmentTabs
          departments={departments}
          selected={selectedDept}
          onSelect={setSelectedDept}
          className="dw-mb-6"
        />
      )}

      {filteredStaff.length === 0 ? (
        <EmptyState title="교역자가 없습니다" />
      ) : (
        <div className="dw-grid dw-grid-cols-1 dw-gap-4 sm:dw-grid-cols-2 md:dw-grid-cols-3 lg:dw-grid-cols-4">
          {filteredStaff.map((member) => (
            <StaffCard key={member.id} staff={member} onClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}
