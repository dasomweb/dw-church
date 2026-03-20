import { getStaff } from '@/lib/api';
import { StaffGridBlockClient } from './StaffGridBlockClient';

interface StaffGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function StaffGridBlock({ props, slug }: StaffGridBlockProps) {
  const limit = (props.limit as number) ?? 8;

  let staff;
  try {
    const allStaff = await getStaff(slug);
    staff = allStaff.slice(0, limit);
  } catch {
    staff = [];
  }

  if (staff.length === 0) return null;

  return (
    <section className="px-6 py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">교역자</h2>
        <StaffGridBlockClient staff={staff} slug={slug} />
      </div>
    </section>
  );
}
