import type { FastifyRequest } from 'fastify';
import { AppError } from '../middleware/error-handler.js';
import { validateSchemaName } from './validate-schema.js';

/**
 * Safely extract the tenant schema from a Fastify request.
 * Throws if tenant middleware has not resolved a schema.
 */
export function getSchema(request: FastifyRequest): string {
  if (!request.tenantSchema) {
    throw new AppError('TENANT_REQUIRED', 400, 'Tenant not found');
  }
  return validateSchemaName(request.tenantSchema);
}
