import { getStaff } from '@/lib/api';
import { getBlockProps, variantToColumns } from '@/lib/page-props';
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

  const [staff, blockProps] = await Promise.all([
    getStaff(slug),
    getBlockProps(slug, 'staff', 'staff_grid'),
  ]);

  const variant = (blockProps.variant as string) || 'grid-4';
  const columns = variantToColumns(variant, 4);
  const grouped = variant === 'grouped';
  const groupBy = (blockProps.groupBy as string) || 'role';
  const customGroups = (blockProps.customGroups as string) || '';

  return (
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="staff" fallbackTitle="교역자 소개" fallbackSubtitle="함께 섬기는 사역자들" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <StaffGridClient
          staff={staff}
          columns={columns}
          grouped={grouped}
          groupBy={groupBy}
          customGroups={customGroups}
        />
      </div>
    </div>
  );
}
