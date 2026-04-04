import { getStaff } from '@/lib/api';
import { StaffGridClient } from './StaffGridClient';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface StaffPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StaffPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '교역자');
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { slug } = await params;
  const staff = await getStaff(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">교역자 소개</h1>
      <StaffGridClient staff={staff} />
    </div>
  );
}
