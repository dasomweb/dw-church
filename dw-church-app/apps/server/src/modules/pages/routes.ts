import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, optionalAuth, requirePlan } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { planLimits } from '../../config/plan-limits.js';
import {
  createPageSchema,
  updatePageSchema,
  createSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
} from './schema.js';
import * as pageService from './service.js';
import { BLOCK_SCHEMAS } from './block-schemas.js';
import { getAllTemplates, getTemplate } from './templates.js';

export default async function pageRoutes(app: FastifyInstance): Promise<void> {
  // GET /pages — public, list pages
  app.get('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const pages = await pageService.listPages(schema);
    return reply.send({ data: pages });
  });

  // ── Block schemas ──

  // GET /pages/block-schemas — public, returns all block type schemas
  app.get('/block-schemas', async (_request, reply) => {
    return reply.send({ data: BLOCK_SCHEMAS });
  });

  // ── Templates ──

  // GET /pages/templates — public, list available page templates
  app.get('/templates', async (_request, reply) => {
    return reply.send({ data: getAllTemplates() });
  });

  // GET /pages/:slug — public, get page by slug with sections
  // (registered after static routes so /block-schemas, /templates are matched first)
  app.get<{ Params: { slug: string } }>(
    '/:slug',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const result = await pageService.getPageBySlug(
        schema,
        request.params.slug,
      );
      return reply.send(result);
    },
  );

  // POST /pages — auth + Pro/Enterprise 플랜 필요 (Basic = 페이지 추가 금지).
  // super_admin 은 requirePlan 우회 (어떤 테넌트든 가능).
  app.post('/', { preHandler: [requireAuth, requirePlan(['pro', 'enterprise'])] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    // Enforce the tenant's page quota. super_admin bypasses (they build the
    // initial site and may legitimately seed pages on any tenant).
    if (request.user?.role !== 'super_admin') {
      const { maxPages } = planLimits(request.tenant?.plan);
      const current = await pageService.countPages(schema);
      if (current >= maxPages) {
        throw new AppError(
          'PLAN_LIMIT_REACHED',
          403,
          `현재 플랜의 페이지 한도(${maxPages}개)에 도달했습니다. 페이지를 더 추가하려면 플랜을 업그레이드하세요.`,
        );
      }
    }
    const body = createPageSchema.parse(request.body);
    const page = await pageService.createPage(schema, body);
    return reply.status(201).send(page);
  });

  // PUT /pages/:id — auth required
  app.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const body = updatePageSchema.parse(request.body);
      const page = await pageService.updatePage(
        schema,
        request.params.id,
        body,
      );
      return reply.send(page);
    },
  );

  // DELETE /pages/:id — auth required
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      await pageService.deletePage(schema, request.params.id);
      return reply.status(204).send();
    },
  );

  // POST /pages/from-template — auth required, create page from template
  // POST /pages/from-template — 페이지 생성이라 Pro+ gate.
  app.post('/from-template', { preHandler: [requireAuth, requirePlan(['pro', 'enterprise'])] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }

    const body = z
      .object({
        template: z.string().min(1),
        pageTitle: z.string().min(1).max(200),
        pageSlug: z.string().min(1).max(200),
      })
      .parse(request.body);

    const tmpl = getTemplate(body.template);
    if (!tmpl) {
      throw new AppError('BAD_REQUEST', 400, `Unknown template: ${body.template}`);
    }

    const result = await pageService.createPageFromTemplate(
      schema,
      body.pageTitle,
      body.pageSlug,
      tmpl.sections,
    );

    return reply.status(201).send(result);
  });

  // POST /pages/generate — auth required, accepts prompt + templateType, returns sections JSON
  // POST /pages/generate — AI 페이지 생성도 페이지 생성이라 Pro+ gate.
  app.post('/generate', { preHandler: [requireAuth, requirePlan(['pro', 'enterprise'])] }, async (request, reply) => {
    const body = z
      .object({
        prompt: z.string().min(1).max(2000),
        templateType: z.string().min(1),
      })
      .parse(request.body);

    const tmpl = getTemplate(body.templateType);
    if (!tmpl) {
      throw new AppError('BAD_REQUEST', 400, `Unknown template type: ${body.templateType}`);
    }

    // Return the template sections as a generation result
    // (prompt is accepted for future AI integration but currently uses predefined templates)
    return reply.send({
      templateType: body.templateType,
      prompt: body.prompt,
      sections: tmpl.sections,
    });
  });

  // ── Sections ──

  // GET /pages/:id/sections
  app.get<{ Params: { id: string } }>(
    '/:id/sections',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const sections = await pageService.listSections(
        schema,
        request.params.id,
      );
      return reply.send({ data: sections });
    },
  );

  // POST /pages/:id/sections — Pro+ 만 새 섹션 추가. Basic 은 기존 섹션의
  // PUT (콘텐츠 수정) 과 reorder/delete 는 가능하지만 새로 만드는 건 금지.
  app.post<{ Params: { id: string } }>(
    '/:id/sections',
    { preHandler: [requireAuth, requirePlan(['pro', 'enterprise'])] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const body = createSectionSchema.parse(request.body);
      const section = await pageService.createSection(
        schema,
        request.params.id,
        body,
      );
      return reply.status(201).send(section);
    },
  );

  // PUT /pages/:id/sections/:sectionId
  app.put<{ Params: { id: string; sectionId: string } }>(
    '/:id/sections/:sectionId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const body = updateSectionSchema.parse(request.body);
      const section = await pageService.updateSection(
        schema,
        request.params.id,
        request.params.sectionId,
        body,
      );
      return reply.send(section);
    },
  );

  // DELETE /pages/:id/sections/:sectionId
  app.delete<{ Params: { id: string; sectionId: string } }>(
    '/:id/sections/:sectionId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      await pageService.deleteSection(
        schema,
        request.params.id,
        request.params.sectionId,
      );
      return reply.status(204).send();
    },
  );

  // POST /pages/:id/sections/reorder
  app.post<{ Params: { id: string } }>(
    '/:id/sections/reorder',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const { ids } = reorderSectionsSchema.parse(request.body);
      const sections = await pageService.reorderSections(
        schema,
        request.params.id,
        ids,
      );
      return reply.send({ data: sections });
    },
  );
}
