import { describe, it, expect } from 'vitest';
import {
  BLOCK_REGISTRY,
  BLOCK_TYPES,
  BLOCK_GROUPS,
  getPaletteBlocks,
  getDefaultProps,
  getAiHint,
  isKnownBlockType,
} from '../registry';

describe('BLOCK_REGISTRY shape', () => {
  it('every entry has required fields', () => {
    for (const type of BLOCK_TYPES) {
      const def = BLOCK_REGISTRY[type]!;
      expect(def.label, `${type}.label`).toBeTruthy();
      expect(def.group, `${type}.group`).toBeTruthy();
      expect(BLOCK_GROUPS, `${type}.group must be in BLOCK_GROUPS`).toHaveProperty(def.group);
      expect(def.flags, `${type}.flags`).toBeDefined();
      expect(typeof def.defaultProps, `${type}.defaultProps`).toBe('object');
    }
  });

  it('alias entries declare aliasOf', () => {
    for (const type of BLOCK_TYPES) {
      const def = BLOCK_REGISTRY[type]!;
      if (def.flags.isAlias) {
        expect(def.aliasOf, `${type}.aliasOf required because isAlias=true`).toBeTruthy();
        expect(BLOCK_REGISTRY[def.aliasOf!], `${type}.aliasOf=${def.aliasOf} must itself be a registered block`).toBeDefined();
      }
    }
  });

  it('canonical block_types do not declare aliasOf', () => {
    for (const type of BLOCK_TYPES) {
      const def = BLOCK_REGISTRY[type]!;
      if (!def.flags.isAlias && def.aliasOf) {
        throw new Error(`${type} has aliasOf=${def.aliasOf} but is not flagged as alias`);
      }
    }
  });
});

describe('getPaletteBlocks', () => {
  it('excludes hidden blocks', () => {
    const palette = getPaletteBlocks();
    for (const entry of palette) {
      const def = BLOCK_REGISTRY[entry.type]!;
      expect(def.flags.isHidden, `${entry.type} is hidden but appears in palette`).toBeFalsy();
    }
  });

  it('excludes alias blocks (palette shows canonical only)', () => {
    const palette = getPaletteBlocks();
    for (const entry of palette) {
      const def = BLOCK_REGISTRY[entry.type]!;
      expect(def.flags.isAlias, `${entry.type} is alias but appears in palette`).toBeFalsy();
    }
  });

  it('preserves group metadata', () => {
    const palette = getPaletteBlocks();
    for (const entry of palette) {
      expect(BLOCK_GROUPS).toHaveProperty(entry.group);
      expect(entry.label).toBeTruthy();
    }
  });

  it('returns at least the core content / hero / data blocks', () => {
    const types = new Set(getPaletteBlocks().map((e) => e.type));
    // sanity-check that the most common authoring blocks all surface
    for (const required of [
      'hero_banner', 'text_image', 'text_only', 'cta_section',
      'features_grid', 'testimonials', 'faq_accordion',
      'recent_blog_posts', 'album_gallery', 'contact_info',
    ]) {
      expect(types.has(required), `palette missing required block: ${required}`).toBe(true);
    }
  });
});

describe('helpers', () => {
  it('getDefaultProps returns the registered defaults (or empty object)', () => {
    expect(getDefaultProps('hero_banner')).toMatchObject({ height: 'md' });
    expect(getDefaultProps('not_a_real_block')).toEqual({});
  });

  it('getAiHint returns string or undefined', () => {
    expect(typeof getAiHint('hero_banner')).toBe('string');
    expect(getAiHint('not_a_real_block')).toBeUndefined();
  });

  it('isKnownBlockType matches the registry keyset', () => {
    expect(isKnownBlockType('hero_banner')).toBe(true);
    expect(isKnownBlockType('not_a_real_block')).toBe(false);
  });
});
