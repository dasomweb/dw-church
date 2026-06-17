import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { sendEmail } from '../../config/email.js';
import { paymentLinkEmail } from '../../config/email-templates.js';
import { createApplicationSchema, updateApplicationSchema } from './schema.js';
import * as applicationService from './service.js';
import { classifyDenomination } from '../reference-denominations/service.js';

// Attach the 이단 필터 classification (✓ 정규 / ? 미확인 / 🚩 이단의심) to an
// application row, matched on its denomination then church name.
async function withDenomStatus(row: Record<string, unknown>) {
  const match =
    (await classifyDenomination(row.denomination as string)) ??
    (await classifyDenomination(row.church_name as string));
  return { ...row, denomination_status: match?.status ?? null, denomination_match: match?.matchedName ?? null };
}

/**
 * 웹사이트 개발 신청서 routes.
 *   POST /applications            — PUBLIC submission from the marketing site.
 *   GET/PATCH/DELETE /admin/applications/* — super-admin inbox management.
 *
 * Registered under /api/v1, so the admin routes carry the /admin prefix here
 * and gate per-route with requireSuperAdmin (the public POST has no gate).
 */
export async function applicationRoutes(app: FastifyInstance) {
  // ── Public: submit a build request ──
  app.post('/applications', async (request, reply) => {
    const input = createApplicationSchema.parse(request.body);
    const created = await applicationService.createApplication(input);
    return reply.status(201).send({ data: created });
  });

  // ── Super-admin: manage the inbox ──
  app.get('/admin/applications', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const rows = await applicationService.listApplications(status);
    const data = await Promise.all(rows.map(withDenomStatus));
    return reply.send({ data });
  });

  app.get('/admin/applications/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await applicationService.getApplication(id);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '신청서를 찾을 수 없습니다' } });
    return reply.send({ data: await withDenomStatus(row) });
  });

  app.patch('/admin/applications/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateApplicationSchema.parse(request.body);

    // When the super-admin sends the payment link, force status=approved and
    // email the applicant. We require a link to actually send.
    const wantsSend = input.sendPaymentLink === true;
    if (wantsSend) {
      const existing = await applicationService.getApplication(id);
      if (!existing) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '신청서를 찾을 수 없습니다' } });
      }
      const link = input.paymentLink ?? (existing.payment_link as string | null);
      if (!link) {
        throw new AppError('PAYMENT_LINK_REQUIRED', 400, '발송할 결제 링크가 없습니다. 결제 링크를 먼저 입력하세요.');
      }
      if (input.status === undefined) input.status = 'approved';
    }

    const row = await applicationService.updateApplication(id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '신청서를 찾을 수 없습니다' } });

    if (wantsSend) {
      const link = (row.payment_link as string) ?? input.paymentLink;
      const tpl = paymentLinkEmail((row.church_name as string) ?? '교회', link!);
      // Fire-and-forget — surface failures in logs, don't fail the request.
      sendEmail({ to: row.email as string, ...tpl }).catch((err) =>
        console.error('[email] Failed to send payment-link email:', err),
      );
    }

    return reply.send({ data: row });
  });

  app.delete('/admin/applications/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await applicationService.deleteApplication(id);
    return reply.status(204).send();
  });
}
