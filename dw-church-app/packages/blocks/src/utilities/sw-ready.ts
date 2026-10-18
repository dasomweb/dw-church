/**
 * 서비스워커 준비 대기 — **반드시 시간 제한을 둔다.**
 *
 * `navigator.serviceWorker.ready` 는 등록된 SW 가 하나도 없으면 **영원히
 * resolve 되지 않는다**(reject 도 안 된다). 그냥 await 하면 그 await 뒤의 코드가
 * 통째로 실행되지 않아, 화면에는 아무것도 안 그려지고 에러도 안 뜬다.
 * PWA 가 플랜으로 막힌 교회에서는 SW 가 없으므로 이게 기본 상태다.
 *
 * 그래서 등록 여부를 먼저 확인하고, 기다리더라도 상한을 둔다.
 */
export async function getServiceWorkerRegistration(
  timeoutMs = 3000,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    // 등록 자체가 없으면 ready 를 기다릴 이유가 없다 — 바로 null.
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) return null;
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}
