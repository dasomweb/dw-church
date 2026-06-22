import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { sendEmail } from '../../config/email.js';
import { createDemoRequestSchema, updateDemoRequestSchema, demoConfigSchema } from './schema.js';
import * as demoService from './service.js';
import { issueDemoLogin } from '../demo-tenant/demo-login.js';

function accessEmailHtml(opts: { name: string; loginUrl: string; loginEmail: string; loginPassword: string; expiresAt: Date; messageBody: string }) {
  const esc = (s: string) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
  let expires = '';
  try { expires = new Date(opts.expiresAt).toLocaleString('ko-KR', { timeZone: 'America/New_York' }) + ' (미 동부시간)'; } catch { expires = ''; }
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#111">
    <h2 style="font-size:20px;margin:0 0 16px">TRUE LIGHT 데모 체험 안내</h2>
    <p style="font-size:15px;line-height:1.7;white-space:pre-line">${esc(opts.messageBody)}</p>
    <div style="background:#f6f7f9;border-radius:12px;padding:18px 20px;margin:20px 0;font-size:14px;line-height:2">
      <div><strong>접속 주소</strong> : <a href="${esc(opts.loginUrl)}" style="color:#2563eb">${esc(opts.loginUrl)}</a></div>
      <div><strong>아이디</strong> : ${esc(opts.loginEmail)}</div>
      <div><strong>비밀번호</strong> : ${esc(opts.loginPassword)}</div>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;margin:20px 0;font-size:13px;line-height:1.7;color:#9a3412">
      ⏱ <strong>이 데모 계정은 발급 후 24시간이 지나면 자동으로 삭제됩니다.</strong>${expires ? `<br/>만료 시각: ${esc(expires)}` : ''}
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.6">
      데모 사이트는 매일 밤(미 동부시간 새벽 3시) 초기 상태로 자동 복원됩니다 —
      자유롭게 테스트하셔도 됩니다.
    </p>
  </div>`;
}

/**
 * 데모 체험 신청 routes.
 *   POST /demo-requests                         — PUBLIC submission (marketing site)
 *   GET/PATCH/DELETE /admin/demo-requests/*      — super-admin CRM inbox
 *   POST /admin/demo-requests/:id/send-access    — email the shared demo login
 *   GET/PUT /admin/demo-config                   — manage the shared demo access info
 */
export async function demoRequestRoutes(app: FastifyInstance) {
  // ── Public: submit a demo request ──
  app.post('/demo-requests', async (request, reply) => {
    const input = createDemoRequestSchema.parse(request.body);
    const created = await demoService.createDemoRequest(input);
    return reply.status(201).send({ data: created });
  });

  // ── Super-admin CRM ──
  app.get('/admin/demo-requests', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    return reply.send({ data: await demoService.listDemoRequests(status) });
  });

  app.patch('/admin/demo-requests/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateDemoRequestSchema.parse(request.body);
    const row = await demoService.updateDemoRequest(id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '신청을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/admin/demo-requests/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await demoService.deleteDemoRequest(id);
    return reply.status(204).send();
  });

  // Issue a per-applicant 24h demo login (ID = applicant email, random password)
  // and email it; mark status=sent.
  app.post('/admin/demo-requests/:id/send-access', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await demoService.getDemoRequest(id);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '신청을 찾을 수 없습니다' } });
    const applicantEmail = row.email as string;
    if (!applicantEmail) throw new AppError('NO_EMAIL', 400, '신청자 이메일이 없습니다.');

    // Mint the temporary account on the demo tenant (throws if the email is a real account).
    const login = await issueDemoLogin(applicantEmail, row.name as string | undefined);

    const cfg = await demoService.getDemoConfig();
    const html = accessEmailHtml({
      name: (row.name as string) ?? '',
      loginUrl: (cfg?.login_url as string) || 'https://admin.truelight.app/t/dasom/login',
      loginEmail: login.email,
      loginPassword: login.password,
      expiresAt: login.expiresAt,
      messageBody:
        (cfg?.message_body as string) ||
        `안녕하세요 ${(row.name as string) ?? ''}님,\nTRUE LIGHT 데모 체험을 신청해 주셔서 감사합니다. 아래 정보로 로그인하시면 관리자 화면을 자유롭게 둘러보실 수 있습니다.`,
    });
    await sendEmail({ to: applicantEmail, subject: 'TRUE LIGHT 데모 체험 접속 안내', html, from: 'info' });
    const updated = await demoService.updateDemoRequest(id, { status: 'sent' });
    return reply.send({ data: updated });
  });

  // ── Shared demo access config ──
  app.get('/admin/demo-config', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    return reply.send({ data: await demoService.getDemoConfig() });
  });

  app.put('/admin/demo-config', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = demoConfigSchema.parse(request.body);
    return reply.send({ data: await demoService.setDemoConfig(input) });
  });
}
