import { AppError } from '../middleware/error-handler.js';

const SAFE_SCHEMA_PATTERN = /^tenant_[a-z0-9][a-z0-9_-]{0,62}$/;

export function validateSchemaName(schema: string): string {
  if (!SAFE_SCHEMA_PATTERN.test(schema)) {
    throw new AppError('INVALID_SCHEMA', 400, 'Invalid tenant schema name');
  }
  return schema;
}

/**
 * Validate a raw tenant slug before it is used to build a schema name.
 * Accepts only lowercase alphanumeric characters, hyphens, and underscores.
 */
const SAFE_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export function validateSlug(slug: string): string {
  if (!SAFE_SLUG_PATTERN.test(slug)) {
    throw new AppError('INVALID_SCHEMA', 400, 'Invalid tenant slug');
  }
  return slug;
}
