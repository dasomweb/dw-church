import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  createPageSchema,
  updatePageSchema,
  createSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
} from './schema.js';
import * as pageService from './service.js';

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

  // GET /pages/:slug — public, get page by slug with sections
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

  // POST /pages — auth required
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
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

  // POST /pages/:id/sections
  app.post<{ Params: { id: string } }>(
    '/:id/sections',
    { preHandler: [requireAuth] },
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
