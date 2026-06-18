'use client';

import { useEffect } from 'react';

// Registers the storefront service worker so the tenant site is installable as
// a PWA. Silent on any failure — SW is a progressive enhancement and must never
// break rendering. Rendered once by the tenant layout for Pro-plan tenants only.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ignore — installability is best-effort */
    });
  }, []);

  return null;
}
