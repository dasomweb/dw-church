import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import * as i18n from './service.js';

const translateBody = z.object({
  texts: z.array(z.string()).max(200),
  lang: z.string().min(2).max(10),
});

const overrideBody = z.object({
  source: z.string().min(1),
  lang: z.string().min(2).max(10),
  text: z.string().min(1),
});

export async function i18nRoutes(app: FastifyInstance) {
  // 스토어프론트 SSR 이 호출(공개). 캐시 우선 → 미스만 번역.
  app.post('/i18n/translate', async (request, reply) => {
    const { texts, lang } = translateBody.parse(request.body);
    const translations = await i18n.translateTexts(getSchema(request), texts, lang);
    return reply.send({ data: { translations } });
  });

  // 관리자 보정.
  app.get('/i18n/overrides', { preHandler: [requireAuth] }, async (request, reply) => {
    const lang = ((request.query as Record<string, unknown>).lang as string) || 'en';
    const rows = await i18n.listTranslations(getSchema(request), lang);
    return reply.send({ data: rows });
  });

  app.put('/i18n/overrides', { preHandler: [requireAuth] }, async (request, reply) => {
    const { source, lang, text } = overrideBody.parse(request.body);
    await i18n.setOverride(getSchema(request), source, lang, text);
    return reply.send({ data: { ok: true } });
  });

  app.delete('/i18n/overrides', { preHandler: [requireAuth] }, async (request, reply) => {
    const q = request.query as Record<string, unknown>;
    const source = String(q.source || '');
    const lang = String(q.lang || 'en');
    if (!source) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'source required' } });
    await i18n.deleteTranslation(getSchema(request), source, lang);
    return reply.status(204).send();
  });
}
