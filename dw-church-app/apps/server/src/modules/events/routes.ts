import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createEventSchema, updateEventSchema } from './schema.js';
import * as eventService from './service.js';

export async function eventRoutes(app: FastifyInstance) {
  app.get('/events', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;

    const { data, total } = await eventService.listEvents(getSchema(request), {
      page, perPage, search, status,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await eventService.getEvent(getSchema(request), id);
    if (!event) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
    return reply.send({ data: event });
  });

  app.post('/events', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createEventSchema.parse(request.body);
    const event = await eventService.createEvent(getSchema(request), input);
    return reply.status(201).send({ data: event });
  });

  app.put('/events/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateEventSchema.parse(request.body);
    const event = await eventService.updateEvent(getSchema(request), id, input);
    if (!event) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
    return reply.send({ data: event });
  });

  app.delete('/events/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await eventService.deleteEvent(getSchema(request), id);
    return reply.status(204).send();
  });
}
