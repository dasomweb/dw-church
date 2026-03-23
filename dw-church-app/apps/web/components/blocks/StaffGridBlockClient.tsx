'use client';

import { StaffGrid } from '@dw-church/ui-components';
import type { Staff } from '@dw-church/api-client';
import Link from 'next/link';

interface StaffGridBlockClientProps {
  staff: Staff[];
  slug: string;
}

export function StaffGridBlockClient({ staff, slug }: StaffGridBlockClientProps) {
  return (
    <div>
      <StaffGrid data={staff} />
      <div className="mt-8 text-center">
        <Link
          href={`/tenant/${slug}/staff`}
          className="inline-block rounded-lg border border-[var(--dw-primary)] px-6 py-2 text-sm font-medium text-[var(--dw-primary)] hover:bg-[var(--dw-primary)] hover:text-white transition-colors"
        >
          전체 교역자 보기
        </Link>
      </div>
    </div>
  );
}
