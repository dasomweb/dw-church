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
  ogImageUrl: z.string().max(2000).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  // truelight.app marketing header/footer vertical padding (px).
  headerPaddingY: z.number().int().min(0).max(80).optional().nullable(),
  footerPaddingY: z.number().int().min(0).max(160).optional().nullable(),
  // Home hero slides (operator-editable) + base font size.
  heroSlides: z.array(z.object({
    headlineKo: z.string().max(200).default(''),
    headlineEn: z.string().max(200).default(''),
    sublineKo: z.string().max(400).default(''),
    sublineEn: z.string().max(400).default(''),
    imageUrl: z.string().max(2000).default(''),
    buttons: z.array(z.object({
      labelKo: z.string().max(60).default(''),
      labelEn: z.string().max(60).default(''),
      url: z.string().max(2000).default(''),
      variant: z.enum(['primary', 'outline', 'demo']).default('primary'),
    })).max(3).optional(),
  })).max(10).optional().nullable(),
  baseFontPx: z.number().int().min(12).max(22).optional().nullable(),
  // Mobile home-hero display: '4:5' (portrait card) or 'full' (9:16 full-screen).
  heroMobileRatio: z.enum(['4:5', 'full']).optional().nullable(),
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
