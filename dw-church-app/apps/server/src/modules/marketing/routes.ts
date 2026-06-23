import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin } from '../../middleware/auth.js';
import * as svc from './service.js';

const configSchema = z.object({
  logoUrl: z.string().max(1000).optional().nullable(),
  logoHeight: z.number().int().min(12).max(160).optional().nullable(),
  faviconUrl: z.string().max(1000).optional().nullable(),
  siteName: z.string().max(200).optional().nullable(),
  tagline: z.string().max(300).optional().nullable(),
  contactEmail: z.string().max(200).optional().nullable(),
  kakaoUrl: z.string().max(500).optional().nullable(),
});

/**
 * Platform marketing/site config (logo, favicon, site name, kakao link, …).
 *   GET  /marketing-config         — PUBLIC (marketing site reads branding)
 *   GET/PUT /admin/marketing-config — super-admin manages it
 */
export async function marketingRoutes(app: FastifyInstance) {
  app.get('/marketing-config', async (_request, reply) => {
    return reply.send({ data: svc.toClient(await svc.getMarketingConfig()) });
  });

  app.get('/admin/marketing-config', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    return reply.send({ data: svc.toClient(await svc.getMarketingConfig()) });
  });

  app.put('/admin/marketing-config', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = configSchema.parse(request.body);
    return reply.send({ data: svc.toClient(await svc.setMarketingConfig(input)) });
  });
}
