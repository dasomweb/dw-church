'use client';

import { useRouter } from 'next/navigation';
import { StaffGrid } from '@dw-church/ui-components';
import type { Staff } from '@dw-church/api-client';

interface StaffGridClientProps {
  staff: Staff[];
  columns?: number;
}

export function StaffGridClient({ staff, columns = 4 }: StaffGridClientProps) {
  const router = useRouter();

  return <StaffGrid data={staff} columns={columns} />;
}
