import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createStaffSchema, updateStaffSchema, reorderStaffSchema } from './schema.js';
import * as staffService from './service.js';

export async function staffRoutes(app: FastifyInstance) {
  app.get('/staff', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const department = query.department as string | undefined;
    const activeOnly = query.active === 'true' || !request.user;

    const { data } = await staffService.listStaff(getSchema(request), {
      department, activeOnly,
    });
    return reply.send({ data });
  });

  app.get('/staff/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await staffService.getStaffMember(getSchema(request), id);
    if (!member) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Staff member not found' } });
    return reply.send({ data: member });
  });

  app.post('/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createStaffSchema.parse(request.body);
    const member = await staffService.createStaffMember(getSchema(request), input);
    return reply.status(201).send({ data: member });
  });

  app.post('/staff/reorder', { preHandler: [requireAuth] }, async (request, reply) => {
    const { ids } = reorderStaffSchema.parse(request.body);
    await staffService.reorderStaff(getSchema(request), ids);
    return reply.send({ success: true });
  });

  app.put('/staff/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateStaffSchema.parse(request.body);
    const member = await staffService.updateStaffMember(getSchema(request), id, input);
    if (!member) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Staff member not found' } });
    return reply.send({ data: member });
  });

  app.delete('/staff/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await staffService.deleteStaffMember(getSchema(request), id);
    return reply.status(204).send();
  });
}
