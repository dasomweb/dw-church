import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { createContactSchema, updateContactSchema, importContactsSchema, listQuerySchema } from './schema.js';
import * as svc from './service.js';

/**
 * 주소록 (marketing_contacts) — 슈퍼어드민 이메일 마케팅 연락처 CRUD + CSV import.
 * 모든 라우트 requireSuperAdmin (플랫폼 운영자 전용, 테넌트와 무관).
 */
export async function marketingContactsRoutes(app: FastifyInstance) {
  app.get('/admin/marketing-contacts', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const q = listQuerySchema.parse(request.query ?? {});
    const [list, stats, tags] = await Promise.all([svc.listContacts(q), svc.getStats(), svc.listTags()]);
    return reply.send({ data: { ...list, stats, tags } });
  });

  app.post('/admin/marketing-contacts', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = createContactSchema.parse(request.body);
    const row = await svc.createContact(input);
    return reply.status(201).send({ data: row });
  });

  app.patch('/admin/marketing-contacts/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateContactSchema.parse(request.body);
    const row = await svc.updateContact(id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '연락처를 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/admin/marketing-contacts/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteContact(id);
    if (!ok) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '연락처를 찾을 수 없습니다' } });
    return reply.send({ data: { deleted: true } });
  });

  // 외부 주소록 import — CSV 텍스트(헤더 자동 감지) 또는 rows 배열.
  app.post('/admin/marketing-contacts/import', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = importContactsSchema.parse(request.body);
    if (!input.csv && !(input.rows && input.rows.length)) {
      return reply.status(400).send({ error: { code: 'NO_DATA', message: 'CSV 내용 또는 rows 가 필요합니다.' } });
    }
    const result = await svc.importContacts(input);
    return reply.send({ data: result });
  });
}
