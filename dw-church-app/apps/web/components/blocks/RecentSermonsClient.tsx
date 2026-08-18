'use client';

import { useRouter } from 'next/navigation';
import type { Sermon } from '@dw-church/api-client';
import Link from 'next/link';
import Image from 'next/image';

interface RecentSermonsClientProps {
  sermons: Sermon[];
  slug: string;
  columns?: number;
  /** featured layout: 1 large lead sermon + a compact side list of the rest. */
  featured?: boolean;
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const accentSoft = 'color-mix(in srgb, var(--dw-primary, #2563eb) 12%, transparent)';

// Sermon dates arrive as UTC-midnight ISO strings (e.g. "2023-07-09T00:00:00.000Z").
// Show the date only — no time — and parse the YYYY-MM-DD prefix directly so a
// negative-offset timezone never shifts it to the previous day.
function formatSermonDate(raw: string): string {
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(raw);
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

export function RecentSermonsClient({ sermons, columns = 3, featured = false }: RecentSermonsClientProps) {
  const router = useRouter();
  const gridClass = GRID_COLS[columns] || GRID_COLS[3];
  const isList = columns === 1;

  // ── featured: one large lead sermon + a compact side list ──────────────
  if (featured && sermons.length > 0) {
    const lead: any = sermons[0];
    const rest: any[] = sermons.slice(1, 5);
    return (
      <div>
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <button
            onClick={() => router.push(`/sermons/${lead.id}`)}
            className="group text-left rounded-2xl overflow-hidden bg-white border border-black/[0.06] shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="relative aspect-video overflow-hidden bg-gray-100">
              {lead.thumbnailUrl ? (
                <Image src={lead.thumbnailUrl} alt={lead.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 1024px) 100vw, 60vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/90 text-4xl" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>🎤</div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                <span className="grid place-items-center w-16 h-16 rounded-full bg-white/95 shadow-lg" style={{ color: 'var(--dw-primary, #2563eb)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
            </div>
            <div className="p-5">
              {lead.scripture && <span className="inline-block rounded-full text-[11px] font-semibold px-2.5 py-0.5 mb-2" style={{ backgroundColor: accentSoft, color: 'var(--dw-primary, #2563eb)' }}>{lead.scripture}</span>}
              <h3 className="font-bold font-heading text-lg sm:text-xl leading-snug line-clamp-2">{lead.title}</h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                {lead.preacher && <span className="truncate">{lead.preacher}</span>}
                {lead.preacher && lead.date && <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />}
                {lead.date && <span className="shrink-0">{formatSermonDate(lead.date)}</span>}
              </div>
            </div>
          </button>
          <div className="flex flex-col">
            {rest.map((s: any) => (
              <button key={s.id} onClick={() => router.push(`/sermons/${s.id}`)} className="group flex items-center gap-3 py-3 border-t border-black/[0.06] text-left first:border-t-0">
                <div className="relative w-24 h-16 flex-none overflow-hidden rounded-lg bg-gray-100">
                  {s.thumbnailUrl ? (
                    <Image src={s.thumbnailUrl} alt={s.title} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/90" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>🎤</div>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-[var(--dw-primary)]">{s.title}</h4>
                  <div className="mt-1 text-xs text-gray-400">{s.date ? formatSermonDate(s.date) : s.preacher}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link href="/sermons" className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all" style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}>
            전체 설교 보기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid ${gridClass} gap-6 sm:gap-7`}>
        {sermons.map((sermon: any) => (
          <button
            key={sermon.id}
            onClick={() => router.push(`/sermons/${sermon.id}`)}
            className={`group text-left rounded-2xl overflow-hidden bg-white border border-black/[0.06] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isList ? 'flex' : ''}`}
          >
            <div className={`relative overflow-hidden bg-gray-100 ${isList ? 'w-56 flex-shrink-0' : 'aspect-video'}`}>
              {sermon.thumbnailUrl ? (
                <Image src={sermon.thumbnailUrl} alt={sermon.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 33vw" />
              ) : (
                <div className="w-full h-full min-h-[140px] flex items-center justify-center text-white/90 text-2xl sm:text-3xl" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>🎤</div>
              )}
              {/* play affordance — sermons are video/audio messages */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                <span className="grid place-items-center w-12 h-12 rounded-full bg-white/95 shadow-lg translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300" style={{ color: 'var(--dw-primary, #2563eb)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
            </div>
            <div className="p-4 sm:p-5 flex-1 min-w-0">
              {sermon.scripture && (
                <span className="inline-block rounded-full text-[11px] font-semibold px-2.5 py-0.5 mb-2" style={{ backgroundColor: accentSoft, color: 'var(--dw-primary, #2563eb)' }}>
                  {sermon.scripture}
                </span>
              )}
              <h3 className="font-bold font-heading text-[15px] leading-snug line-clamp-2 transition-colors group-hover:text-[var(--dw-primary)]">{sermon.title}</h3>
              <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-400">
                {sermon.preacher && <span className="truncate">{sermon.preacher}</span>}
                {sermon.preacher && sermon.date && <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />}
                {sermon.date && <span className="shrink-0">{formatSermonDate(sermon.date)}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/sermons"
          className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: 'var(--dw-primary, #2563eb)' }}
        >
          전체 설교 보기
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </div>
  );
}
