'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

/**
 * 교회가 직접 연결한 Google Analytics 4 (설정 → 구글 애널리틱스 → 측정 ID).
 *
 * 플랫폼 공용 GA 계정이 아니라 **테넌트 소유 속성**이다. 측정 ID 는
 * settings.ga_measurement_id 에 저장되고 그 교회의 스토어프론트에만 들어간다
 * (관리자 SPA·마케팅 사이트에는 들어가지 않는다).
 *
 * 자체 방문통계(AnalyticsBeacon)와 별개로 동작한다 — 둘 다 켜져 있어도 무방.
 *
 * send_page_view:false 로 자동 페이지뷰를 끄고 아래 effect 에서 직접 보낸다.
 * App Router 의 클라이언트 라우팅은 전체 로드를 일으키지 않아서, 자동 수집에
 * 맡기면 첫 화면만 잡히거나(설정에 따라) 첫 화면이 두 번 잡힌다.
 */

/** G-XXXXXXXXXX 형태만 허용. 인라인 스크립트에 넣는 값이라 반드시 좁게 거른다. */
const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;

export function isValidGaId(raw: unknown): boolean {
  return typeof raw === 'string' && GA_ID_RE.test(raw.trim().toUpperCase());
}

interface GoogleAnalyticsProps {
  measurementId: string;
  /** 경로에서 "/tenant/<slug>" 접두사를 떼어 도메인별로 경로가 갈리지 않게 한다. */
  slug: string;
}

export default function GoogleAnalytics({ measurementId, slug }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  // 첫 페이지뷰는 gtag.js 로드 완료 후에 보내야 해서, 로드 전 변경분을 흘리지 않도록
  // 마지막으로 보낸 경로를 기억한다.
  const lastSent = useRef<string | null>(null);

  const id = measurementId.trim().toUpperCase();
  const enabled = isValidGaId(id);

  useEffect(() => {
    if (!enabled) return;
    // 슈퍼어드민 라이브 미리보기 iframe 안에서는 집계하지 않는다(자체 비컨과 동일 규칙).
    if (typeof window === 'undefined' || window.self !== window.top) return;

    let path = pathname || '/';
    const prefix = `/tenant/${slug}`;
    if (path === prefix) path = '/';
    else if (path.startsWith(prefix + '/')) path = path.slice(prefix.length);

    if (lastSent.current === path) return;

    const send = () => {
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag !== 'function') return false;
      gtag('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      });
      lastSent.current = path;
      return true;
    };

    if (send()) return;
    // gtag.js 가 아직 안 붙었으면 짧게 재시도(최대 ~5초). 실패해도 페이지엔 영향 없음.
    let tries = 0;
    const timer = setInterval(() => {
      if (send() || ++tries > 25) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [enabled, pathname, slug]);

  if (!enabled) return null;

  return (
    <>
      <Script
        id="ga4-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${id}',{send_page_view:false});`}
      </Script>
    </>
  );
}
