import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { formTypeSchema, submitFormSchema, updateFormSubmissionSchema } from './schema.js';
import * as formService from './service.js';

/**
 * Generic form submission + inbox routes.
 *
 * POST /forms/:formType is PUBLIC — the storefront form blocks (contact_form,
 * cell_report, …) post a flat key/value payload here. The :formType in the path
 * keeps one endpoint generic so a new form type works without a server change.
 * It is NOT feature-gated (a tenant only receives submissions for forms it has
 * actually placed on a page).
 *
 * The /admin/forms/submissions/* routes are the review inbox — auth required.
 */
export async function formRoutes(app: FastifyInstance) {
  // ── Public submission ──────────────────────────────────────────────
  app.post('/forms/:formType', async (request, reply) => {
    const { formType } = request.params as { formType: string };
    const ft = formTypeSchema.parse(formType);
    const payload = submitFormSchema.parse(request.body ?? {});
    const created = await formService.createFormSubmission(getSchema(request), ft, payload as Record<string, unknown>);
    return reply.status(201).send({ data: created });
  });

  // ── Admin inbox ────────────────────────────────────────────────────
  app.get('/form-submissions', { preHandler: [requireAuth] }, async (request, reply) => {
    const { formType, status } = request.query as { formType?: string; status?: string };
    const data = await formService.listFormSubmissions(getSchema(request), { formType, status });
    return reply.send({ data });
  });

  app.get('/form-submissions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await formService.getFormSubmission(getSchema(request), id);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '제출 내역을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  // PUT (not PATCH) so the api-client adapter — which has no patch() — can call it.
  app.put('/form-submissions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateFormSubmissionSchema.parse(request.body);
    const row = await formService.updateFormSubmission(getSchema(request), id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '제출 내역을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/form-submissions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await formService.deleteFormSubmission(getSchema(request), id);
    return reply.status(204).send();
  });
}
