import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from '../src/config/env.js';
import { tenantMiddleware } from '../src/middleware/tenant.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const app = Fastify({ logger: true });

let registered = false;

async function registerRoutes() {
  if (registered) return;

  await app.register(cors, { origin: env.CORS_ORIGINS, credentials: true });
  app.setErrorHandler(errorHandler);

  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/v1/')) {
      await tenantMiddleware(request, reply);
    }
  });

  const { default: authRoutes } = await import('../src/modules/auth/routes.js');
  const { default: tenantRoutes } = await import('../src/modules/tenants/routes.js');
  const { default: billingRoutes } = await import('../src/modules/billing/routes.js');
  const { sermonRoutes } = await import('../src/modules/sermons/routes.js');
  const { bulletinRoutes } = await import('../src/modules/bulletins/routes.js');
  const { columnRoutes } = await import('../src/modules/columns/routes.js');
  const { albumRoutes } = await import('../src/modules/albums/routes.js');
  const { bannerRoutes } = await import('../src/modules/banners/routes.js');
  const { eventRoutes } = await import('../src/modules/events/routes.js');
  const { staffRoutes } = await import('../src/modules/staff/routes.js');
  const { historyRoutes } = await import('../src/modules/history/routes.js');
  const { categoryRoutes } = await import('../src/modules/categories/routes.js');
  const { settingsRoutes } = await import('../src/modules/settings/routes.js');
  const { fileRoutes } = await import('../src/modules/files/routes.js');
  const { default: pageRoutes } = await import('../src/modules/pages/routes.js');
  const { default: menuRoutes } = await import('../src/modules/menus/routes.js');
  const { default: themeRoutes } = await import('../src/modules/themes/routes.js');

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(tenantRoutes, { prefix: '/api/v1/admin' });
  await app.register(billingRoutes, { prefix: '/api/v1/billing' });
  await app.register(pageRoutes, { prefix: '/api/v1' });
  await app.register(menuRoutes, { prefix: '/api/v1' });
  await app.register(themeRoutes, { prefix: '/api/v1' });
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

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.ready();
  registered = true;
}

export default async function handler(req: any, res: any) {
  await registerRoutes();
  app.server.emit('request', req, res);
}
