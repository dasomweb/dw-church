import { getStaff } from '@/lib/api';
import { StaffGridClient } from './StaffGridClient';

interface StaffPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { slug } = await params;
  const staff = await getStaff(slug);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">교역자 소개</h1>
      <StaffGridClient staff={staff} />
    </div>
  );
}
