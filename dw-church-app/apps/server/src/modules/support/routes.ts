import type { FastifyInstance } from 'fastify';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.js';
import { sendEmail } from '../../config/email.js';
import { createSupportTicketSchema, updateSupportTicketSchema } from './schema.js';
import * as svc from './service.js';

/**
 * 고객지원 티켓 routes.
 *   POST /support-tickets               — authenticated tenant admins submit.
 *   GET/PATCH/DELETE /admin/support-tickets/* — super-admin manages.
 */
export async function supportRoutes(app: FastifyInstance) {
  app.post('/support-tickets', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createSupportTicketSchema.parse(request.body);
    const ticket = await svc.createTicket(input, {
      tenantSlug: request.user?.tenantSlug ?? '',
      email: request.user?.email ?? '',
      name: '',
    });
    return reply.status(201).send({ data: ticket });
  });

  app.get('/admin/support-tickets', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const data = await svc.listTickets(status);
    return reply.send({ data });
  });

  app.get('/admin/support-tickets/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await svc.getTicket(id);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '티켓을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.patch('/admin/support-tickets/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSupportTicketSchema.parse(request.body);
    const row = await svc.updateTicket(id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '티켓을 찾을 수 없습니다' } });

    // Email the reply to the ticket's contact when asked.
    if (input.sendReply && input.adminReply && row.email) {
      sendEmail({
        to: row.email as string,
        subject: `[TRUE LIGHT 고객지원] ${row.subject as string}`,
        html: `<p>${String(input.adminReply).replace(/\n/g, '<br>')}</p>`,
        from: 'support',
      }).catch((err) => console.error('[email] support reply failed:', err));
    }
    return reply.send({ data: row });
  });

  app.delete('/admin/support-tickets/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.deleteTicket(id);
    return reply.status(204).send();
  });
}
