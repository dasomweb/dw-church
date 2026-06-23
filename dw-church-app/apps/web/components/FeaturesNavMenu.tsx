'use client';

import Link from 'next/link';
import { FEATURE_GROUPS } from '../app/features/featuresData';

type Lang = 'ko' | 'en';

/**
 * Header "기능" menu — hovering reveals the four feature pages so they're
 * reachable directly from the nav (not only via the landing grid link).
 */
export default function FeaturesNavMenu({ lang, label }: { lang: Lang; label: string }) {
  return (
    <div className="relative group">
      <Link href="/features" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        {label}
        <svg className="h-3 w-3 text-gray-400 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Link>
      {/* pt-3 bridges the gap so the menu stays open while moving the cursor onto it */}
      <div className="absolute left-1/2 top-full hidden -translate-x-1/2 pt-3 group-hover:block">
        <div className="w-60 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
          {FEATURE_GROUPS.map((g) => (
            <Link
              key={g.slug}
              href={`/features/${g.slug}`}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600"
            >
              {g[lang].tab}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
