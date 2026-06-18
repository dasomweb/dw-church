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

/** Translate a raw nodemailer/SMTP error into a clear, actionable Korean message. */
function friendlyEmailError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; responseCode?: number; message?: string };
  const code = e.code ?? '';
  const rc = e.responseCode;
  const raw = e.message ?? String(err);
  if (code === 'EAUTH' || rc === 535 || rc === 534 || /invalid login|authentication failed|username and password|535/i.test(raw))
    return 'SMTP 사용자 또는 비밀번호가 올바르지 않습니다. 이메일 계정(메일박스)의 비밀번호가 맞는지 확인하세요. (SiteGround 로그인 비밀번호가 아닙니다.)';
  if (code === 'ENOTFOUND' || code === 'EDNS' || /getaddrinfo|ENOTFOUND|EAI_AGAIN/i.test(raw))
    return 'SMTP 서버 주소를 찾을 수 없습니다. 서버 주소를 확인하세요 (예: mail.도메인.com).';
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ECONNREFUSED' || code === 'ESOCKET' || /ECONNREFUSED|ETIMEDOUT|timed out|timeout|connect ECONN/i.test(raw))
    return 'SMTP 서버에 연결할 수 없습니다. 서버 주소와 포트를 확인하세요 (포트 465=SSL, 587=STARTTLS).';
  if (/self.signed|certificate|wrong version number|ssl|tls|EPROTO/i.test(raw))
    return '보안 연결(SSL/TLS) 설정을 확인하세요. 포트 465는 "보안 연결(SSL)" 켜기, 587은 끄기(STARTTLS)입니다.';
  if (rc === 550 || rc === 553 || /from|sender|relay|not allowed/i.test(raw))
    return '보내는 주소가 SMTP 계정과 일치하지 않을 수 있습니다. 보내는 주소를 SMTP 사용자와 동일하게 맞춰 보세요.';
  return `메일 발송에 실패했습니다: ${raw}`;
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
      // Translate the raw SMTP error into a clear, actionable validation message.
      return reply.status(400).send({ error: { code: 'EMAIL_SEND_FAILED', message: friendlyEmailError(err) } });
    }
  });
}
