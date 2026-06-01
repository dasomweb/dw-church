/**
 * Central block registry — single source of truth for block_type metadata.
 *
 * The actual data lives in registry.json so Python (agents-adapter) can
 * read the same source. This file just adds TypeScript types and helpers.
 *
 * What lives here:
 *   - block_type identifier
 *   - human label (Korean)
 *   - group (hero / content / media / data / conversion / layout)
 *   - default props for new instances
 *   - AI hint (one-line description for the LLM prompt)
 *   - variant list (when the block has named variants)
 *   - flags: isHidden (hide from builder palette), isAlias (legacy alias of
 *     another block_type), isLayoutBlock (has children[]), isDataBlock
 *     (fetches live data from a content module)
 *
 * What does NOT live here (intentional):
 *   - React component references — kept in storefrontBlockMap.ts (apps/web)
 *     and adminBlockMap.ts (packages/blocks/utilities/BlockRenderer.tsx)
 *     since the same block_type may render with different components on
 *     storefront vs admin canvas
 *   - Per-block Zod props validation — kept in apps/server/src/modules/
 *     pages/block-schemas.ts. registry-level defaultProps are *initial*
 *     values; runtime validation is the schema's job
 *
 * To add a new block:
 *   1. Add an entry to registry.json
 *   2. Implement the React component(s)
 *   3. Wire the component into storefrontBlockMap / adminBlockMap
 *   4. (Optional) Add Zod schema in block-schemas.ts for stricter prop
 *      validation
 *
 * Surfaces that derive from this registry (DO NOT duplicate the list):
 *   - apps/server/src/modules/pages/schema.ts — blockTypes Zod enum
 *   - packages/admin-app/src/components/builder/LivePreviewPane.tsx —
 *     BLOCK_PALETTE
 *   - packages/agents-adapter/tests/test_pattern_map.py — KNOWN_BLOCK_TYPES
 *   - apps/server/src/modules/ai/page-generator.ts — BLOCK_DESCRIPTIONS
 */

import registryJson from './registry.json' with { type: 'json' };

export type BlockGroup = 'hero' | 'content' | 'media' | 'data' | 'conversion' | 'layout' | 'catalog' | 'product';

export interface BlockFlags {
  /** Don't show this block in the builder palette. Used for layout
   * sub-types that only appear inside a parent layout block, and for
   * legacy aliases that exist for back-compat but shouldn't be
   * picked anew. */
  isHidden?: boolean;
  /** Legacy alias for another block_type. Storefront still renders it,
   * but the AI / palette prefer the canonical form. */
  isAlias?: boolean;
  /** Block has children[] (row, columns, tabs, accordion). */
  isLayoutBlock?: boolean;
  /** Block fetches live data from a content module — props control display
   * only, not content. */
  isDataBlock?: boolean;
}

export interface BlockDefinition {
  label: string;
  group: BlockGroup;
  flags: BlockFlags;
  defaultProps: Record<string, unknown>;
  aiHint?: string;
  variants?: string[];
  /** Block whose canonical name this one aliases. Only set when
   * flags.isAlias is true. */
  aliasOf?: string;
  /** Korean prose explanation: when/where to use this block. Drives
   * palette tooltips and is fed into the AI Builder system prompt. */
  description?: string;
  /** Intent keywords (English, lowercase, kebab-case). Used by the AI
   * Builder for fuzzy block selection — eg. tags=["hero","above-fold"]
   * lets a planner that says "above-fold hero" land on hero_banner.
   * Keep these stable; rename only by adding aliases. */
  tags?: string[];
  /** Concrete usage examples (Korean). Operator-facing in the palette
   * to disambiguate similar blocks. Optional. */
  useCases?: string[];
}

const raw = registryJson as {
  version: number;
  groups: Record<BlockGroup, string>;
  blocks: Record<string, BlockDefinition>;
};

/** All block_types known to B2B Smart, keyed by canonical id. */
export const BLOCK_REGISTRY: Record<string, BlockDefinition> = raw.blocks;

/** Localized group labels (Korean). */
export const BLOCK_GROUPS: Record<BlockGroup, string> = raw.groups;

/** All block_type ids in the order they appear in registry.json. */
export const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY);

/** Type-safe view of all block_type ids. */
export type BlockType = keyof typeof BLOCK_REGISTRY;

/** Block_types that show up in the builder's "add block" palette
 * (excludes hidden / alias / layout sub-types). Order preserved from
 * registry.json. */
export function getPaletteBlocks(): Array<{ type: string; label: string; group: BlockGroup }> {
  return BLOCK_TYPES
    .filter((type) => {
      const def = BLOCK_REGISTRY[type]!;
      return !def.flags.isHidden && !def.flags.isAlias;
    })
    .map((type) => {
      const def = BLOCK_REGISTRY[type]!;
      return { type, label: def.label, group: def.group };
    });
}

/** Default props for a new instance of `type`. Returns {} if the type is
 * unknown rather than throwing — caller can decide how to handle that. */
export function getDefaultProps(type: string): Record<string, unknown> {
  return BLOCK_REGISTRY[type]?.defaultProps ?? {};
}

/** AI hint for `type`, used to build LLM system prompts. */
export function getAiHint(type: string): string | undefined {
  return BLOCK_REGISTRY[type]?.aiHint;
}

/** Korean description for `type` — palette tooltips, inspector header. */
export function getBlockDescription(type: string): string | undefined {
  return BLOCK_REGISTRY[type]?.description;
}

/** Intent tags for `type`. Empty array if missing — safe to .includes(). */
export function getBlockTags(type: string): string[] {
  return BLOCK_REGISTRY[type]?.tags ?? [];
}

/** Korean use-case examples for `type`. Empty array if missing. */
export function getBlockUseCases(type: string): string[] {
  return BLOCK_REGISTRY[type]?.useCases ?? [];
}

/** True if `type` is a known block_type in the registry. */
export function isKnownBlockType(type: string): boolean {
  return type in BLOCK_REGISTRY;
}
