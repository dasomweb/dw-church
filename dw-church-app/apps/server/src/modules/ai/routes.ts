import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import * as aiService from './service.js';
import { generatePageFromPrompt, createPageFromPrompt } from './page-generator.js';

export async function aiRoutes(app: FastifyInstance) {
  // Generate text content
  app.post('/ai/generate-text', { preHandler: [requireAuth] }, async (request, reply) => {
    const { prompt, context } = request.body as { prompt: string; context?: string };
    if (!prompt) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'prompt is required' } });

    try {
      const text = await aiService.generateText(prompt, context);
      return reply.send({ data: { text } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI generation failed';
      return reply.status(500).send({ error: { code: 'AI_ERROR', message } });
    }
  });

  // Preview page generation (returns block structure without saving)
  app.post('/ai/generate-page/preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const { prompt } = request.body as { prompt: string };
    if (!prompt) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'prompt is required' } });

    try {
      const page = await generatePageFromPrompt(prompt);
      return reply.send({ data: page });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Page generation failed';
      return reply.status(500).send({ error: { code: 'AI_ERROR', message } });
    }
  });

  // Generate and save page (creates page + sections)
  app.post('/ai/generate-page', { preHandler: [requireAuth] }, async (request, reply) => {
    const { prompt } = request.body as { prompt: string };
    if (!prompt) return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'prompt is required' } });

    try {
      const schema = getSchema(request);
      const result = await createPageFromPrompt(schema, prompt);
      return reply.status(201).send({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Page generation failed';
      return reply.status(500).send({ error: { code: 'AI_ERROR', message } });
    }
  });
}
