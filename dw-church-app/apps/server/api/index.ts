import Fastify from 'fastify';
import cors from '@fastify/cors';
import { tenantMiddleware } from '../src/middleware/tenant.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const app = Fastify({
  logger: true,
  trustProxy: true,
});

let registered = false;

async function registerRoutes() {
  if (registered) return;

  // CORS: allow all *.truelight.app, localhost, and env-configured origins
  await app.register(cors, { origin: true, credentials: true });
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
  const { domainRoutes } = await import('../src/modules/domains/routes.js');

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
  await app.register(domainRoutes, { prefix: '/api/v1' });

  app.get('/api/v1/admin/tenants/resolve-domain', async (request, reply) => {
    const { domain } = request.query as { domain?: string };
    if (!domain) return reply.status(400).send({ error: 'domain query parameter required' });
    const { prisma } = await import('../src/config/database.js');
    const rows = await prisma.$queryRawUnsafe<{ slug: string }[]>(
      `SELECT slug FROM public.tenants WHERE custom_domain = $1 AND is_active = true LIMIT 1`,
      domain,
    );
    if (rows.length === 0) return reply.status(404).send({ error: 'Domain not found' });
    return reply.send({ slug: rows[0]!.slug });
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.ready();
  registered = true;
}

export default async function handler(req: any, res: any) {
  await registerRoutes();

  // Handle CORS preflight at Vercel level (before inject)
  const origin = req.headers?.origin || '';
  if (req.method === 'OPTIONS') {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Tenant-Slug');
    res.setHeader('Vary', 'Origin');
    res.statusCode = 204;
    res.end();
    return;
  }

  // Read body
  let body: string | undefined;
  if (req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = raw;
  }

  const headers = { ...req.headers };
  delete headers['content-length'];
  delete headers['transfer-encoding'];

  const response = await app.inject({
    method: req.method,
    url: req.url,
    headers,
    payload: body,
  });

  // Write response
  res.statusCode = response.statusCode;
  for (const [key, value] of Object.entries(response.headers)) {
    if (value !== undefined) res.setHeader(key, value);
  }

  // Ensure CORS headers are present (inject may not propagate them)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.end(response.body);
}
