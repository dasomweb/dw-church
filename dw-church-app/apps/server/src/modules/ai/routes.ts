import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import * as aiService from './service.js';

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
}
