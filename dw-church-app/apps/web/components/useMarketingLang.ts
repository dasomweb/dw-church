'use client';

import { useEffect, useState } from 'react';

export type Lang = 'ko' | 'en';

// Shared language store for the truelight.app marketing site. Korean is primary
// (SSR default 'ko'). The global header's KO/EN toggle and every page's content
// read the SAME lang via this hook, so switching in the header re-renders all
// pages — no per-page React Context wiring needed.
let current: Lang = 'ko';
const subscribers = new Set<(l: Lang) => void>();

function readStored(): Lang {
  try {
    const s = localStorage.getItem('tl_lang');
    if (s === 'ko' || s === 'en') return s;
  } catch { /* ignore */ }
  return 'ko';
}

export function useMarketingLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const [lang, setLangState] = useState<Lang>(current);

  useEffect(() => {
    // Sync from localStorage on mount (SSR rendered 'ko').
    current = readStored();
    setLangState(current);

    const sub = (l: Lang) => setLangState(l);
    subscribers.add(sub);

    // Cross-tab sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tl_lang') {
        current = readStored();
        subscribers.forEach((s) => s(current));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      subscribers.delete(sub);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLang = (l: Lang) => {
    current = l;
    try { localStorage.setItem('tl_lang', l); } catch { /* ignore */ }
    try { document.documentElement.lang = l; } catch { /* ignore */ }
    subscribers.forEach((s) => s(l)); // notify all components on this page
  };

  return { lang, setLang };
}
