import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { sendEmail } from '../../config/email.js';
import { wrapEmail } from '../../config/email-layout.js';
import { updateTemplateSchema, testTemplateSchema, previewTemplateSchema, broadcastSchema } from './schema.js';
import * as svc from './service.js';

// Sample variables so a test send shows a realistic preview.
const SAMPLE_VARS: Record<string, Record<string, string>> = {
  welcome: { churchName: '은혜교회', buttonUrl: 'https://admin.truelight.app', buttonText: '관리자 페이지 시작하기' },
  application_received: { churchName: '은혜교회', plan: '기본' },
  payment: { churchName: '은혜교회', buttonUrl: 'https://truelight.app', buttonText: '결제하고 시작하기' },
  support_reply: { subject: '로그인 문의', reply: '안녕하세요,\n도와드리겠습니다.' },
};

export async function emailTemplateRoutes(app: FastifyInstance) {
  app.get('/admin/email-templates', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const data = await svc.listTemplates();
    return reply.send({ data });
  });

  app.patch('/admin/email-templates/:key', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const input = updateTemplateSchema.parse(request.body);
    const row = await svc.updateTemplate(key, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '템플릿을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  // Test-send a template with sample variables.
  app.post('/admin/email-templates/:key/test', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { to } = testTemplateSchema.parse(request.body);
    const rendered = await svc.renderTemplate(key, SAMPLE_VARS[key] ?? {});
    try {
      await sendEmail({ to, subject: rendered.subject, html: rendered.html });
      return reply.send({ data: { sent: true } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: { code: 'EMAIL_SEND_FAILED', message: `발송 실패: ${msg}` } });
    }
  });

  // Live preview — render the (possibly unsaved) subject/body with sample
  // variables and the design shell, so the editor shows the final email.
  app.post('/admin/email-templates/:key/preview', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const input = previewTemplateSchema.parse(request.body ?? {});
    const saved = await svc.getTemplate(key).catch(() => null);
    const subject = input.subject ?? (saved?.subject as string | undefined) ?? '';
    const body = input.body ?? (saved?.body as string | undefined) ?? '';
    const rendered = svc.renderRaw(subject, body, SAMPLE_VARS[key] ?? {});
    return reply.send({ data: rendered });
  });

  // Broadcast / preview an announcement to all tenant-admin emails.
  app.post('/admin/email-broadcast', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { subject, body, testTo } = broadcastSchema.parse(request.body);
    const html = wrapEmail(body, { footerNote: '본 메일은 TRUE LIGHT 공지입니다.' });

    if (testTo) {
      try {
        await sendEmail({ to: testTo, subject, html, from: 'info' });
        return reply.send({ data: { preview: true, sent: 1 } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ error: { code: 'EMAIL_SEND_FAILED', message: `발송 실패: ${msg}` } });
      }
    }

    const recipients = await svc.broadcastRecipients();
    let sent = 0;
    let failed = 0;
    // Sequential to be gentle on SMTP rate limits (recipient counts are small
    // at this stage). For large lists this should move to a background job.
    for (const to of recipients) {
      try { await sendEmail({ to, subject, html, from: 'info' }); sent++; } catch { failed++; }
    }
    return reply.send({ data: { recipients: recipients.length, sent, failed } });
  });
}
