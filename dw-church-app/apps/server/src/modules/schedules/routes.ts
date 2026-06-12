import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createScheduleSchema, updateScheduleSchema } from './schema.js';
import * as scheduleService from './service.js';

export async function scheduleRoutes(app: FastifyInstance) {
  // ─── Schedules (예배 및 모임) ────────────────────────────────
  app.get('/schedules', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    // Public/no-auth requests only see published groups (mirrors columns/videos).
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const data = await scheduleService.listSchedules(getSchema(request), { status });
    return reply.send({ data });
  });

  app.get('/schedules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schedule = await scheduleService.getSchedule(getSchema(request), id);
    if (!schedule) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
    return reply.send({ data: schedule });
  });

  app.post('/schedules', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createScheduleSchema.parse(request.body);
    const schedule = await scheduleService.createSchedule(getSchema(request), input);
    return reply.status(201).send({ data: schedule });
  });

  app.put('/schedules/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateScheduleSchema.parse(request.body);
    const schedule = await scheduleService.updateSchedule(getSchema(request), id, input);
    if (!schedule) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
    return reply.send({ data: schedule });
  });

  app.delete('/schedules/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await scheduleService.deleteSchedule(getSchema(request), id);
    return reply.status(204).send();
  });
}
