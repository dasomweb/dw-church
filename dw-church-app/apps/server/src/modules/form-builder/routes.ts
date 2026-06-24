import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import {
  createFormSchema,
  updateFormSchema,
  createFieldSchema,
  updateFieldSchema,
  reorderFieldsSchema,
  slugSchema,
} from './schema.js';
import * as svc from './service.js';
import { validateSubmission, type FieldDef } from './field-validation.js';
import { createFormSubmission } from '../forms/service.js';

/**
 * Form Builder routes (prefix /api/v1).
 *
 *   Admin (requireAuth — the tenant admin app):
 *     GET    /form-defs              list forms
 *     POST   /form-defs              create form
 *     GET    /form-defs/:id          form + fields
 *     PUT    /form-defs/:id          update form
 *     DELETE /form-defs/:id          delete form (fields cascade; submissions kept)
 *     POST   /form-defs/:id/fields   add field
 *     PUT    /form-defs/:id/fields/reorder
 *     PUT    /form-fields/:id        update field
 *     DELETE /form-fields/:id        delete field
 *
 *   Public (no auth — storefront renderer):
 *     GET  /forms/:slug/schema       form + active fields, for rendering
 *     POST /forms/:slug/submit       validate against fields, store in form_submissions
 *
 * The resource is named /form-defs (not /forms) so it never collides with the
 * forms module's /forms/:type submit + /form-submissions inbox routes.
 */
function toFieldDefs(fields: Record<string, unknown>[]): FieldDef[] {
  return fields.map((f) => ({
    fieldKey: String(f.field_key),
    fieldType: f.field_type as FieldDef['fieldType'],
    label: String(f.label),
    isRequired: Boolean(f.is_required),
    options: (f.options as { value: string; label: string }[]) ?? [],
  }));
}

export async function formBuilderRoutes(app: FastifyInstance) {
  // ── Admin: forms ──────────────────────────────────────────────────
  app.get('/form-defs', { preHandler: [requireAuth] }, async (request, reply) => {
    return reply.send({ data: await svc.listForms(getSchema(request)) });
  });

  app.post('/form-defs', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createFormSchema.parse(request.body);
    const created = await svc.createForm(getSchema(request), input);
    return reply.status(201).send({ data: created });
  });

  app.get('/form-defs/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const found = await svc.getFormWithFields(getSchema(request), id, 'id');
    if (!found) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '폼을 찾을 수 없습니다' } });
    return reply.send({ data: found });
  });

  app.put('/form-defs/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateFormSchema.parse(request.body);
    const row = await svc.updateForm(getSchema(request), id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '폼을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/form-defs/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.deleteForm(getSchema(request), id);
    return reply.status(204).send();
  });

  // ── Admin: fields ─────────────────────────────────────────────────
  app.post('/form-defs/:id/fields', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createFieldSchema.parse(request.body);
    const created = await svc.createField(getSchema(request), id, input);
    return reply.status(201).send({ data: created });
  });

  app.put('/form-defs/:id/fields/reorder', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { fieldIds } = reorderFieldsSchema.parse(request.body);
    await svc.reorderFields(getSchema(request), id, fieldIds);
    return reply.send({ data: { ok: true } });
  });

  app.put('/form-fields/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateFieldSchema.parse(request.body);
    const row = await svc.updateField(getSchema(request), id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '항목을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/form-fields/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.deleteField(getSchema(request), id);
    return reply.status(204).send();
  });

  // ── Public: render schema ─────────────────────────────────────────
  app.get('/forms/:slug/schema', async (request, reply) => {
    const slug = slugSchema.parse((request.params as { slug: string }).slug);
    const found = await svc.getFormWithFields(getSchema(request), slug, 'slug');
    if (!found || found.form.is_active === false) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '폼을 찾을 수 없습니다' } });
    }
    return reply.send({ data: found });
  });

  // ── Public: submit ────────────────────────────────────────────────
  app.post('/forms/:slug/submit', async (request, reply) => {
    const slug = slugSchema.parse((request.params as { slug: string }).slug);
    const body = (request.body ?? {}) as Record<string, unknown>;

    // Honeypot — a bot fills the hidden _hp field. Pretend success, store nothing.
    if (typeof body._hp === 'string' && body._hp.trim() !== '') {
      return reply.status(201).send({ data: { ok: true } });
    }

    const schema = getSchema(request);
    const found = await svc.getFormWithFields(schema, slug, 'slug');
    if (!found || found.form.is_active === false) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '폼을 찾을 수 없습니다' } });
    }

    const { ok, errors, cleaned } = validateSubmission(body, toFieldDefs(found.fields));
    if (!ok) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: errors.join('\n'), details: errors } });
    }

    // Reuse the generic inbox table so submissions appear in 폼 제출 관리.
    const created = await createFormSubmission(schema, slug, cleaned);
    return reply.status(201).send({ data: { id: (created as { id?: string })?.id ?? null, ok: true } });
  });
}
