// Dynamic Data resolver — storefront side.
//
// Detail-template pages (kind = sermon_detail / column_detail / bulletin_detail)
// let the operator bind a block field to the current item via the builder's
// DynamicSource picker. The bound value is stored as a DynamicRef:
//   { __dynamic__: true, context: 'post', path: 'title', fallback?: '...' }
// When rendering the detail route for a specific item, we replace every
// DynamicRef in a section's props with the item's actual value at `path`.
//
// This mirrors @dw-church/blocks' utilities/dynamic-data.ts. It's inlined
// (not imported) because apps/web does not depend on @dw-church/blocks and
// only the pure resolver is needed here.

const DYNAMIC_MARKER = '__dynamic__';

interface DynamicRef {
  __dynamic__: true;
  context: string;
  path: string;
  fallback?: string;
}

function isDynamicRef(v: unknown): v is DynamicRef {
  return (
    typeof v === 'object'
    && v !== null
    && (v as Record<string, unknown>)[DYNAMIC_MARKER] === true
    && typeof (v as Record<string, unknown>).context === 'string'
    && typeof (v as Record<string, unknown>).path === 'string'
  );
}

function parsePath(path: string): string[] {
  const out: string[] = [];
  for (const seg of path.split('.')) {
    const m = seg.match(/^([^[]+)((?:\[\d+\])*)$/);
    if (!m) { out.push(seg); continue; }
    out.push(m[1]!);
    if (m[2]) for (const idx of m[2].matchAll(/\[(\d+)\]/g)) out.push(idx[1]!);
  }
  return out;
}

function getByPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const p of parsePath(path)) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Recursively replace DynamicRefs with values from `contexts[ref.context]`. */
export function resolveDynamicProps<T = unknown>(
  value: T,
  contexts: Record<string, unknown>,
): T {
  if (isDynamicRef(value)) {
    const ctx = contexts[value.context];
    if (ctx != null) {
      const resolved = getByPath(ctx, value.path);
      if (resolved !== undefined && resolved !== null) return resolved as unknown as T;
    }
    return (value.fallback ?? '') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveDynamicProps(v, contexts)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveDynamicProps(v, contexts);
    }
    return out as T;
  }
  return value;
}
