import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createHistorySchema, updateHistorySchema } from './schema.js';
import * as historyService from './service.js';

export async function historyRoutes(app: FastifyInstance) {
  app.get('/history', async (request, reply) => {
    const { data } = await historyService.listHistory(getSchema(request));
    return reply.send({ data });
  });

  app.get('/history/years', async (request, reply) => {
    const years = await historyService.getDistinctYears(getSchema(request));
    return reply.send({ data: years });
  });

  app.get('/history/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = await historyService.getHistory(getSchema(request), id);
    if (!history) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'History entry not found' } });
    return reply.send({ data: history });
  });

  app.post('/history', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createHistorySchema.parse(request.body);
    const history = await historyService.createHistory(getSchema(request), input);
    return reply.status(201).send({ data: history });
  });

  app.put('/history/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateHistorySchema.parse(request.body);
    const history = await historyService.updateHistory(getSchema(request), id, input);
    if (!history) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'History entry not found' } });
    return reply.send({ data: history });
  });

  app.delete('/history/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await historyService.deleteHistory(getSchema(request), id);
    return reply.status(204).send();
  });
}
