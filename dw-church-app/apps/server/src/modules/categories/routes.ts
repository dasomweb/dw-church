import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import {
  createSermonCategorySchema, updateSermonCategorySchema,
  createPreacherSchema, updatePreacherSchema,
  createAlbumCategorySchema, updateAlbumCategorySchema,
} from './schema.js';
import * as categoryService from './service.js';

export async function categoryRoutes(app: FastifyInstance) {
  // ─── Generic taxonomy GET by type ──────────────────────────────────
  app.get('/taxonomies/:type', { preHandler: [optionalAuth] }, async (request, reply) => {
    const { type } = request.params as { type: string };
    const data = await categoryService.listByType(getSchema(request), type);
    return reply.send({ data });
  });

  // ─── Sermon Categories ───────────────────────────────────────────

  app.get('/sermon-categories', async (request, reply) => {
    const data = await categoryService.listSermonCategories(getSchema(request));
    return reply.send({ data });
  });

  app.get('/sermon-categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const category = await categoryService.getSermonCategory(getSchema(request), id);
    if (!category) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sermon category not found' } });
    return reply.send({ data: category });
  });

  app.post('/sermon-categories', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createSermonCategorySchema.parse(request.body);
    const category = await categoryService.createSermonCategory(getSchema(request), input);
    return reply.status(201).send({ data: category });
  });

  app.put('/sermon-categories/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSermonCategorySchema.parse(request.body);
    const category = await categoryService.updateSermonCategory(getSchema(request), id, input);
    if (!category) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sermon category not found' } });
    return reply.send({ data: category });
  });

  app.delete('/sermon-categories/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await categoryService.deleteSermonCategory(getSchema(request), id);
    return reply.status(204).send();
  });

  // ─── Preachers ───────────────────────────────────────────────────

  app.get('/preachers', async (request, reply) => {
    const data = await categoryService.listPreachers(getSchema(request));
    return reply.send({ data });
  });

  app.get('/preachers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const preacher = await categoryService.getPreacher(getSchema(request), id);
    if (!preacher) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Preacher not found' } });
    return reply.send({ data: preacher });
  });

  app.post('/preachers', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createPreacherSchema.parse(request.body);
    const preacher = await categoryService.createPreacher(getSchema(request), input);
    return reply.status(201).send({ data: preacher });
  });

  app.put('/preachers/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updatePreacherSchema.parse(request.body);
    const preacher = await categoryService.updatePreacher(getSchema(request), id, input);
    if (!preacher) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Preacher not found' } });
    return reply.send({ data: preacher });
  });

  app.delete('/preachers/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await categoryService.deletePreacher(getSchema(request), id);
    return reply.status(204).send();
  });

  // ─── Staff Departments ───────────────────────────────────────────

  app.get('/staff-departments', async (request, reply) => {
    const data = await categoryService.listByType(getSchema(request), 'staff_department');
    return reply.send({ data });
  });

  // ─── Album Categories ────────────────────────────────────────────

  app.get('/album-categories', async (request, reply) => {
    const data = await categoryService.listAlbumCategories(getSchema(request));
    return reply.send({ data });
  });

  app.get('/album-categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const category = await categoryService.getAlbumCategory(getSchema(request), id);
    if (!category) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Album category not found' } });
    return reply.send({ data: category });
  });

  app.post('/album-categories', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createAlbumCategorySchema.parse(request.body);
    const category = await categoryService.createAlbumCategory(getSchema(request), input);
    return reply.status(201).send({ data: category });
  });

  app.put('/album-categories/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateAlbumCategorySchema.parse(request.body);
    const category = await categoryService.updateAlbumCategory(getSchema(request), id, input);
    if (!category) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Album category not found' } });
    return reply.send({ data: category });
  });

  app.delete('/album-categories/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await categoryService.deleteAlbumCategory(getSchema(request), id);
    return reply.status(204).send();
  });
}
