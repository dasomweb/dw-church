'use client';

import Link from 'next/link';
import { useSiteBrand } from './useSiteBrand';

/**
 * Marketing-site logo. Renders the uploaded logo (at the configured height) when
 * set; otherwise the default "TRUE LIGHT" wordmark (or a custom site name).
 * Managed in super-admin → 사이트 설정.
 */
export default function SiteLogo() {
  const b = useSiteBrand();

  return (
    <Link href="/" className="flex items-center gap-2">
      {b?.logoUrl ? (
        <img src={b.logoUrl} alt={b.siteName || 'TRUE LIGHT'} style={{ height: b.logoHeight || 32 }} className="w-auto object-contain" />
      ) : (
        <>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">{(b?.siteName || 'T').charAt(0)}</span>
          </div>
          {b?.siteName ? (
            <span className="text-lg font-bold tracking-tight text-gray-900">{b.siteName}</span>
          ) : (
            <span className="text-lg font-bold tracking-tight text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
          )}
        </>
      )}
    </Link>
  );
}
