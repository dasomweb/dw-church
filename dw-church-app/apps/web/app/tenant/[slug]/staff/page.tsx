import { getStaff, getPageBySlug, getChurchSettings } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
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

  let page;
  try { page = await getPageBySlug(slug, 'staff'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  const [staff, settings] = await Promise.all([
    getStaff(slug),
    getChurchSettings(slug).catch(() => ({})),
  ]);

  const displaySettings = (settings as any)?.staffDisplay || {};

  return (
    <div>
      {sections.map((section: any) => {
        if (section.blockType === 'staff_grid') {
          const layout = displaySettings.layout || 'grid';
          const grouped = layout === 'grouped';
          const columns = grouped ? 4 : (displaySettings.columns || 4);
          const groupBy = displaySettings.groupBy || 'role';
          const customGroups = displaySettings.customGroups || '';
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <StaffGridClient
                  staff={staff}
                  columns={columns}
                  grouped={grouped}
                  groupBy={groupBy}
                  customGroups={customGroups}
                />
              </div>
            </section>
          );
        }
        return <BlockRenderer key={section.id} section={section} slug={slug} />;
      })}
    </div>
  );
}
