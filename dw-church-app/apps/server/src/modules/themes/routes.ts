import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { designTokensSchema } from '@dw-church/design-tokens';
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

  // GET /theme/tokens — public; returns DesignTokens. Falls back to a
  // legacy-projected snapshot when the tenant only has the old colors/fonts
  // editor data, so storefront BrandTokensStyle never sees null.
  app.get('/tokens', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const tokens = await themeService.getThemeTokens(schema);
    return reply.send({ data: tokens });
  });

  // PUT /theme/tokens — auth required. Persists a full DesignTokens snapshot
  // for the super-admin ThemeEditor (Phase 3). Validation runs against the
  // shared Zod schema so any divergent client shape is rejected early.
  app.put('/tokens', { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = request.tenantSchema;
    if (!schema) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }
    const tokens = designTokensSchema.parse(request.body);
    const saved = await themeService.updateThemeTokens(schema, tokens);
    return reply.send({ data: saved });
  });
}
