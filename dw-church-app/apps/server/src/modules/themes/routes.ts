import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { updateThemeSchema } from './schema.js';
import * as themeService from './service.js';
import { getAllPresets, getPreset } from './presets.js';

export default async function themeRoutes(app: FastifyInstance): Promise<void> {
  // GET /theme — public
  app.get('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const theme = await themeService.getTheme(schema);
    return reply.send(theme);
  });

  // GET /theme/presets — list all template presets (public)
  app.get('/presets', async (_request, reply) => {
    return reply.send({ data: getAllPresets() });
  });

  // GET /theme/presets/:name — single preset (public)
  app.get('/presets/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const preset = getPreset(name);
    if (!preset) {
      throw new AppError('PRESET_NOT_FOUND', 404, `Template preset "${name}" not found`);
    }
    return reply.send(preset);
  });

  // PUT /theme — auth required
  app.put('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const body = updateThemeSchema.parse(request.body);
    const theme = await themeService.updateTheme(schema, body);
    return reply.send(theme);
  });
}
