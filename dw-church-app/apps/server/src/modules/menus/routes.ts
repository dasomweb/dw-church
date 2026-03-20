import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { createMenuSchema, updateMenuSchema, reorderMenuSchema } from './schema.js';
import * as menuService from './service.js';

export default async function menuRoutes(app: FastifyInstance): Promise<void> {
  // GET /menus — public
  app.get('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const menus = await menuService.listMenus(schema);
    return reply.send({ data: menus });
  });

  // POST /menus — auth required
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const body = createMenuSchema.parse(request.body);
    const menu = await menuService.createMenu(schema, body);
    return reply.status(201).send(menu);
  });

  // PUT /menus/:id — auth required
  app.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const body = updateMenuSchema.parse(request.body);
      const menu = await menuService.updateMenu(
        schema,
        request.params.id,
        body,
      );
      return reply.send(menu);
    },
  );

  // DELETE /menus/:id — auth required
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      await menuService.deleteMenu(schema, request.params.id);
      return reply.status(204).send();
    },
  );

  // POST /menus/reorder — auth required
  app.post(
    '/reorder',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const schema = request.tenantSchema;
      if (!schema) {
        throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
      }
      const body = reorderMenuSchema.parse(request.body);
      const menus = await menuService.reorderMenus(schema, body);
      return reply.send({ data: menus });
    },
  );
}
