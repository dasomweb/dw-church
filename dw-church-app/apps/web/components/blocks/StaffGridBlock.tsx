import { getStaff } from '@/lib/api';
import { StaffGridBlockClient } from './StaffGridBlockClient';

interface StaffGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function StaffGridBlock({ props, slug }: StaffGridBlockProps) {
  const limit = (props.limit as number) ?? 20;
  const variant = (props.variant as string) || 'grid-4';
  const photoStyle = (props.photoStyle as 'rect' | 'circle') ?? 'rect';
  const columns = variant.startsWith('grid-') ? parseInt(variant.replace('grid-', '')) || 3 : 3;
  const grouped = variant === 'grouped';
  const groupBy = (props.groupBy as string) || 'role';
  const customGroups = (props.customGroups as string) || '';
  const showItems = (props.showItems as string) ?? 'name,role,department,bio';

  let staff;
  try {
    const allStaff = await getStaff(slug);
    staff = allStaff.slice(0, limit);
  } catch {
    staff = [];
  }

  if (staff.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">
          {(props.title as string) || '교역자'}
        </h2>
        <StaffGridBlockClient
          staff={staff}
          slug={slug}
          columns={columns}
          grouped={grouped}
          groupBy={groupBy}
          customGroups={customGroups}
          photoStyle={photoStyle}
          showItems={showItems}
        />
      </div>
    </section>
  );
}
