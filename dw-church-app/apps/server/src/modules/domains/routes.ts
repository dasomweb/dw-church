import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOwner } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { addDomainSchema } from './schema.js';
import * as domainService from './service.js';

export async function domainRoutes(app: FastifyInstance) {
  app.get('/domains', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await domainService.getDomains(getSchema(request));
    return reply.send({ data });
  });

  app.post('/domains', { preHandler: [requireOwner] }, async (request, reply) => {
    const { domain } = addDomainSchema.parse(request.body);
    const tenantId = request.tenant!.id;
    const data = await domainService.addDomain(getSchema(request), tenantId, domain);
    return reply.status(201).send({ data });
  });

  app.delete('/domains/:id', { preHandler: [requireOwner] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenant!.id;
    await domainService.removeDomain(getSchema(request), tenantId, id);
    return reply.status(204).send();
  });

  app.post('/domains/:id/verify', { preHandler: [requireOwner] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await domainService.verifyDomain(getSchema(request), id);
    return reply.send({ data });
  });
}
