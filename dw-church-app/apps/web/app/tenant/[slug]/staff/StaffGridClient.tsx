'use client';

import { useRouter } from 'next/navigation';
import { StaffGrid } from '@dw-church/ui-components';
import type { Staff } from '@dw-church/api-client';

interface StaffGridClientProps {
  staff: Staff[];
}

export function StaffGridClient({ staff }: StaffGridClientProps) {
  const router = useRouter();

  return <StaffGrid data={staff} onItemClick={(id) => router.push(`/staff/${id}`)} />;
}
