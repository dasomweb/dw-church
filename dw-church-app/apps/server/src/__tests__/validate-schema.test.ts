import { describe, it, expect } from 'vitest';
import { validateSlug, validateSchemaName } from '../utils/validate-schema.js';

describe('validateSlug', () => {
  it('should accept a simple lowercase slug', () => {
    expect(validateSlug('mychurch')).toBe('mychurch');
  });

  it('should accept slugs with hyphens', () => {
    expect(validateSlug('my-church')).toBe('my-church');
  });

  it('should accept slugs with underscores', () => {
    expect(validateSlug('my_church')).toBe('my_church');
  });

  it('should accept slugs with numbers', () => {
    expect(validateSlug('church123')).toBe('church123');
  });

  it('should accept single character slug', () => {
    expect(validateSlug('a')).toBe('a');
  });

  it('should accept slug starting with a number', () => {
    expect(validateSlug('1church')).toBe('1church');
  });

  it('should reject empty string', () => {
    expect(() => validateSlug('')).toThrow();
  });

  it('should reject slugs with uppercase letters', () => {
    expect(() => validateSlug('MyChurch')).toThrow();
  });

  it('should reject slugs with spaces', () => {
    expect(() => validateSlug('my church')).toThrow();
  });

  it('should reject slugs starting with a hyphen', () => {
    expect(() => validateSlug('-church')).toThrow();
  });

  it('should reject slugs starting with an underscore', () => {
    expect(() => validateSlug('_church')).toThrow();
  });

  it('should reject SQL injection attempts', () => {
    expect(() => validateSlug("'; DROP TABLE users; --")).toThrow();
    expect(() => validateSlug('1 OR 1=1')).toThrow();
    expect(() => validateSlug('admin\'; --')).toThrow();
  });

  it('should reject special characters', () => {
    expect(() => validateSlug('church@123')).toThrow();
    expect(() => validateSlug('church/path')).toThrow();
    expect(() => validateSlug('church.name')).toThrow();
    expect(() => validateSlug('church<script>')).toThrow();
  });

  it('should reject slugs longer than 63 characters', () => {
    const longSlug = 'a'.repeat(64);
    expect(() => validateSlug(longSlug)).toThrow();
  });

  it('should accept slugs exactly 63 characters long', () => {
    const slug63 = 'a'.repeat(63);
    expect(validateSlug(slug63)).toBe(slug63);
  });
});

describe('validateSchemaName', () => {
  it('should accept a valid tenant schema name', () => {
    expect(validateSchemaName('tenant_mychurch')).toBe('tenant_mychurch');
  });

  it('should accept schema name with hyphens', () => {
    expect(validateSchemaName('tenant_my-church')).toBe('tenant_my-church');
  });

  it('should accept schema name with underscores', () => {
    expect(validateSchemaName('tenant_my_church')).toBe('tenant_my_church');
  });

  it('should reject schema names without tenant_ prefix', () => {
    expect(() => validateSchemaName('mychurch')).toThrow();
  });

  it('should reject schema name "public"', () => {
    expect(() => validateSchemaName('public')).toThrow();
  });

  it('should reject empty string', () => {
    expect(() => validateSchemaName('')).toThrow();
  });

  it('should reject schema names with uppercase', () => {
    expect(() => validateSchemaName('tenant_MyChurch')).toThrow();
  });

  it('should reject SQL injection in schema names', () => {
    expect(() => validateSchemaName("tenant_a'; DROP SCHEMA public; --")).toThrow();
  });
});
