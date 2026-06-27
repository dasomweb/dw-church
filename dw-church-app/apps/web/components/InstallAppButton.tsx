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

  // Icon-only on mobile (clean + no cramped text); icon + label on sm+ (desktop).
  const pill =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--dw-primary)] ' +
    'p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-[var(--dw-primary)] bg-white/80 ' +
    'shadow-sm transition-colors hover:bg-[var(--dw-primary)] hover:text-white ' +
    className;

  // Modern, simple install glyph (download-to-line).
  const Icon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v11m0 0l-4-4m4 4l4-4M5 20h14" />
    </svg>
  );
  const Label = () => <span className="hidden sm:inline">앱으로 설치</span>;

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
        title="앱으로 설치"
      >
        <Icon />
        <Label />
      </button>
    );
  }

  // iOS Safari — no programmatic install API exists, so we can't auto-add.
  // Show a clear visual guide (Share → 홈 화면에 추가) instead.
  if (isIos) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIosHint(true)}
          className={pill}
          aria-label="앱으로 설치 안내"
          title="앱으로 설치"
        >
          <Icon />
          <Label />
        </button>
        {showIosHint && (
          <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="홈 화면에 추가 안내">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowIosHint(false)} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">홈 화면에 앱으로 추가</h2>
                <button onClick={() => setShowIosHint(false)} className="text-gray-400 text-2xl leading-none" aria-label="닫기">×</button>
              </div>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dw-primary)] text-xs font-bold text-white">1</span>
                  <span className="flex items-center gap-1.5">
                    사파리 아래쪽
                    <svg className="inline h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L8 8m4-4l4 4" /><path d="M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6" /></svg>
                    <strong>공유 버튼</strong>을 누르세요
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dw-primary)] text-xs font-bold text-white">2</span>
                  <span className="flex items-center gap-1.5">
                    메뉴에서
                    <svg className="inline h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 9v6M9 12h6" /></svg>
                    <strong>&apos;홈 화면에 추가&apos;</strong> 선택
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dw-primary)] text-xs font-bold text-white">3</span>
                  <span>오른쪽 위 <strong>&apos;추가&apos;</strong>를 누르면 완료!</span>
                </li>
              </ol>
              <p className="mt-4 text-center text-[11px] text-gray-400">아이폰은 보안 정책상 자동 설치가 안 돼, 위 한 번의 과정이 필요해요.</p>
              {/* arrow hinting toward the Safari bottom toolbar */}
              <div className="mt-2 flex justify-center text-blue-500 animate-bounce" aria-hidden="true">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m0 0l-6-6m6 6l6-6" /></svg>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Not installable in this browser/session — render nothing.
  return null;
}
