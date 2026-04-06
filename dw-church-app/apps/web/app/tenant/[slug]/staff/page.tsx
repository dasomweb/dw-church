import { getStaff } from '@/lib/api';
import { StaffGridClient } from './StaffGridClient';
import { PageHeroBanner } from '@/components/PageHeroBanner';
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
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="staff" fallbackTitle="교역자 소개" fallbackSubtitle="함께 섬기는 사역자들" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <StaffGridClient staff={staff} />
      </div>
    </div>
  );
}
