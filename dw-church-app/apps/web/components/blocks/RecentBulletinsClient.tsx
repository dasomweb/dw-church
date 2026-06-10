'use client';

import { useRouter } from 'next/navigation';
import type { Bulletin } from '@dw-church/api-client';
import Link from 'next/link';

interface RecentBulletinsClientProps {
  bulletins: Bulletin[];
  slug: string;
  columns?: number;
}

const GRID_COLS: Record<number, string> = {
  1: '',
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
  5: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4',
  6: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3',
};

const accentSoft = 'color-mix(in srgb, var(--dw-primary, #2563eb) 12%, transparent)';

function DocIcon() {
  return (
    <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: accentSoft, color: 'var(--dw-primary, #2563eb)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" />
      </svg>
    </span>
  );
}

export function RecentBulletinsClient({ bulletins, slug, columns = 1 }: RecentBulletinsClientProps) {
  const router = useRouter();
  const isGrid = columns > 1;
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];

  return (
    <div>
      <div className={isGrid ? gridClass : 'space-y-3'}>
        {bulletins.map((b: any) => (
          <button
            key={b.id}
            onClick={() => router.push(`/bulletins/${b.id}`)}
            className="group w-full text-left rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3.5"
          >
            <DocIcon />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-1 transition-colors group-hover:text-[var(--dw-primary)]">{b.title}</h3>
              {b.date && <p className="text-xs text-gray-400 mt-0.5">{b.date}</p>}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-gray-300 group-hover:text-[var(--dw-primary)] group-hover:translate-x-0.5 transition-all shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/bulletins"
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}
        >
          전체 주보 보기
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </div>
  );
}
