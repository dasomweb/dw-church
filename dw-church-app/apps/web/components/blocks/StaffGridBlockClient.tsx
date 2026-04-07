'use client';

import { StaffGrid } from '@dw-church/ui-components';
import type { Staff } from '@dw-church/api-client';
import Link from 'next/link';

interface StaffGridBlockClientProps {
  staff: Staff[];
  slug: string;
  columns?: number;
  grouped?: boolean;
  groupBy?: string;
  customGroups?: string;
  photoStyle?: 'rect' | 'circle';
  showItems?: string;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export function StaffGridBlockClient({
  staff,
  slug,
  columns = 3,
  grouped = false,
  groupBy = 'role',
  customGroups = '',
  photoStyle = 'rect',
  showItems = 'name,role,department,bio',
}: StaffGridBlockClientProps) {

  if (grouped) {
    // Parse custom group order (comma separated)
    const customOrder = customGroups
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Group staff by role or department
    const groups: Record<string, Staff[]> = {};
    for (const member of staff) {
      const key = (groupBy === 'department' ? (member as any).department : (member as any).role) || '기타';
      if (!groups[key]) groups[key] = [];
      groups[key].push(member);
    }

    // Sort groups: custom order first, then remaining alphabetically
    let groupNames: string[];
    if (customOrder.length > 0) {
      const remaining = Object.keys(groups).filter((g) => !customOrder.includes(g));
      groupNames = [...customOrder.filter((g) => groups[g]), ...remaining];
    } else {
      groupNames = Object.keys(groups);
    }

    return (
      <div>
        <div className="space-y-10">
          {groupNames.map((groupName) => {
            const members = groups[groupName];
            if (!members || members.length === 0) return null;
            const gridClass = GRID_COLS[Math.min(members.length, 4)] || GRID_COLS[4];
            return (
              <div key={groupName}>
                <h3 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">{groupName}</h3>
                <StaffGrid
                  data={members}
                  columns={Math.min(members.length, 4)}
                  photoStyle={photoStyle}
                  showItems={showItems}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/staff"
            className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
          >
            전체 교역자 보기
          </Link>
        </div>
      </div>
    );
  }

  // Normal grid mode
  return (
    <div>
      <StaffGrid
        data={staff}
        columns={columns}
        photoStyle={photoStyle}
        showItems={showItems}
      />
      <div className="mt-8 text-center">
        <Link
          href="/staff"
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 교역자 보기
        </Link>
      </div>
    </div>
  );
}
