'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

/**
 * Floating "카카오톡 문의" button. Reads the configured Kakao link from the
 * platform marketing config; renders nothing until/unless a link is set
 * (super-admin manages it in 공지·마케팅 → 카카오톡 문의 링크).
 */
export default function KakaoInquiryButton() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/marketing-config`);
        if (!res.ok) return;
        const json = await res.json();
        setUrl(json?.data?.kakaoUrl ?? null);
      } catch { /* ignore — button just stays hidden */ }
    })();
  }, []);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="카카오톡으로 문의"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#FEE500] px-5 py-3 text-sm font-bold text-[#191600] shadow-lg transition hover:brightness-95"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.79 1.86 5.23 4.65 6.6-.2.73-.73 2.64-.84 3.05-.13.51.19.5.4.37.16-.11 2.6-1.77 3.66-2.49.69.1 1.4.17 2.13.17 5.52 0 10-3.48 10-7.8C22 6.48 17.52 3 12 3z" />
      </svg>
      카카오톡 문의
    </a>
  );
}
