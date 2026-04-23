import type { FastifyInstance } from 'fastify';
import { requireAuth, requireOwner } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { addDomainSchema } from './schema.js';
import * as domainService from './service.js';

export async function domainRoutes(app: FastifyInstance) {
  // GET /domains — list
  app.get('/domains', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await domainService.getDomains(getSchema(request));
    return reply.send({ data });
  });

  // POST /domains — add domain, receive DNS instructions in one shot
  app.post('/domains', { preHandler: [requireOwner] }, async (request, reply) => {
    const { domain } = addDomainSchema.parse(request.body);
    const tenantId = request.tenant!.id;
    const result = await domainService.addDomain(getSchema(request), tenantId, domain);
    return reply.status(201).send({
      data: result.domain,
      instructions: result.instructions,
    });
  });

  // GET /domains/:id/instructions — re-fetch DNS records for the wizard UI
  app.get<{ Params: { id: string } }>(
    '/domains/:id/instructions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await domainService.getInstructions(getSchema(request), request.params.id);
      return reply.send({
        data: result.domain,
        instructions: result.instructions,
      });
    },
  );

  // POST /domains/:id/verify — probe TXT, update status, wire into public.tenants
  app.post<{ Params: { id: string } }>(
    '/domains/:id/verify',
    { preHandler: [requireOwner] },
    async (request, reply) => {
      const tenantId = request.tenant!.id;
      const result = await domainService.verifyDomain(
        getSchema(request),
        tenantId,
        request.params.id,
      );
      return reply.send({
        data: result.domain,
        checks: { txtFound: result.txtFound, cnameOk: result.cnameOk },
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });
    },
  );

  // DELETE /domains/:id — remove domain + clear tenants.custom_domain if matching
  app.delete<{ Params: { id: string } }>(
    '/domains/:id',
    { preHandler: [requireOwner] },
    async (request, reply) => {
      const tenantId = request.tenant!.id;
      await domainService.removeDomain(getSchema(request), tenantId, request.params.id);
      return reply.status(204).send();
    },
  );
}
