'use client';

import { useEffect } from 'react';
import { useSiteBrand } from './useSiteBrand';

/**
 * Applies the configured favicon to the marketing site. Rendered only on
 * marketing pages (NOT the root layout) so tenant sites keep their own icons.
 */
export default function FaviconSetter() {
  const b = useSiteBrand();
  useEffect(() => {
    if (!b?.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }, [b]);
  return null;
}
