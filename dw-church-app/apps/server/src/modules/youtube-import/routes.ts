import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { youtubeSourcesSchema, youtubeFetchSchema, youtubeApplySchema } from './schema.js';
import * as service from './service.js';

export async function youtubeImportRoutes(app: FastifyInstance) {
  // Is the feature wired (YOUTUBE_API_KEY present)?
  app.get('/youtube-import/status', { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.send({ data: { configured: service.youtubeImportConfigured() } });
  });

  // List importable sources for a channel/playlist URL: uploads, playlists, live.
  app.post('/youtube-import/sources', { preHandler: [requireAuth] }, async (request, reply) => {
    const { channel } = youtubeSourcesSchema.parse(request.body);
    const data = await service.listSources(channel);
    return reply.send({ data });
  });

  // Preview a chosen source's videos (oldest first, already-imported flagged).
  app.post('/youtube-import/fetch', { preHandler: [requireAuth] }, async (request, reply) => {
    const { source, target } = youtubeFetchSchema.parse(request.body);
    const data = await service.fetchSource(getSchema(request), source, target);
    return reply.send({ data });
  });

  // Insert the selected videos into sermons/videos (dedup by video id).
  app.post('/youtube-import/apply', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = youtubeApplySchema.parse(request.body);
    const result = await service.applyImport(getSchema(request), {
      target: input.target,
      videos: input.videos,
      status: input.status,
      categoryId: input.categoryId ?? null,
      preacher: input.preacher ?? null,
    });
    return reply.send({ data: result });
  });
}
