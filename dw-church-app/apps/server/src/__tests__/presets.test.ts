import { describe, it, expect } from 'vitest';
import {
  templatePresets,
  getAllPresets,
  getPreset,
  type TemplatePreset,
} from '../modules/themes/presets.js';

const EXPECTED_PRESETS = [
  'modern',
  'classic',
  'minimal',
  'warm',
  'formal',
  'dark',
  'visual',
  'simple',
  'traditional',
  'youth',
] as const;

const VALID_HEADER_STYLES = ['default', 'centered', 'transparent', 'dark'];
const VALID_HERO_STYLES = ['full', 'split', 'minimal', 'overlay', 'none'];
const VALID_CONTENT_WIDTHS = ['narrow', 'default', 'wide', 'full'];
const VALID_CARD_STYLES = ['shadow', 'border', 'flat', 'elevated'];
const VALID_FOOTER_STYLES = ['default', 'minimal', 'centered', 'dark'];
const VALID_BORDER_RADII = ['none', 'sm', 'md', 'lg', 'xl'];
const VALID_SERMON_GRIDS = [2, 3, 4];

describe('templatePresets', () => {
  it('should have exactly 10 presets', () => {
    expect(Object.keys(templatePresets)).toHaveLength(10);
  });

  it('should contain all expected preset names', () => {
    for (const name of EXPECTED_PRESETS) {
      expect(templatePresets).toHaveProperty(name);
    }
  });

  describe.each(EXPECTED_PRESETS)('preset "%s"', (name) => {
    const preset = templatePresets[name];

    it('should have matching name field', () => {
      expect(preset.name).toBe(name);
    });

    it('should have a non-empty label', () => {
      expect(preset.label).toBeTruthy();
    });

    it('should have a non-empty description', () => {
      expect(preset.description).toBeTruthy();
    });

    it('should have all required color fields as hex strings', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      const { colors } = preset;
      expect(colors.primary).toMatch(hexPattern);
      expect(colors.secondary).toMatch(hexPattern);
      expect(colors.accent).toMatch(hexPattern);
      expect(colors.background).toMatch(hexPattern);
      expect(colors.surface).toMatch(hexPattern);
      expect(colors.text).toMatch(hexPattern);
    });

    it('should have heading and body fonts', () => {
      expect(preset.fonts.heading).toBeTruthy();
      expect(preset.fonts.body).toBeTruthy();
    });

    it('should have valid layout values', () => {
      const { layout } = preset;
      expect(VALID_HEADER_STYLES).toContain(layout.headerStyle);
      expect(VALID_HERO_STYLES).toContain(layout.heroStyle);
      expect(VALID_CONTENT_WIDTHS).toContain(layout.contentWidth);
      expect(VALID_CARD_STYLES).toContain(layout.cardStyle);
      expect(VALID_FOOTER_STYLES).toContain(layout.footerStyle);
      expect(VALID_BORDER_RADII).toContain(layout.borderRadius);
      expect(VALID_SERMON_GRIDS).toContain(layout.sermonGrid);
    });
  });
});

describe('getAllPresets', () => {
  it('should return an array of all 10 presets', () => {
    const all = getAllPresets();
    expect(all).toHaveLength(10);
  });

  it('should return TemplatePreset objects', () => {
    const all = getAllPresets();
    for (const preset of all) {
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('colors');
      expect(preset).toHaveProperty('fonts');
      expect(preset).toHaveProperty('layout');
    }
  });
});

describe('getPreset', () => {
  it('should return the correct preset for a valid name', () => {
    const modern = getPreset('modern');
    expect(modern).not.toBeNull();
    expect(modern!.name).toBe('modern');
    expect(modern!.colors.primary).toBe('#2563eb');
  });

  it('should return null for an unknown preset name', () => {
    expect(getPreset('nonexistent')).toBeNull();
  });

  it('should return null for an empty string', () => {
    expect(getPreset('')).toBeNull();
  });
});
