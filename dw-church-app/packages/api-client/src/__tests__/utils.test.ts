import { describe, it, expect } from 'vitest';

// Re-implement the utility functions from client.ts for isolated testing
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelizeKeys(v)])
    );
  }
  return obj;
}

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(snakeizeKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toSnake(k), snakeizeKeys(v)])
    );
  }
  return obj;
}

describe('toCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(toCamel('church_name')).toBe('churchName');
  });
  it('converts multi-underscore', () => {
    expect(toCamel('sermon_date_time')).toBe('sermonDateTime');
  });
  it('leaves camelCase unchanged', () => {
    expect(toCamel('churchName')).toBe('churchName');
  });
  it('handles single word', () => {
    expect(toCamel('title')).toBe('title');
  });
  it('converts leading underscore pattern', () => {
    // _x pattern matches: _p → P (regex behavior)
    expect(toCamel('_private')).toBe('Private');
  });
});

describe('toSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnake('churchName')).toBe('church_name');
  });
  it('converts multi-capital', () => {
    expect(toSnake('sermonDateTime')).toBe('sermon_date_time');
  });
  it('leaves snake_case unchanged', () => {
    expect(toSnake('church_name')).toBe('church_name');
  });
  it('handles single word', () => {
    expect(toSnake('title')).toBe('title');
  });
});

describe('camelizeKeys', () => {
  it('converts flat object keys', () => {
    expect(camelizeKeys({ church_name: 'Grace', church_phone: '123' })).toEqual({
      churchName: 'Grace', churchPhone: '123',
    });
  });

  it('converts nested object keys', () => {
    expect(camelizeKeys({ user_info: { first_name: 'John' } })).toEqual({
      userInfo: { firstName: 'John' },
    });
  });

  it('converts array of objects', () => {
    expect(camelizeKeys([{ sermon_date: '2026-01-01' }, { sermon_date: '2026-01-02' }])).toEqual([
      { sermonDate: '2026-01-01' }, { sermonDate: '2026-01-02' },
    ]);
  });

  it('preserves primitive values', () => {
    expect(camelizeKeys('hello')).toBe('hello');
    expect(camelizeKeys(42)).toBe(42);
    expect(camelizeKeys(null)).toBe(null);
    expect(camelizeKeys(true)).toBe(true);
  });

  it('handles empty object', () => {
    expect(camelizeKeys({})).toEqual({});
  });

  it('handles deeply nested', () => {
    expect(camelizeKeys({
      data: { page_sections: [{ block_type: 'hero_banner', sort_order: 0 }] },
    })).toEqual({
      data: { pageSections: [{ blockType: 'hero_banner', sortOrder: 0 }] },
    });
  });
});

describe('snakeizeKeys', () => {
  it('converts flat object keys', () => {
    expect(snakeizeKeys({ churchName: 'Grace', churchPhone: '123' })).toEqual({
      church_name: 'Grace', church_phone: '123',
    });
  });

  it('converts nested object keys', () => {
    expect(snakeizeKeys({ userInfo: { firstName: 'John' } })).toEqual({
      user_info: { first_name: 'John' },
    });
  });

  it('converts array of objects', () => {
    expect(snakeizeKeys([{ sermonDate: '2026-01-01' }])).toEqual([{ sermon_date: '2026-01-01' }]);
  });

  it('preserves primitives', () => {
    expect(snakeizeKeys('hello')).toBe('hello');
    expect(snakeizeKeys(42)).toBe(42);
    expect(snakeizeKeys(null)).toBe(null);
  });
});

describe('roundtrip conversion', () => {
  it('snake → camel → snake preserves data', () => {
    const original = { church_name: 'Grace', sermon_date: '2026-01-01', sort_order: 3 };
    const camelized = camelizeKeys(original) as Record<string, unknown>;
    const snaked = snakeizeKeys(camelized);
    expect(snaked).toEqual(original);
  });

  it('camel → snake → camel preserves data', () => {
    const original = { churchName: 'Grace', sermonDate: '2026-01-01', sortOrder: 3 };
    const snaked = snakeizeKeys(original) as Record<string, unknown>;
    const camelized = camelizeKeys(snaked);
    expect(camelized).toEqual(original);
  });
});
