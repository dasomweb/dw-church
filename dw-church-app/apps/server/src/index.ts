import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { prisma, disconnectAllTenants } from './config/database.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimitConfig } from './middleware/rate-limit.js';
import { initMonitoring } from './config/monitoring.js';
import { initSentry } from './config/sentry.js';

/* ------------------------------------------------------------------
 * Fastify type augmentation
 * ----------------------------------------------------------------*/
declare module 'fastify' {
  interface FastifyRequest {
    tenant?: { id: string; slug: string; name: string; plan: string };
    tenantSchema?: string;
    user?: {
      id: string;
      email: string;
      tenantId: string;
      tenantSlug: string;
      role: string;
    };
  }
}

/* ------------------------------------------------------------------
 * Bootstrap
 * ----------------------------------------------------------------*/
const serverStartTime = Date.now();

async function main(): Promise<void> {
  initSentry();
  initMonitoring();

  const app = Fastify({
    logger: env.NODE_ENV === 'production'
      ? { level: 'info' }
      : { level: 'debug' },
  });

  // --- Plugins ---
  const { corsOptions } = await import('./cors.js');
  await app.register(cors, corsOptions);
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max
  await app.register(rateLimit, rateLimitConfig);

  // --- Error handler ---
  app.setErrorHandler(errorHandler);

  // --- Tenant resolution for API routes ---
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/v1/')) {
      await tenantMiddleware(request, reply);
    }
  });

  // --- Module routes ---
  const { default: authRoutes } = await import('./modules/auth/routes.js');
  const { default: tenantRoutes } = await import('./modules/tenants/routes.js');
  const { default: pageRoutes } = await import('./modules/pages/routes.js');
  const { default: menuRoutes } = await import('./modules/menus/routes.js');
  const { default: themeRoutes } = await import('./modules/themes/routes.js');

  const { sermonRoutes } = await import('./modules/sermons/routes.js');
  const { bulletinRoutes } = await import('./modules/bulletins/routes.js');
  const { columnRoutes } = await import('./modules/columns/routes.js');
  const { albumRoutes } = await import('./modules/albums/routes.js');
  const { bannerRoutes } = await import('./modules/banners/routes.js');
  const { eventRoutes } = await import('./modules/events/routes.js');
  const { staffRoutes } = await import('./modules/staff/routes.js');
  const { historyRoutes } = await import('./modules/history/routes.js');
  const { categoryRoutes } = await import('./modules/categories/routes.js');
  const { settingsRoutes } = await import('./modules/settings/routes.js');
  const { fileRoutes } = await import('./modules/files/routes.js');
  const { boardRoutes } = await import('./modules/boards/routes.js');
  const { domainRoutes } = await import('./modules/domains/routes.js');

  const { aiRoutes } = await import('./modules/ai/routes.js');
  const { default: billingRoutes } = await import('./modules/billing/routes.js');
  const { default: migrationRoutes } = await import('./modules/migration/routes.js');

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(tenantRoutes, { prefix: '/api/v1/admin' });
  await app.register(billingRoutes, { prefix: '/api/v1/billing' });
  await app.register(pageRoutes, { prefix: '/api/v1/pages' });
  await app.register(menuRoutes, { prefix: '/api/v1/menus' });
  await app.register(themeRoutes, { prefix: '/api/v1/theme' });
  await app.register(sermonRoutes, { prefix: '/api/v1' });
  await app.register(bulletinRoutes, { prefix: '/api/v1' });
  await app.register(columnRoutes, { prefix: '/api/v1' });
  await app.register(albumRoutes, { prefix: '/api/v1' });
  await app.register(bannerRoutes, { prefix: '/api/v1' });
  await app.register(eventRoutes, { prefix: '/api/v1' });
  await app.register(staffRoutes, { prefix: '/api/v1' });
  await app.register(historyRoutes, { prefix: '/api/v1' });
  await app.register(categoryRoutes, { prefix: '/api/v1' });
  await app.register(settingsRoutes, { prefix: '/api/v1' });
  await app.register(fileRoutes, { prefix: '/api/v1' });
  await app.register(aiRoutes, { prefix: '/api/v1' });
  await app.register(boardRoutes, { prefix: '/api/v1' });
  await app.register(domainRoutes, { prefix: '/api/v1' });
  await app.register(migrationRoutes, { prefix: '/api/v1/admin' });

  // --- Internal: resolve custom domain to tenant slug (used by Next.js middleware) ---
  app.get('/api/v1/admin/tenants/resolve-domain', async (request, reply) => {
    const { domain } = request.query as { domain?: string };
    if (!domain) return reply.status(400).send({ error: 'domain query parameter required' });
    const rows = await prisma.$queryRawUnsafe<{ slug: string }[]>(
      `SELECT slug FROM public.tenants WHERE custom_domain = $1 AND is_active = true LIMIT 1`,
      domain,
    );
    if (rows.length === 0) return reply.status(404).send({ error: 'Domain not found' });
    return reply.send({ slug: rows[0]!.slug });
  });

  // --- Health check ---
  app.get('/health', async () => ({
    status: 'ok',
    version: '5.2.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
  }));

  // --- One-time migration: fix hero banner props ---
  try {
    const { fixHeroBanners } = await import('./utils/fix-hero-banners.js');
    const fixed = await fixHeroBanners();
    if (fixed > 0) app.log.info(`Fixed ${fixed} hero banner section(s)`);
  } catch (err) {
    app.log.warn(`Hero banner migration skipped: ${err}`);
  }

  // --- Ensure super_admin users are always active ---
  try {
    await prisma.user.updateMany({
      where: { role: 'super_admin' },
      data: { isActive: true },
    });
  } catch { /* ignore */ }

  // --- One-time migration: create boards tables ---
  try {
    const { migrateBoards } = await import('./utils/migrate-boards.js');
    const migrated = await migrateBoards();
    if (migrated > 0) app.log.info(`Board tables ensured for ${migrated} schema(s)`);
  } catch (err) {
    app.log.warn(`Board migration skipped: ${err}`);
  }

  // --- Start ---
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);

  // --- Graceful shutdown ---
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal} — shutting down`);
    await app.close();
    await prisma.$disconnect();
    await disconnectAllTenants();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
