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
  onItemClick?: (id: string) => void;
  /** Photo style: 'rect' (rectangular) or 'circle' */
  photoStyle?: 'rect' | 'circle';
  /** Grid columns: 2, 3, or 4 */
  columns?: number;
  /** Comma-separated visible fields: name,role,department,bio,contact,sns */
  showItems?: string;
}

const COLUMN_CLASSES: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function StaffGrid({
  data,
  department,
  showFilter = false,
  className = '',
  onItemClick,
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
      ) : (
        <div className={`grid gap-6 ${gridCols}`}>
          {filteredStaff.map((member) => (
            <StaffCard
              key={member.id}
              staff={member}
              onClick={onItemClick}
              photoStyle={photoStyle}
              visibleFields={visibleFields}
            />
          ))}
        </div>
      )}
    </div>
  );
}
