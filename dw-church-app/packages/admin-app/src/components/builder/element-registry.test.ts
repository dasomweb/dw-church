import { describe, it, expect } from 'vitest';
// Importing the module runs its top-level init. A module-eval-order (TDZ)
// bug — like PAGE_SUBNAV calling churchBlock() before CHURCH_KIND is
// initialized — throws right here, which is exactly the crash that took down
// the super-admin page editor. This test is that guard.
import { ELEMENT_REGISTRY, ITEM_FIELDS_BY_TYPE } from './element-registry';

describe('element-registry (module loads + new blocks registered)', () => {
  it('registers the 4 new platform blocks with non-empty sections', () => {
    for (const t of ['page_subnav', 'prose_image', 'values_grid', 'detail_rows']) {
      expect(ELEMENT_REGISTRY[t], t).toBeDefined();
      expect(ELEMENT_REGISTRY[t]!.sections.length, t).toBeGreaterThan(0);
    }
  });

  it('defines item fields for the new list blocks', () => {
    expect(ITEM_FIELDS_BY_TYPE.values_grid!.map((f) => f.key)).toEqual([
      'overline', 'title', 'description',
    ]);
    expect(ITEM_FIELDS_BY_TYPE.detail_rows!.map((f) => f.key)).toEqual([
      'title', 'label', 'description', 'meta',
    ]);
  });
});
