import { getStaff, getChurchSettings } from '@/lib/api';
import { StaffGridBlockClient } from './StaffGridBlockClient';

interface StaffGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function StaffGridBlock({ props, slug }: StaffGridBlockProps) {
  const limit = (props.limit as number) ?? 20;
  const showItems = (props.showItems as string) ?? 'name,role,department,bio';

  // Read display settings from tenant settings (managed in StaffManagement)
  let displaySettings: any = {};
  try {
    const settings = await getChurchSettings(slug);
    displaySettings = (settings as any)?.staffDisplay || {};
  } catch { /* use defaults */ }

  const layout = displaySettings.layout || (props.variant as string) || 'grid';
  const grouped = layout === 'grouped';
  const columns = grouped ? 4 : (displaySettings.columns || (layout.startsWith('grid-') ? parseInt(layout.replace('grid-', '')) : 4));
  const groupBy = displaySettings.groupBy || (props.groupBy as string) || 'role';
  const customGroups = displaySettings.customGroups || (props.customGroups as string) || '';
  const photoStyle = (props.photoStyle as 'rect' | 'circle') ?? 'rect';

  let staff;
  try {
    const allStaff = await getStaff(slug);
    staff = allStaff.slice(0, limit);
  } catch {
    staff = [];
  }

  if (staff.length === 0) {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading">교역자 소개</h2>
          <p className="text-gray-400 text-sm">등록된 교역자가 없습니다.</p>
        </div>
      </section>
    );
  }

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
