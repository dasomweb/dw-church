/**
 * Optional monitoring integration.
 * Install @sentry/node manually if needed: pnpm add @sentry/node
 */
export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    // Dynamic import to avoid compile errors when @sentry/node is not installed
    (async () => {
      try {
        const mod = await (Function('return import("@sentry/node")')() as Promise<{ init: (opts: { dsn: string; environment: string }) => void }>);
        mod.init({ dsn, environment: process.env.NODE_ENV ?? 'development' });
        console.log('Sentry monitoring initialized');
      } catch {
        console.warn('SENTRY_DSN is set but @sentry/node is not installed. Skipping.');
      }
    })();
  }
}
