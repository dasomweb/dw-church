import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { sendEmail, invalidateMailCache } from '../../config/email.js';
import { updateEmailSettingsSchema, testEmailSchema } from './schema.js';
import * as svc from './service.js';

/**
 * Email / SMTP settings (super-admin only).
 * GET never returns the SMTP password — only whether one is set.
 */
function mask(row: Record<string, unknown> | null) {
  if (!row) return null;
  const { smtp_pass, ...rest } = row;
  return { ...rest, smtp_pass_set: !!(smtp_pass && String(smtp_pass).length > 0) };
}

export async function emailSettingsRoutes(app: FastifyInstance) {
  app.get('/admin/email-settings', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const row = await svc.getSettings();
    return reply.send({ data: mask(row) });
  });

  app.patch('/admin/email-settings', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = updateEmailSettingsSchema.parse(request.body);
    const row = await svc.updateSettings(input);
    invalidateMailCache(); // use the new config immediately
    return reply.send({ data: mask(row) });
  });

  app.post('/admin/email-settings/test', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { to } = testEmailSchema.parse(request.body);
    invalidateMailCache();
    try {
      await sendEmail({
        to,
        subject: 'TRUE LIGHT 메일 설정 테스트',
        html: '<p>이 메일이 보이면 SMTP 설정이 정상입니다. ✅</p>',
      });
      return reply.send({ data: { sent: true } });
    } catch (err) {
      // Surface the real SMTP error (auth failed / connection / cert) instead of
      // a generic 500, so the operator can fix the settings.
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: { code: 'EMAIL_SEND_FAILED', message: `메일 발송 실패: ${msg}` } });
    }
  });
}
