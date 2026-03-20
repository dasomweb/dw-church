import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createBannerSchema, updateBannerSchema } from './schema.js';
import * as bannerService from './service.js';

export async function bannerRoutes(app: FastifyInstance) {
  app.get('/banners', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const category = query.category as string | undefined;
    const activeOnly = query.active === 'true' || !request.user;
    const status = (query.status as string) || (request.user ? undefined : 'published');

    const { data } = await bannerService.listBanners(getSchema(request), {
      category, activeOnly, status,
    });
    return reply.send({ data });
  });

  app.get('/banners/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const banner = await bannerService.getBanner(getSchema(request), id);
    if (!banner) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Banner not found' } });
    return reply.send({ data: banner });
  });

  app.post('/banners', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createBannerSchema.parse(request.body);
    const banner = await bannerService.createBanner(getSchema(request), input);
    return reply.status(201).send({ data: banner });
  });

  app.put('/banners/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateBannerSchema.parse(request.body);
    const banner = await bannerService.updateBanner(getSchema(request), id, input);
    if (!banner) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Banner not found' } });
    return reply.send({ data: banner });
  });

  app.delete('/banners/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await bannerService.deleteBanner(getSchema(request), id);
    return reply.status(204).send();
  });
}
