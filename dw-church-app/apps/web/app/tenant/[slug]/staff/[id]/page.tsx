import { getStaffMember } from '@/lib/api';
import { StaffDetailClient } from './StaffDetailClient';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface StaffDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: StaffDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const staff = await getStaffMember(slug, id);
    return buildTenantMetadata(slug, staff?.name ?? '교역자');
  } catch {
    return buildTenantMetadata(slug, '교역자');
  }
}

export default async function StaffDetailPage({ params }: StaffDetailProps) {
  const { slug, id } = await params;

  if (!id) {
    notFound();
  }

  let staff;
  try {
    staff = await getStaffMember(slug, id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <StaffDetailClient staff={staff} slug={slug} />
    </div>
  );
}
