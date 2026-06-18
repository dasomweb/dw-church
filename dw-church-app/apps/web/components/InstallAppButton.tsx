'use client';

import { useEffect, useState } from 'react';

// Minimal shape of the (non-standard) beforeinstallprompt event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppButtonProps {
  className?: string;
}

// "앱으로 설치" pill. On Chromium it drives the native beforeinstallprompt flow;
// on iOS Safari (which has no such event) it shows a short hint to use the
// Share → 홈 화면에 추가 path. Renders nothing when already installed/standalone.
export default function InstallAppButton({ className = '' }: InstallAppButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Detect already-installed (standalone) — hide entirely in that case.
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari exposes navigator.standalone (non-standard).
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(Boolean(isStandalone));

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => setDeferred(null);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone) return null;

  const pill =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--dw-primary)] ' +
    'px-3 py-1.5 text-xs font-semibold text-[var(--dw-primary)] bg-white/80 ' +
    'shadow-sm transition-colors hover:bg-[var(--dw-primary)] hover:text-white ' +
    className;

  // Native install flow (Chromium / Android).
  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            await deferred.prompt();
            await deferred.userChoice;
          } finally {
            setDeferred(null);
          }
        }}
        className={pill}
        aria-label="앱으로 설치"
      >
        <span aria-hidden="true">⬇️</span>
        앱으로 설치
      </button>
    );
  }

  // iOS Safari — no programmatic prompt, show a tap-to-reveal hint instead.
  if (isIos) {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setShowIosHint((v) => !v)}
          className={pill}
          aria-label="앱으로 설치 안내"
        >
          <span aria-hidden="true">⬇️</span>
          앱으로 설치
        </button>
        {showIosHint && (
          <span
            role="status"
            className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg"
          >
            Safari 공유 버튼 → &apos;홈 화면에 추가&apos;를 누르세요
          </span>
        )}
      </span>
    );
  }

  // Not installable in this browser/session — render nothing.
  return null;
}
