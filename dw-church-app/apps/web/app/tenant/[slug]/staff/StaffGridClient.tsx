'use client';

import { StaffGrid } from '@dw-church/ui-components';
import type { Staff } from '@dw-church/api-client';

interface StaffGridClientProps {
  staff: Staff[];
  columns?: number;
  grouped?: boolean;
  groupBy?: string;
  customGroups?: string;
}

export function StaffGridClient({
  staff,
  columns = 4,
  grouped = false,
  groupBy = 'role',
  customGroups = '',
}: StaffGridClientProps) {

  if (grouped) {
    const customOrder = customGroups.split(',').map((s) => s.trim()).filter(Boolean);

    const groups: Record<string, Staff[]> = {};
    for (const member of staff) {
      const key = (groupBy === 'department' ? (member as any).department : (member as any).role) || '기타';
      if (!groups[key]) groups[key] = [];
      groups[key].push(member);
    }

    let groupNames: string[];
    if (customOrder.length > 0) {
      const remaining = Object.keys(groups).filter((g) => !customOrder.includes(g));
      groupNames = [...customOrder.filter((g) => groups[g]), ...remaining];
    } else {
      groupNames = Object.keys(groups);
    }

    return (
      <div className="space-y-10">
        {groupNames.map((groupName) => {
          const members = groups[groupName];
          if (!members || members.length === 0) return null;
          return (
            <div key={groupName}>
              <h3 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">{groupName}</h3>
              <StaffGrid data={members} columns={Math.min(members.length, 4)} />
            </div>
          );
        })}
      </div>
    );
  }

  return <StaffGrid data={staff} columns={columns} />;
}
