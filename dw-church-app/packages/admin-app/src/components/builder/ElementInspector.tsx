import { useEffect, useMemo, useRef, useState } from 'react';
import { useUpdateSection, type PageSection } from '@dw-church/api-client';
import type { ElementStyle } from '@dw-church/blocks/builder';
import { Icon, ICON_NAMES, ICONS } from '@dw-church/blocks/builder';
import type { BlockStyle } from '@dw-church/design-tokens';
import {
  ELEMENT_REGISTRY,
  ITEM_FIELDS_BY_TYPE,
  getByPath,
  setByPath,
  type BlockElementRegistry,
  type ElementSpec,
} from './element-registry';
import { ImageField, useImageFieldApi, LinkField, ColorField, SpacingField, MediaPicker, LabeledField, CollapsibleGroup, TypographyTokenField, OverlayField, BorderField, LinkButtonField, LayoutField, DesignField, ScheduleGroupsField, type ScheduleGroup } from './property-fields';
import { RichEditor } from '../RichEditor';
import { DynamicSourcePicker, DynamicChip } from './property-fields/DynamicSourcePicker';
import { isDynamicRef, dynamicContextsForPageKind, type DynamicContext } from '@dw-church/blocks/builder';
import type { OverlayFieldValue, BorderFieldValue, LinkButtonFieldValue, LayoutFieldValue, DesignFieldValue } from './property-fields';
import { BlockStyleInspector } from './BlockStyleInspector';
import { useToast } from '../Toast';

// ── dw-church adaptation ─────────────────────────────────────────────
// b2bsmart had products / application-forms + a section.styleOverrides field +
// a useUpdateSectionDraft mutation. dw-church has none of those: a church site
// has no products/forms, and a PageSection is just { props }. So:
//   • product / form hooks are stubbed (those block types carry no data here)
//   • the section's block-level BlockStyle is stored in props.blockStyle
//   • useUpdateSectionDraft wraps useUpdateSection({ pageId, sectionId, data })
type ApplicationForm = { id: string; title?: string; slug?: string; name?: string; isActive?: boolean; description?: string };
const useProducts = (_opts?: unknown): { data: unknown; isLoading: boolean } => ({ data: undefined, isLoading: false });
const useProduct = (_id?: string | null): { data: unknown } => ({ data: undefined });
const useApplicationForms = (): { data: unknown; isLoading: boolean } => ({ data: undefined, isLoading: false });
function useUpdateSectionDraft() {
  const m = useUpdateSection();
  return {
    isPending: m.isPending,
    mutate: (v: { pageId: string; sectionId: string; props?: Record<string, unknown> }) =>
      m.mutate({ pageId: v.pageId, sectionId: v.sectionId, data: { props: v.props } as Partial<PageSection> }),
  };
}
const useFormToast = () => {
  const { showToast } = useToast();
  return {
    showToast,
    success: (msg: string) => showToast('success', msg),
    error: (msg: string) => showToast('error', msg),
  };
};

/**
 * Element-level properties panel. Opens on the right of the Live
 * Preview Pane when the operator clicks any block. Renders fields per
 * the per-block ElementRegistry; saves go to draft_props (Phase 1
 * draft/publish endpoint), so the live storefront stays untouched
 * until the operator hits 발행.
 *
 * elementKey behavior:
 *   '__section__'  → full block view: every editable field across
 *                    every registry section, plus items[] and the
 *                    universal box-model controls.
 *   '<path>'       → focus mode: walks the registry for an ElementSpec
 *                    whose path equals elementKey (e.g. 'title',
 *                    'buttonText'). Renders that single field plus a
 *                    "전체 보기" toggle so the operator can drill back
 *                    out. If no match (custom keys, items[N].field),
 *                    silently degrades to the full view.
 */
interface ElementInspectorProps {
  pageId: string;
  sections: PageSection[];
  sectionId: string;
  elementKey: string;
  onClose: () => void;
  /**
   * Tenant theme palette — { key: hex } map. When provided, the
   * color picker renders a visual palette popup (key name + hex
   * swatch) instead of just a dropdown of palette key strings.
   * Falls back to the dropdown when the theme isn't loaded yet.
   */
  palette?: Record<string, string>;
  /**
   * Optional parent-supplied props-change callback. When provided, the
   * inspector hands every accumulated edit to the parent instead of
   * PATCH-ing the server itself — the parent (PageBuilder) holds them
   * in `sectionDrafts` until the operator clicks "저장". When omitted,
   * the inspector falls back to its legacy debounced auto-PATCH so
   * other (non-builder) call sites keep working.
   */
  onPropsChange?: (sectionId: string, nextProps: Record<string, unknown>) => void;
  /**
   * Optional parent-supplied BlockStyle-change callback. Wired by
   * PageBuilder so section-level style edits (padding / margin /
   * eventually gap / background / etc.) accumulate in
   * `sectionStyleDrafts` next to the props drafts and flush together
   * on the operator's "저장" click. When omitted, the inspector's
   * section-mode style controls fall back to the same debounced
   * auto-PATCH path the props side uses, so non-builder call sites
   * still work without extra wiring.
   */
  onStyleOverridesChange?: (sectionId: string, next: BlockStyle | null) => void;
  /**
   * 현재 페이지의 kind (static / product_detail / single_product /
   * blog_post / catalog_detail). Dynamic Source picker 가 어떤 context
   * 를 노출할지 결정. 미전달 시 dynamic binding 비활성 (일반 페이지로 간주).
   */
  pageKind?: string;
}

interface AppliedStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  /** Block-author-supplied default size token (e.g. 'h2', 'body',
   *  'overline', 'button'). Read from `data-default-size` stamped by
   *  HeadingElement / TextBodyElement / EyebrowElement / ButtonElement.
   *  Lets the inspector show "H2 · Section Title" in the Font Size
   *  select even when the operator hasn't set an override — without it
   *  the resolved px ("36px") gets misclassified as Custom. */
  defaultSize?: string;
}

/**
 * Read the EFFECTIVE rendered style of a focused element from the
 * Live Preview Pane's DOM. The pane stamps every block container with
 * `data-section-id` and every leaf element with `data-element`, so a
 * single querySelector resolves the operator-clicked element to its
 * actual node. getComputedStyle() then returns the browser's resolved
 * values — CSS variable cascade, theme typography, per-section
 * styleOverrides, and per-element elementStyles all already applied.
 *
 * This is the missing half the Inspector needed: the operator sees
 * BOTH what the storefront actually renders ("현재 48px / 700") and
 * what override is set in props.elementStyles (often empty).
 *
 * Re-reads on every `dep` change (typically the override draft) so an
 * edit-then-look loop reflects within ~80ms.
 */
function useAppliedStyle(
  sectionId: string,
  elementKey: string,
  deps: unknown[] = [],
): AppliedStyle | null {
  const [applied, setApplied] = useState<AppliedStyle | null>(null);
  useEffect(() => {
    if (!sectionId || !elementKey || elementKey === '__section__') {
      setApplied(null);
      return;
    }
    // Sanitize for inclusion in a CSS attribute selector. Section ids
    // are uuids and element keys are paths like 'items[0].value' — both
    // safe to splice in once double-quotes are stripped (brackets and
    // dots are valid INSIDE a quoted CSS attribute value).
    const safeId = sectionId.replace(/"/g, '');
    const safeKey = elementKey.replace(/"/g, '');
    const selector = `[data-section-id="${safeId}"] [data-element="${safeKey}"]`;
    const read = (): boolean => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      setApplied({
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        textAlign: cs.textAlign,
        defaultSize: el.dataset.defaultSize,
      });
      return true;
    };
    // Initial probe + a few retries — the inspector can mount before
    // the LivePreviewPane re-renders the highlighted section, so the
    // first querySelector might miss. Bail early once we hit.
    if (!read()) {
      const timeouts: number[] = [];
      for (const ms of [50, 150, 350, 800]) {
        timeouts.push(
          window.setTimeout(() => {
            if (read()) {
              for (const t of timeouts) window.clearTimeout(t);
            }
          }, ms),
        );
      }
      return () => {
        for (const t of timeouts) window.clearTimeout(t);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, elementKey, ...deps]);
  return applied;
}

/**
 * Pull the OverlayField-shape value off a section props bag — every
 * overlay key lives at the top level (overlayMode / overlayColor /
 * overlayColor1 / …) so the registry can wire each one as an independent
 * prop, but the inspector wants a single bag-of-fields object.
 */
function extractOverlayValue(props: Record<string, unknown>): OverlayFieldValue {
  return {
    mode: props.overlayMode as OverlayFieldValue['mode'],
    opacity: typeof props.overlayOpacity === 'number' ? (props.overlayOpacity as number) : undefined,
    color: (props.overlayColor as string) ?? undefined,
    color1: (props.overlayColor1 as string) ?? undefined,
    location1: typeof props.overlayLocation1 === 'number' ? (props.overlayLocation1 as number) : undefined,
    color2: (props.overlayColor2 as string) ?? undefined,
    location2: typeof props.overlayLocation2 === 'number' ? (props.overlayLocation2 as number) : undefined,
    gradientType: props.overlayGradientType as OverlayFieldValue['gradientType'],
    angle: typeof props.overlayAngle === 'number' ? (props.overlayAngle as number) : undefined,
  };
}

/** LayoutField projection — height / textAlign / width / contentWidth
 *  live as flat top-level props. CTA blocks historically stored 'align'
 *  instead of 'textAlign' so we fall through to that key for backward
 *  compat. */
function extractLayoutValue(props: Record<string, unknown>): LayoutFieldValue {
  return {
    height: props.height as LayoutFieldValue['height'],
    textAlign: (props.textAlign ?? props.align) as LayoutFieldValue['textAlign'],
    width: props.width as LayoutFieldValue['width'],
    contentWidth: props.contentWidth as LayoutFieldValue['contentWidth'],
  };
}

/** DesignField projection — backgroundImagePosition + backgroundColor. */
function extractDesignValue(props: Record<string, unknown>): DesignFieldValue {
  return {
    backgroundImagePosition: props.backgroundImagePosition as DesignFieldValue['backgroundImagePosition'],
    backgroundColor: (props.backgroundColor as string) ?? undefined,
  };
}

/** LinkButtonField projection — reads `{prefix}Text` / `{prefix}Url` /
 *  `{prefix}NewTab` off the props bag. `prefix` comes from the registry
 *  spec.path (e.g. 'button' or 'secondaryButton'). */
function extractLinkButtonValue(
  props: Record<string, unknown>,
  prefix: string,
): LinkButtonFieldValue {
  return {
    label: (props[`${prefix}Text`] as string) ?? undefined,
    url: (props[`${prefix}Url`] as string) ?? undefined,
    newTab: typeof props[`${prefix}NewTab`] === 'boolean'
      ? (props[`${prefix}NewTab`] as boolean)
      : undefined,
  };
}

/** Same shape-projection pattern for BorderField — 7 border keys → one
 *  BorderFieldValue object. The reverse direction (BorderField onChange
 *  patch → props bag) is a no-op since the patch keys already match. */
function extractBorderValue(props: Record<string, unknown>): BorderFieldValue {
  return {
    borderType: props.borderType as BorderFieldValue['borderType'],
    borderWidth: typeof props.borderWidth === 'number' ? (props.borderWidth as number) : undefined,
    borderColor: (props.borderColor as string) ?? undefined,
    borderRadiusTop: typeof props.borderRadiusTop === 'number' ? (props.borderRadiusTop as number) : undefined,
    borderRadiusRight: typeof props.borderRadiusRight === 'number' ? (props.borderRadiusRight as number) : undefined,
    borderRadiusBottom: typeof props.borderRadiusBottom === 'number' ? (props.borderRadiusBottom as number) : undefined,
    borderRadiusLeft: typeof props.borderRadiusLeft === 'number' ? (props.borderRadiusLeft as number) : undefined,
  };
}

/**
 * "rgb(28, 25, 23)" → "#1c1917" so the value displayed next to the
 * color swatch stays in the same hex vocabulary as the operator's
 * input field. Falls back to the original string for unrecognized
 * formats (named colors, oklch(), etc).
 */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1]!)}${hex(m[2]!)}${hex(m[3]!)}`;
}

/**
 * Map a field path to the AI image-variant that best matches its slot
 * (hero / section / square). Drives both the dimension hint shown in
 * the upload zone and the agents-side variant selector that picks
 * Gemini-3 vs Imagen-4 for hero/section/square sizes. Falls back to
 * 'section' for unknown paths.
 */
function inferImageVariant(path: string): 'hero' | 'section' | 'square' {
  const lower = path.toLowerCase();
  if (lower.includes('background') || lower.includes('hero') || lower.includes('cover')) {
    return 'hero';
  }
  // Avatars, logos, square thumbnails — single-aspect 1:1 slots.
  if (
    lower.includes('logo') ||
    lower.includes('avatar') ||
    lower.includes('photo') ||
    lower.includes('icon')
  ) {
    return 'square';
  }
  return 'section';
}

// Block-type → AI image policy mode. The agents service's image_service
// branches on 'space' / 'product' to enforce structure / branding
// preservation respectively (see _SPACE_POLICY_PREFIX /
// _PRODUCT_POLICY_PREFIX in image_service.py). Keeping this list small
// and explicit — rather than a regex match — so an operator surprised by
// the policy can quickly see why their hero_banner got space-mode rules.
const SPACE_MODE_BLOCKS = new Set([
  // Hero / banner — usually showcasing a real venue/storefront
  'hero_banner', 'hero_full_width', 'hero_split', 'hero_image_slider',
  'banner_slider',
  // About / mission — anchored on the company's physical existence
  'business_intro', 'mission_vision',
  // Site / contact / location — definitionally venue-bound
  'location_map', 'map_embed', 'contact_info', 'address_info',
  // People / history / events at the venue
  'staff_grid', 'team_members', 'history_timeline', 'event_grid',
  // Galleries that document the venue
  'image_gallery', 'album_gallery',
]);

const PRODUCT_MODE_BLOCKS = new Set([
  'products_showcase', 'recent_products',
]);

function inferModeFromBlockType(blockType?: string): 'space' | 'product' | undefined {
  if (!blockType) return undefined;
  if (SPACE_MODE_BLOCKS.has(blockType)) return 'space';
  if (PRODUCT_MODE_BLOCKS.has(blockType)) return 'product';
  return undefined;
}

/**
 * Wraps the standalone ImageField with the live upload + AI hooks +
 * Media Library picker. Adapter pulls API access from the api-client
 * provider one place rather than threading it through every spec render.
 *
 * Picker wiring: ImageField calls `onPickFromLibrary()` (a Promise) and
 * awaits the URL the operator selects. The adapter holds a resolver
 * ref so the modal can settle the Promise when the user clicks an
 * item or closes without picking. This pattern keeps ImageField
 * presentational — the modal lives next to the adapter, not inside
 * each ImageField instance.
 *
 * Mode hint: blockType drives the space-vs-product policy applied on
 * the agents side. hero_banner → space, products_showcase → product,
 * everything else → undefined (no policy prefix).
 */
function ImageFieldAdapter({
  value,
  onChange,
  variant,
  blockType,
  pageId,
  sectionId,
  path,
}: {
  value: string;
  onChange: (next: string) => void;
  variant: 'hero' | 'section' | 'square';
  blockType?: string;
  /** Required for the "🔮 AI 자동" button — server reads the section
   *  row from these ids. Omit (e.g. in modal contexts that don't have a
   *  persisted section) and the auto-button is hidden. */
  pageId?: string;
  sectionId?: string;
  /** Field path (`imageUrl`, `items[2].imageUrl`, …) — used to infer
   *  the itemIndex for the auto-generate call so the server reads
   *  THAT item's title/description for the prompt. */
  path?: string;
}) {
  const { upload, generate, autoGenerate, autoMatch } = useImageFieldApi();
  const { showToast } = useFormToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Holds the resolver for the in-flight onPickFromLibrary Promise.
  // Set when the user clicks "📁 라이브러리"; cleared after settle.
  const resolveRef = useRef<((url: string | null) => void) | null>(null);

  const openPicker = (): Promise<string | null> => {
    setPickerOpen(true);
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const settlePicker = (url: string | null) => {
    setPickerOpen(false);
    const r = resolveRef.current;
    resolveRef.current = null;
    if (r) r(url);
  };

  // Map ImageField variant → MediaPicker preferredRatio. Same mapping
  // ImageField shows in its hint label so the picker filters to the
  // right shape on first open ("hero" → 16:9, "square" → 1:1, etc.).
  const preferredRatio: '16:9' | '1:1' | undefined =
    variant === 'hero'   ? '16:9'
    : variant === 'square' ? '1:1'
    : undefined;

  const defaultMode = inferModeFromBlockType(blockType);
  // For 'space' blocks, default the picker to reference photos so the
  // operator picks an interior/exterior master rather than scrolling
  // through random uploads. 'product' blocks default to AI rows since
  // operators usually iterate on AI-generated product shots.
  const preferredKind: 'reference' | 'ai_generated' | undefined =
    defaultMode === 'space'   ? 'reference' :
    defaultMode === 'product' ? 'ai_generated' :
    undefined;

  // Extract items[N] index from the field path. The server uses this
  // to read that item's title/description for the prompt — without it,
  // the prompt only has the section-level title which produces nearly
  // identical images for every item in a list block. Pattern:
  //   "items[3].imageUrl" → 3 ;  "imageUrl" → undefined
  const itemIndex = (() => {
    if (!path) return undefined;
    const m = path.match(/^items\[(\d+)\]/);
    return m ? Number(m[1]) : undefined;
  })();

  // Wrap the bare api-client calls in toast feedback. AI image jobs
  // run ~10-30s — without start/done toasts the operator clicks the
  // button and stares at a thumbnail that doesn't change yet, which
  // reads as "broken". The button's own spinner still fires too;
  // the toast is the persistent / dismissible record that doesn't
  // disappear when the operator's cursor leaves the field.
  const wrappedUpload = upload
    ? async (file: File, opts?: { kind?: 'background' | 'content' }): Promise<string> => {
        showToast('info', '📤 Uploading…');
        try {
          const url = await upload(file, opts);
          showToast('success', 'Upload complete');
          return url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          showToast('error', `Upload failed: ${msg}`);
          throw e;
        }
      }
    : undefined;

  const wrappedGenerate = generate
    ? async (prompt: string, opts: { variant: 'hero' | 'section' | 'square'; referenceUrls?: string[]; mode?: 'space' | 'product' }): Promise<string> => {
        showToast('info', '✨ Generating AI image… (10-30s)');
        try {
          const url = await generate(prompt, opts);
          showToast('success', 'AI image generated');
          return url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          showToast('error', `Generation failed: ${msg}`);
          throw e;
        }
      }
    : undefined;

  const onAutoGenerate = pageId && sectionId && autoGenerate
    ? async (): Promise<string> => {
        showToast('info', '🔮 Auto-generating… analyzing page · section · references (10-30s)');
        try {
          const url = await autoGenerate({ pageId, sectionId, itemIndex });
          showToast('success', '🔮 Auto-generated');
          return url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          showToast('error', `Auto-generate failed: ${msg}`);
          throw e;
        }
      }
    : undefined;

  // "🔍 AI Auto-match" — picks the best existing photo from the Media
  // Library via an LLM. Separate path from AI generation (no new image,
  // reuses uploaded assets). Fastest option when the library already has
  // enough photos — single Gemini Flash call, 5–10s.
  const onAutoMatch = pageId && sectionId && autoMatch
    ? async (): Promise<string> => {
        showToast('info', '🔍 Auto-matching… evaluating Media Library (5-10s)');
        try {
          const { url, reason } = await autoMatch({ pageId, sectionId, itemIndex });
          showToast('success', `🔍 Matched — ${reason || 'best fit applied'}`);
          return url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          showToast('error', `Auto-match failed: ${msg}`);
          throw e;
        }
      }
    : undefined;

  return (
    <>
      <ImageField
        value={value}
        onChange={(next) => {
          onChange(next);
          // Confirm the value actually landed — without this, operators
          // who hit "AI 자동" wonder whether their click did anything
          // since the thumbnail swap is silent. Toast also doubles as
          // the "where did the new image go?" anchor in the corner.
          if (next && next !== value) {
            showToast('success', 'Image applied — saving…');
          }
        }}
        onUpload={wrappedUpload}
        onGenerate={wrappedGenerate}
        onAutoGenerate={onAutoGenerate}
        onAutoMatch={onAutoMatch}
        onPickFromLibrary={openPicker}
        variant={variant}
        defaultMode={defaultMode}
      />
      {pickerOpen && (
        <MediaPicker
          onClose={() => settlePicker(null)}
          onSelect={(item) => settlePicker(item.url)}
          preferredRatio={preferredRatio}
          preferredKind={preferredKind}
        />
      )}
    </>
  );
}

/**
 * Best-effort label for the HTML tag the storefront renders for a given
 * (blockType, path) pair. Surfaced in the Inspector header so the operator
 * can see "this element renders as <h1>" instead of guessing whether the
 * theme's H1 / H2 / paragraph rules will apply. Heuristic — covers the
 * 90% case (title→h1/h2 by block, button→a, image→img); uncovered paths
 * return null and the header just shows the path.
 */
function describeRenderedTag(blockType: string, path: string): string | null {
  // Friendly label per field. The HTML tag prefix (<h1>, <dd>, <p>) was
  // exposed briefly but operators asked "what is <dd>?" — that's an
  // implementation detail, not a label they need.
  const itemMatch = path.match(/^items\[\d+\]\.(.+)$/);
  const field = itemMatch ? itemMatch[1] : path;
  const isItem = itemMatch !== null;

  // Title disambiguates by position:
  //   - top-level title on a hero block   → Headline (<h1>)
  //   - top-level title on any other block → Section Title (<h2>)
  //   - items[N].title on a card-grid     → Card Title (<h3>/<h4>)
  const heroLikeBlocks = new Set(['hero_banner', 'hero_full_width', 'call_to_action', 'hero_split']);
  if (field === 'title') {
    if (isItem) return 'Card Title';
    return heroLikeBlocks.has(blockType) ? 'Headline' : 'Section Title';
  }
  if (field === 'subtitle' || field === 'description' || field === 'content') {
    return isItem ? 'Card Body' : 'Body';
  }
  if (field === 'quote') return 'Quote';
  if (field === 'question') return 'Accordion Question';
  if (field === 'answer') return 'Accordion Answer';
  if (field === 'buttonText' || field === 'secondaryButtonText') return 'CTA Button';
  if (field === 'imageUrl' || field === 'photoUrl' || field === 'avatarUrl' || field === 'logoUrl') return 'Image';
  if (field === 'backgroundImageUrl') return 'Background Image';
  if (field === 'name') return 'Card Title';
  if (field === 'role' || field === 'company') return 'Supporting Text';
  if (field === 'value') return 'Featured Number';
  if (field === 'label') return 'Label';
  if (field === 'price') return 'Price';
  if (field === 'period') return 'Period';
  if (field === 'eyebrow') return 'Eyebrow';
  if (field === 'caption') return 'Caption';
  return null;
}

/**
 * Look up the ElementSpec for a path-style elementKey (e.g. 'title',
 * 'buttonText') by scanning every section in the registry. Returns null
 * when no match — caller should fall back to findItemSpecByPath or the
 * full-block view.
 */
function findSpecByPath(
  registry: BlockElementRegistry | undefined,
  path: string,
): { sectionTitle: string; spec: ElementSpec } | null {
  if (!registry) return null;
  for (const sec of registry.sections) {
    const spec = sec.elements.find((el) => el.path === path);
    if (spec) return { sectionTitle: sec.title, spec };
  }
  return null;
}

/**
 * Resolve `items[N].field` paths to a synthetic ElementSpec by reading
 * ITEM_FIELDS_BY_TYPE (the same metadata the items[] editor uses). Lets
 * focus mode work on per-item elements (e.g. clicking a single feature
 * card's title in FeaturesGrid) without requiring the registry to enumerate
 * every item field separately. Returns null for unknown blockTypes /
 * fields so the caller can fall back to full view.
 */
function findItemSpecByPath(
  blockType: string,
  path: string,
): { sectionTitle: string; spec: ElementSpec } | null {
  const match = path.match(/^items\[(\d+)\]\.(.+)$/);
  if (!match) return null;
  const idx = Number(match[1]);
  const field = match[2]!;
  const itemFields = ITEM_FIELDS_BY_TYPE[blockType];
  if (!itemFields) return null;
  const fieldDef = itemFields.find((f) => f.key === field);
  if (!fieldDef) return null;
  return {
    sectionTitle: `Item #${idx + 1}`,
    spec: {
      label: fieldDef.label,
      path,
      kind: fieldDef.kind,
      // 'select' kind 인 경우 choices 도 통과시켜야 FieldControl 이
      // <select> 옵션을 그릴 수 있다.
      ...(fieldDef.kind === 'select' && fieldDef.choices ? { choices: fieldDef.choices } : {}),
    },
  };
}

/**
 * Inspector tab — Elementor-style segregation. Same data flows in;
 * the tabs only re-shuffle WHERE controls live so the operator's
 * mental model maps cleanly:
 *
 *   Content  — text content, link, HTML tag (the "what does this say")
 *   Style    — typography, color, alignment (the "how does this look")
 *   Advanced — spacing, position, container styling (the "where does
 *              this sit + box-model overrides")
 */
type InspectorTab = 'content' | 'style' | 'advanced';

/**
 * Bucket a registry section into a tab by inspecting its title.
 * Heuristic — covers the section titles every block in
 * element-registry.ts uses today. Falls back to 'content' so an
 * unrecognised section never disappears from the panel.
 */
function classifySection(title: string): InspectorTab {
  const t = title.toLowerCase();
  // Layout 은 Style 탭으로 흡수 — Elementor 의 Advanced 는 순수 spacing /
  // box-model 에만 쓰고, sizing / alignment / width 같은 시각 영향이
  // 큰 컨트롤은 Style 옆에 둔다는 운영자 합의 (Step d2).
  if (
    t.includes('design') || t.includes('style') ||
    t.includes('디자인') || t.includes('스타일') ||
    t.includes('layout') || t.includes('레이아웃')
  ) {
    return 'style';
  }
  if (
    t.includes('spacing') || t.includes('margin') || t.includes('padding') ||
    t.includes('border') || t.includes('css') ||
    t.includes('여백') || t.includes('외곽')
  ) {
    return 'advanced';
  }
  return 'content';
}

export function ElementInspector({
  pageId, sections, sectionId, elementKey, onClose, palette, onPropsChange, onStyleOverridesChange, pageKind,
}: ElementInspectorProps) {
  // Dynamic binding 가능한 context 목록 — 페이지 kind 가 템플릿일 때만.
  const dynamicContexts = useMemo<DynamicContext[]>(
    () => dynamicContextsForPageKind(pageKind),
    [pageKind],
  );
  // Operator-driven override: clicking "전체 보기" inside a focus pane
  // forces the full registry render even though the click target was a
  // specific element. Resets whenever the operator picks a different
  // section/element so the next click respects its natural focus.
  const [forceFull, setForceFull] = useState(false);
  // Tabs (Content / Style / Advanced) — Elementor-style segregation.
  // Resets to 'content' on focus change so operators always land on the
  // most-likely-needed surface first.
  const [activeTab, setActiveTab] = useState<InspectorTab>('content');
  useEffect(() => {
    setForceFull(false);
    setActiveTab('content');
  }, [sectionId, elementKey]);
  const section = sections.find((s) => s.id === sectionId);
  const updateDraftMut = useUpdateSectionDraft();

  // Local props mirror so each keystroke doesn't fire a server request.
  // The reducer commits debounced (300 ms after the last edit) so a
  // burst of typing collapses into a single PATCH. Slider drags benefit
  // most from this; text inputs work either way.
  const initialProps = useMemo(
    () => ({ ...((section?.props ?? {}) as Record<string, unknown>) }),
    [section?.props],
  );
  const [draft, setDraft] = useState<Record<string, unknown>>(initialProps);
  // Cleanup 클로저에서 최신 draft 를 잡기 위한 ref — 매 렌더 갱신.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const commitTimerRef = useRef<number | null>(null);

  // 편집 흐름 — keystroke 는 setDraft 로 controlled input 유지, 300ms
  // debounce 후 server PATCH. onPropsChange 가 있으면 (PageBuilder 가
  // owner='page'/'catalog' 에 맞는 mutation 을 라우팅) 그쪽으로, 없으면
  // legacy useUpdateSectionDraft 경로. catalog 모드를 깨뜨리지 않도록
  // onPropsChange 에도 동일 debounce 적용 — 2026-05-27 catalog cover
  // 이미지 캔버스 반영 안 됨 버그 fix.
  const queueCommit = (next: Record<string, unknown>) => {
    setDraft(next);
    // Auto-save removed: commit straight to the parent's LOCAL state so the
    // in-process canvas reflects the edit INSTANTLY (no 300ms debounce — that
    // debounce existed only to batch the now-deleted server PUTs, and it was
    // making typography/style edits look like they "didn't apply"). The parent
    // (PageBuilder) holds the change in `dirty` until 저장/게시.
    if (onPropsChange) onPropsChange(sectionId, next);
    else updateDraftMut.mutate({ pageId, sectionId, props: next });
  };

  // Section / element 전환 시 draft reset + 미저장 변경 즉시 flush.
  useEffect(() => {
    setDraft(initialProps);
    return () => {
      if (commitTimerRef.current) {
        window.clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
        if (onPropsChange) onPropsChange(sectionId, draftRef.current);
        else updateDraftMut.mutate({ pageId, sectionId, props: draftRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, elementKey]);

  // Section-level BlockStyle draft — props 패턴과 동일.
  const initialStyleOverrides = useMemo<BlockStyle | null>(
    () => ((section?.props?.blockStyle as BlockStyle | null | undefined) ?? null),
    [section?.props],
  );
  const [styleDraft, setStyleDraft] = useState<BlockStyle | null>(initialStyleOverrides);
  const styleDraftRef = useRef(styleDraft);
  styleDraftRef.current = styleDraft;
  const styleCommitTimerRef = useRef<number | null>(null);
  const queueStyleCommit = (next: BlockStyle | null) => {
    setStyleDraft(next);
    // Immediate local commit (no debounce) — same rationale as queueCommit.
    if (onStyleOverridesChange) onStyleOverridesChange(sectionId, next);
    else {
      updateDraftMut.mutate({
        pageId,
        sectionId,
        props: { ...draftRef.current, blockStyle: next },
      });
    }
  };
  useEffect(() => {
    setStyleDraft(initialStyleOverrides);
    return () => {
      if (styleCommitTimerRef.current) {
        window.clearTimeout(styleCommitTimerRef.current);
        styleCommitTimerRef.current = null;
        if (onStyleOverridesChange) onStyleOverridesChange(sectionId, styleDraftRef.current);
        else {
          updateDraftMut.mutate({
            pageId,
            sectionId,
            props: { ...draftRef.current, blockStyle: styleDraftRef.current },
          });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  if (!section) return null;
  const registry = ELEMENT_REGISTRY[section.blockType];

  // Convert the tenant theme palette (key → hex map) to the array
  // shape ColorField expects. Order matches the canonical palette
  // sequence (primary first, etc.) so the popup is predictable.
  const PALETTE_ORDER = ['primary', 'secondary', 'accent', 'text', 'muted', 'background', 'surface', 'border'];
  const paletteList: Array<{ key: string; label?: string; hex: string }> | undefined = palette
    ? PALETTE_ORDER
        .filter((k) => palette[k])
        .map((k) => ({ key: k, hex: palette[k]! }))
        .concat(
          // Include any tenant-defined extras we don't know the order of.
          Object.entries(palette)
            .filter(([k]) => !PALETTE_ORDER.includes(k))
            .map(([k, hex]) => ({ key: k, hex })),
        )
    : undefined;

  const onChange = (path: string, value: unknown) => {
    queueCommit(setByPath(draft, path, value));
  };

  // Resolve focus: when the operator clicks a specific element AND it
  // maps to a known spec — either a header-level field on the registry,
  // or an items[N].field on ITEM_FIELDS_BY_TYPE — render only that one.
  // Otherwise (no match, or '__section__', or forceFull toggled) show
  // the full registry, preserving the previous behavior as a safe default.
  const realFocused = elementKey !== '__section__' && !forceFull
    ? findSpecByPath(registry, elementKey) ?? findItemSpecByPath(section.blockType, elementKey)
    : null;
  // registry 스펙이 없는 엘리먼트(제품 데이터 기반 title/price/sku/content 등)도
  // 기존 FocusedStyleSection 으로 폰트·색·여백을 조정할 수 있게 synthetic
  // 포커스로 폴백 (대표님 2026-05-28: "엘리먼트 스타일 컴포넌트 이미 있으니
  // 재사용"). Content 탭은 안내만, Style/Advanced 는 elementStyles[elementKey] 편집.
  const focused: { sectionTitle: string; spec: ElementSpec; synthetic?: boolean } | null =
    realFocused ??
    (elementKey !== '__section__' && !forceFull
      ? { sectionTitle: '스타일', spec: { label: elementKey, path: elementKey, kind: 'text' }, synthetic: true }
      : null);

  return (
    // Mobile (<lg): full-viewport overlay so the property form gets the
    // same width as a phone modal — the 320px sidebar otherwise sits next
    // to a now-tiny canvas. Desktop: 320px sticky right rail unchanged.
    <aside
      className="
        fixed inset-0 z-40 bg-white overflow-y-auto
        lg:static lg:inset-auto lg:z-auto lg:w-80 lg:shrink-0 lg:border-l lg:border-gray-200
      "
      style={{ minWidth: undefined }}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div>
          <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
            {section.blockType}
          </div>
          <div className="text-sm font-semibold text-gray-900 mt-0.5">
            Properties
            {elementKey !== '__section__' && (
              <span className="ml-1.5 text-xs text-blue-600 font-mono">{elementKey}</span>
            )}
          </div>
          {/* Render hint — tells the operator which HTML tag this element
              actually maps to so they can predict whether the theme's
              H1 / H2 / paragraph / button rules will apply. */}
          {elementKey !== '__section__' && (() => {
            const hint = describeRenderedTag(section.blockType, elementKey);
            return hint ? (
              <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>
            ) : null;
          })()}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      {!registry ? (
        <div className="p-4 text-sm text-gray-500">
          {section.blockType
            ? <>이 블록 유형(<code className="font-mono text-gray-700">{section.blockType}</code>)은 아직 인스펙터 편집을 지원하지 않습니다.</>
            : '이 섹션의 블록 유형을 불러오지 못했습니다. 페이지를 새로고침하거나 다른 섹션을 선택해 보세요.'}
        </div>
      ) : (
        <>
          {/* ─── Tabs (Content / Style / Advanced) ───────────────
              Sticky right under the header so the operator never
              has to scroll to switch tabs. Same affordance pattern
              as Elementor: pill icons + labels, active state filled. */}
          <nav className="flex border-b border-gray-200 bg-white sticky top-[64px] z-10">
            {(
              [
                { id: 'content', label: 'Content', icon: '✏️' },
                { id: 'style', label: 'Style', icon: '🎨' },
                { id: 'advanced', label: 'Advanced', icon: '⚙️' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-blue-500'
                    : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {focused ? (
            // Focus mode — operator clicked a specific element. Single
            // field on Content; per-element style overrides on Style;
            // Advanced shown only with the "전체 보기" out-toggle since
            // box-model controls are section-level, not element-level.
            <div className="p-4 space-y-4">
              <button
                type="button"
                onClick={() => setForceFull(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 -ml-1 px-1 py-0.5 rounded hover:bg-gray-50"
                title="Show all fields for this block"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Show all fields
              </button>

              {activeTab === 'content' && (
                focused.synthetic ? (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This element&apos;s text comes from content (product / data) automatically.
                    It isn&apos;t edited here — use the <strong>Style</strong> and <strong>Advanced</strong>{' '}
                    tabs to adjust font, color, and spacing.
                  </p>
                ) : (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {focused.sectionTitle}
                    </h3>
                    <FieldControl
                      spec={focused.spec}
                      value={getByPath(draft, focused.spec.path)}
                      onChange={(v) => onChange(focused.spec.path, v)}
                      palette={paletteList}
                      blockType={section.blockType}
                      pageId={pageId}
                      sectionId={sectionId}
                      propsBag={draft as Record<string, unknown>}
                      onPropsPatch={(patch) => queueCommit({ ...draft, ...patch })}
                      dynamicContexts={dynamicContexts}
                    />
                  </section>
                )
              )}

              {activeTab === 'style' &&
                (focused.spec.kind === 'text' || focused.spec.kind === 'html' || focused.spec.kind === 'image') && (
                  <FocusedStyleSection
                    sectionId={sectionId}
                    elementPath={focused.spec.path}
                    kind={focused.spec.kind}
                    draft={draft}
                    queueCommit={queueCommit}
                    palette={paletteList}
                  />
                )}

              {activeTab === 'style' &&
                !(focused.spec.kind === 'text' || focused.spec.kind === 'html' || focused.spec.kind === 'image') && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This field type ({focused.spec.kind}) does not support per-element style overrides.
                    Switch to "Show all fields" to edit section-level design options.
                  </p>
                )}

              {activeTab === 'advanced' && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Advanced (spacing · border · container style) is a section-level setting.
                  Click "Show all fields" above to switch to section scope, then edit there.
                </p>
              )}
            </div>
          ) : (
            // Full section mode — all registry fields, items editor,
            // and box-model controls. Sections are bucketed into tabs
            // by classifySection(); items go into Content; box-model
            // goes into Advanced.
            <div className="p-4 space-y-5">
              {registry.sections
                .filter((sec) => classifySection(sec.title) === activeTab)
                .map((sec, i) => (
                  <section key={`${activeTab}-${i}`}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {sec.title}
                    </h3>
                    <div className="space-y-3">
                      {sec.elements.map((el) => (
                        <FieldControl
                          key={el.path}
                          spec={el}
                          value={getByPath(draft, el.path)}
                          onChange={(v) => onChange(el.path, v)}
                          palette={paletteList}
                          blockType={section.blockType}
                          pageId={pageId}
                          sectionId={sectionId}
                          propsBag={draft as Record<string, unknown>}
                          onPropsPatch={(patch) => queueCommit({ ...draft, ...patch })}
                    dynamicContexts={dynamicContexts}
                        />
                      ))}
                    </div>
                  </section>
                ))}

              {/* Items editor lives on Content tab — operator-authored
                  data, same conceptual surface as the registry fields. */}
              {activeTab === 'content' && Array.isArray((draft as Record<string, unknown>).items) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Items ({((draft as Record<string, unknown>).items as unknown[]).length})
                  </h3>
                  <ItemsEditor
                    items={(draft as Record<string, unknown>).items as Record<string, unknown>[]}
                    blockType={section.blockType}
                    onChange={(items) => queueCommit({ ...draft, items })}
                    palette={paletteList}
                    pageId={pageId}
                    sectionId={sectionId}
                  />
                </section>
              )}

              {/* Section-level BlockStyle — typed padding / margin
                  controls that write to section.styleOverrides (NOT
                  props.containerStyle). BlockRenderer's wrapper merges
                  both with BlockStyle winning on conflict, so this is
                  the primary path for new section spacing edits. The
                  containerStyle BoxModelControls below stays for
                  back-compat with existing data + the free-form layout
                  toggles it carries (width preset, alignment). */}
              {activeTab === 'advanced' && (
                <section>
                  <BlockStyleInspector
                    value={styleDraft}
                    onChange={queueStyleCommit}
                  />
                </section>
              )}

              {/* Box-model controls live on Advanced — every block can
                  have its outer container styled (padding / margin /
                  border / background / max-width). BlockRenderer
                  applies these as inline CSS to a wrapping div. */}
              {activeTab === 'advanced' && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Container Style (Free-form)
                  </h3>
                  <BoxModelControls
                    container={(draft.containerStyle as Record<string, string>) ?? {}}
                    onChange={(next) => queueCommit({
                      ...draft,
                      containerStyle: Object.keys(next).length > 0 ? next : undefined,
                    })}
                  />
                </section>
              )}

              {/* Empty-state hint when Style tab has nothing — registry
                  carries the typed Align / Width / Height fields per block
                  (HERO_BANNER 'Layout' section, etc.) so no universal
                  LayoutControls fallback is needed. The old free-form
                  Position / Width preset duplicated those controls and
                  shipped a hero-shrinking flex bug, so it was removed. */}
              {activeTab === 'style' &&
                registry.sections.filter((s) => classifySection(s.title) === 'style').length === 0 && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    No design options for this block. Use the variant
                    selector on the Content tab to change the visual shape.
                  </p>
                )}
            </div>
          )}
        </>
      )}

      {updateDraftMut.isPending && (
        <div className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-100">
          Saving…
        </div>
      )}
    </aside>
  );
}

// ─── Field controls ───────────────────────────────────────────

/** Product picker — searchable list backed by useProducts(). Stores
 *  the product UUID (or '' to clear). Used by the catalog product-
 *  page block so the operator picks a product without copy-pasting
 *  UUIDs from the products admin. */
function ProductPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  // Fetch a large page once — tenants with thousands of products would
  // need server-side search, but for typical catalog sizes the list
  // fits easily in memory and instant filtering feels best.
  const { data, isLoading } = useProducts({ page: 1, perPage: 500 });
  const products = useMemo(() => {
    const raw = data as unknown;
    const arr = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)
          ? ((raw as { data: unknown[] }).data)
          : []);
    return arr as Array<{ id: string; title: string; sku?: string | null; slug?: string; images?: Array<{ url: string }> }>;
  }, [data]);

  const selected = products.find((p) => p.id === value) ?? null;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        (p.title ?? '').toLowerCase().includes(term) ||
        (p.sku ?? '').toLowerCase().includes(term) ||
        (p.slug ?? '').toLowerCase().includes(term),
    );
  }, [q, products]);

  return (
    <div>
      {selected ? (
        <div className="flex items-center gap-2 mb-2 p-2 rounded border border-gray-200 bg-gray-50">
          {selected.images?.[0]?.url && (
            <img
              src={selected.images[0].url}
              alt=""
              className="w-10 h-10 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {selected.title}
            </div>
            {selected.sku && (
              <div className="text-[11px] font-mono text-gray-400 truncate">
                SKU · {selected.sku}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-white"
            title="Clear product selection"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-400 mb-2">No product selected</div>
      )}

      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name · SKU · slug"
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
      />

      {open && (
        <div className="mt-1 max-h-56 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-3 text-xs text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-xs text-gray-400">No results</div>
          ) : (
            filtered.slice(0, 60).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                  setQ('');
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-blue-50 ${
                  value === p.id ? 'bg-blue-100' : ''
                }`}
              >
                {p.images?.[0]?.url ? (
                  <img
                    src={p.images[0].url}
                    alt=""
                    className="w-8 h-8 object-cover rounded shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">{p.title}</div>
                  {p.sku && (
                    <div className="text-[11px] font-mono text-gray-400 truncate">
                      {p.sku}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Searchable icon picker for kind='icon' fields. Stores the icon
 *  name string (or '' to clear). Grid is filtered by the curated
 *  keyword index in @dw-church/blocks. */
function IconField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ICON_NAMES;
    return ICON_NAMES.filter(
      (n) =>
        n.includes(term) ||
        (ICONS[n]?.keywords ?? []).some((k) => k.includes(term)),
    );
  }, [q]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons (e.g. delivery, cart, shield)"
          className="flex-1 min-w-0 text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-xs px-2 py-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
            title="Clear icon"
          >
            Clear
          </button>
        )}
      </div>
      {value && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 text-gray-700">
            {ICONS[value] ? <Icon name={value} size={20} /> : '?'}
          </span>
          <span className="font-mono">{value}</span>
        </div>
      )}
      <div className="grid grid-cols-6 gap-1 max-h-52 overflow-y-auto border border-gray-200 rounded p-2">
        {filtered.length === 0 ? (
          <p className="col-span-6 text-xs text-gray-400 py-4 text-center">
            No results
          </p>
        ) : (
          filtered.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={n}
              className={`flex items-center justify-center aspect-square rounded hover:bg-blue-50 text-gray-700 ${
                value === n ? 'bg-blue-100 ring-1 ring-blue-400' : ''
              }`}
            >
              <Icon name={n} size={20} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Application-form picker — searchable list backed by useApplicationForms().
 *  Stores the form SLUG (not id) since storefront blocks resolve by slug.
 *  운영자가 slug 를 외워서 타이핑하지 않도록 ProductPicker 패턴 그대로 — 검색
 *  + 카드 클릭으로 선택. '' = 선택 해제. */
function FormPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useApplicationForms();
  const forms = useMemo<ApplicationForm[]>(() => {
    const raw = data as unknown;
    if (Array.isArray(raw)) return raw as ApplicationForm[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)) {
      return (raw as { data: ApplicationForm[] }).data;
    }
    return [];
  }, [data]);

  const selected = forms.find((f) => f.slug === value) ?? null;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return forms;
    return forms.filter(
      (f) =>
        (f.name ?? '').toLowerCase().includes(term) ||
        (f.slug ?? '').toLowerCase().includes(term) ||
        (f.description ?? '').toLowerCase().includes(term),
    );
  }, [q, forms]);

  return (
    <div>
      {selected ? (
        <div className="flex items-center gap-2 mb-2 p-2 rounded border border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {selected.name}
              {!selected.isActive && (
                <span className="ml-1.5 text-[10px] font-normal text-amber-600">비활성</span>
              )}
            </div>
            <div className="text-[11px] font-mono text-gray-400 truncate">
              slug · {selected.slug}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-white"
            title="Clear form selection"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-400 mb-2">No form selected</div>
      )}

      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name · slug"
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
      />

      {open && (
        <div className="mt-1 max-h-56 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-3 text-xs text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-xs text-gray-400">
              No results — 신청서 양식 관리에서 먼저 양식을 생성하세요.
            </div>
          ) : (
            filtered.slice(0, 60).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange(f.slug ?? '');
                  setOpen(false);
                  setQ('');
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-blue-50 ${
                  value === f.slug ? 'bg-blue-100' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">
                    {f.name}
                    {!f.isActive && (
                      <span className="ml-1.5 text-[10px] font-normal text-amber-600">비활성</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 truncate">
                    {f.slug}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * catalog_product_gallery 전용 — product.images.slice(rangeStart, rangeStart+max)
 * 를 thumbnail grid 로 보여주고 운영자가 drag-and-drop 으로 순서 변경.
 * 저장 형식: product.images 의 인덱스 배열 (number[]).
 *
 * 운영자가 productId 를 안 골랐거나 product 가 fetch 실패하면 placeholder.
 * imageOrder 가 비어있으면 default (rangeStart 부터 차례) 를 보여주고, 변경
 * 시점에 onChange 가 인덱스 배열을 emit.
 */
function GalleryImageOrderField({
  value,
  onChange,
  propsBag,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  propsBag: Record<string, unknown>;
}) {
  const productId = (propsBag.productId as string) || '';
  const { data: product } = useProduct(productId);
  const rangeStart = typeof propsBag.rangeStart === 'number' ? (propsBag.rangeStart as number) : 1;
  const style = (propsBag.style as string) || 'editorial';
  const columnsRaw = propsBag.columns as string | undefined;
  const columns = columnsRaw === '3' ? 3 : 2;
  const rowsRaw = propsBag.rows as string | undefined;
  const rows = rowsRaw === '3' ? 3 : 2;
  const max = style === 'editorial' ? 8 : columns * rows;

  const allImages = ((product as { images?: Array<{ url: string; alt?: string }> } | undefined)?.images ?? []) as Array<{ url: string; alt?: string }>;

  // 운영자가 아직 순서 변경 안 했으면 default slice 의 인덱스. 변경했으면
  // value 그대로. 길이가 max 와 다를 수 있어도 (rangeStart 가 커서 나머지
  // 사진이 부족한 경우) display 만큼만.
  const defaultOrder = useMemo(() => {
    const end = Math.min(rangeStart + max, allImages.length);
    return Array.from({ length: Math.max(0, end - rangeStart) }, (_, i) => rangeStart + i);
  }, [rangeStart, max, allImages.length]);

  const order = value.length > 0 ? value : defaultOrder;
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  if (!productId) {
    return <p className="text-[11px] text-gray-400 italic">먼저 위에서 제품을 선택하세요.</p>;
  }
  if (allImages.length === 0) {
    return <p className="text-[11px] text-gray-400 italic">선택한 제품에 사진이 없습니다.</p>;
  }
  if (order.length === 0) {
    return <p className="text-[11px] text-gray-400 italic">Range Start ({rangeStart}) 부터의 사진이 없습니다.</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {order.map((imgIdx, slotIdx) => {
          const img = allImages[imgIdx];
          if (!img) return null;
          return (
            <div
              key={`${imgIdx}-${slotIdx}`}
              draggable
              onDragStart={() => setDragIdx(slotIdx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx === null || dragIdx === slotIdx) return;
                const next = order.slice();
                const [moved] = next.splice(dragIdx, 1);
                if (moved !== undefined) next.splice(slotIdx, 0, moved);
                setDragIdx(null);
                onChange(next);
              }}
              onDragEnd={() => setDragIdx(null)}
              className={`relative aspect-square rounded border bg-gray-100 cursor-grab active:cursor-grabbing overflow-hidden ${
                dragIdx === slotIdx ? 'opacity-40 ring-2 ring-blue-400' : 'border-gray-200'
              }`}
              title={`슬롯 ${slotIdx + 1} (원본 인덱스 ${imgIdx})`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover pointer-events-none" />
              <span className="absolute top-0.5 left-0.5 text-[9px] font-mono bg-black/60 text-white px-1 rounded">
                {slotIdx + 1}
              </span>
            </div>
          );
        })}
      </div>
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-[10px] text-gray-500 hover:text-gray-700 underline"
        >
          기본 순서로 되돌리기
        </button>
      )}
    </div>
  );
}

function FieldControl({
  spec, value, onChange, palette, blockType, pageId, sectionId,
  propsBag, onPropsPatch, dynamicContexts = [],
}: {
  spec: ElementSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  /** Resolved tenant palette (key → hex) for kind='color' fields. */
  palette?: Array<{ key: string; label?: string; hex: string }>;
  /** Section's block_type — drives AI image policy mode on image fields. */
  blockType?: string;
  /** Page + section ids — forwarded to ImageFieldAdapter so the
   *  "🔮 AI 자동" button knows which row the server should read. */
  pageId?: string;
  sectionId?: string;
  /** Multi-prop kinds (overlay / border) read several keys off the
   *  section props bag at once. Supplied by the section-level renderer;
   *  unused for single-path kinds. */
  propsBag?: Record<string, unknown>;
  /** Receives a multi-key patch to merge into the section props bag.
   *  Required for kind='overlay' / 'border'. */
  onPropsPatch?: (patch: Record<string, unknown>) => void;
  /** 현재 페이지의 kind 기반 dynamic contexts (product / post / catalog).
   *  비어있으면 ⚙ "Dynamic Source" 버튼 안 보임 (일반 페이지). */
  dynamicContexts?: DynamicContext[];
}) {
  // Dynamic Source picker open 상태 (text/image/url/html kind 만 적용).
  const [dynamicPickerOpen, setDynamicPickerOpen] = useState(false);
  const isDynamic = isDynamicRef(value);
  const dynamicKind =
    spec.kind === 'text' ? 'text'
    : spec.kind === 'html' ? 'html'
    : spec.kind === 'image' ? 'image'
    : spec.kind === 'url' ? 'url'
    : spec.kind === 'number' ? 'number'
    : null;
  const canBindDynamic = dynamicKind !== null && dynamicContexts.length > 0 && !spec.disableDynamic;
  // Multi-prop kinds — single source of overlay / border editing across
  // every section block. Bypass the LabeledField wrapper because the
  // inner OverlayField / BorderField already lay out their own labels,
  // and surface the panel as a CollapsibleGroup matching the Style tab's
  // visual rhythm (operator can fold the panel like in Elementor).
  // LayoutField — Height / Align / Background Width / Container Width
  // 한 패널. spec.layoutOpts 로 블록별 옵션 (enabledFields / heightChoices)
  // 전달. Storage 는 flat keys: height / textAlign / width / contentWidth.
  if (spec.kind === 'layout' && propsBag && onPropsPatch) {
    const adaptLayoutPatch = (patch: Partial<LayoutFieldValue>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      if ('height' in patch)       out.height = patch.height;
      if ('textAlign' in patch)    out.textAlign = patch.textAlign;
      if ('width' in patch)        out.width = patch.width;
      if ('contentWidth' in patch) out.contentWidth = patch.contentWidth;
      return out;
    };
    return (
      <CollapsibleGroup title={spec.label} defaultOpen>
        <LayoutField
          value={extractLayoutValue(propsBag)}
          onChange={(patch) => onPropsPatch(adaptLayoutPatch(patch))}
          enabledFields={spec.layoutOpts?.enabledFields}
          heightChoices={spec.layoutOpts?.heightChoices}
        />
      </CollapsibleGroup>
    );
  }

  // DesignField — Background Position + Section Background 한 패널.
  if (spec.kind === 'design' && propsBag && onPropsPatch) {
    const adaptDesignPatch = (patch: Partial<DesignFieldValue>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      if ('backgroundImagePosition' in patch) out.backgroundImagePosition = patch.backgroundImagePosition;
      if ('backgroundColor' in patch)         out.backgroundColor = patch.backgroundColor;
      return out;
    };
    return (
      <CollapsibleGroup title={spec.label} defaultOpen>
        <DesignField
          value={extractDesignValue(propsBag)}
          onChange={(patch) => onPropsPatch(adaptDesignPatch(patch))}
          palette={palette}
          enabledFields={spec.designOpts?.enabledFields}
          backgroundColorHint={spec.designOpts?.backgroundColorHint}
        />
      </CollapsibleGroup>
    );
  }

  // LinkButtonField — bundles Label + URL + new-tab into a single panel
  // so the operator sees a CTA button as one thing. spec.path doubles as
  // the storage prefix: 'button' → buttonText / buttonUrl / buttonNewTab,
  // 'secondaryButton' → secondaryButtonText / secondaryButtonUrl /
  // secondaryButtonNewTab. Each block reads the same flat keys, so we
  // didn't change persistence — only the inspector grouping.
  if (spec.kind === 'link-button' && propsBag && onPropsPatch) {
    const prefix = spec.path;
    const adaptLinkButtonPatch = (
      patch: Partial<LinkButtonFieldValue>,
    ): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      if ('label' in patch)  out[`${prefix}Text`]   = patch.label;
      if ('url' in patch)    out[`${prefix}Url`]    = patch.url;
      if ('newTab' in patch) out[`${prefix}NewTab`] = patch.newTab;
      return out;
    };
    return (
      <CollapsibleGroup title={spec.label} defaultOpen>
        <LinkButtonField
          value={extractLinkButtonValue(propsBag, prefix)}
          onChange={(patch) => onPropsPatch(adaptLinkButtonPatch(patch))}
          labelHint={spec.hint}
        />
      </CollapsibleGroup>
    );
  }

  if ((spec.kind === 'overlay' || spec.kind === 'border') && propsBag && onPropsPatch) {
    // OverlayField names its fields plainly (mode / color / opacity / …)
    // because conceptually it's an "overlay editor" — the field labels
    // shouldn't carry the `overlay` prefix. Storage on the section bag,
    // however, IS prefixed (`overlayMode` / `overlayColor` / …) so the
    // overlay props don't collide with sibling editors that share a
    // namespace (e.g. background `color`). Translate at the boundary.
    const adaptOverlayPatch = (patch: Partial<OverlayFieldValue>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      if ('mode' in patch)         out.overlayMode = patch.mode;
      if ('opacity' in patch)      out.overlayOpacity = patch.opacity;
      if ('color' in patch)        out.overlayColor = patch.color;
      if ('color1' in patch)       out.overlayColor1 = patch.color1;
      if ('location1' in patch)    out.overlayLocation1 = patch.location1;
      if ('color2' in patch)       out.overlayColor2 = patch.color2;
      if ('location2' in patch)    out.overlayLocation2 = patch.location2;
      if ('gradientType' in patch) out.overlayGradientType = patch.gradientType;
      if ('angle' in patch)        out.overlayAngle = patch.angle;
      return out;
    };
    return (
      <CollapsibleGroup title={spec.label} defaultOpen={false}>
        {spec.kind === 'overlay' ? (
          <OverlayField
            value={extractOverlayValue(propsBag)}
            onChange={(patch) => onPropsPatch(adaptOverlayPatch(patch))}
            palette={palette}
          />
        ) : (
          <BorderField
            value={extractBorderValue(propsBag)}
            onChange={(patch) => onPropsPatch(patch as Record<string, unknown>)}
            palette={palette}
          />
        )}
      </CollapsibleGroup>
    );
  }
  // 'groups' — schedule_split 의 props.groups 배열 repeater. 단일 path 이지만
  // 배열을 통째로 써야 해서 onPropsPatch({ [path]: nextGroups }) 로 커밋.
  // (CollapsibleGroup 으로 감싸 overlay/border/layout 패널과 동일한 리듬.)
  if (spec.kind === 'groups' && onPropsPatch) {
    const current = Array.isArray(value) ? (value as ScheduleGroup[]) : [];
    return (
      <CollapsibleGroup title={spec.label} defaultOpen>
        <ScheduleGroupsField
          value={current}
          onChange={(next) => onPropsPatch({ [spec.path]: next })}
        />
        {spec.hint && (
          <p className="mt-1.5 text-[10px] text-gray-500 leading-snug">{spec.hint}</p>
        )}
      </CollapsibleGroup>
    );
  }

  // value 가 DynamicRef 객체이면 — 일반 kind 분기 (input / select / ...)
  // 가 객체를 React child 로 렌더하다 #31 크래시. early-return 으로 chip
  // 만 표시 (대표님 2026-05-28 "프로퍼티 렌더 오류 #31 {path,context,
  // __dynamic__}" fix). canBindDynamic 무관하게 항상 chip — 운영자가 다른
  // 페이지로 옮겨 binding 이 무의미해진 경우라도 clear 가능하도록.
  if (isDynamic) {
    return (
      <LabeledField label={spec.label} hint={spec.hint}>
        <DynamicChip
          value={value as never}
          onOpen={() => { if (canBindDynamic) setDynamicPickerOpen(true); }}
          onClear={() => onChange('')}
        />
        {dynamicPickerOpen && canBindDynamic && dynamicKind && (
          <DynamicSourcePicker
            value={value}
            onChange={(next) => onChange(next)}
            fieldKind={dynamicKind}
            availableContexts={dynamicContexts}
            hint={spec.hint}
            onClose={() => setDynamicPickerOpen(false)}
          />
        )}
      </LabeledField>
    );
  }

  // Static 값 — 일반 kind 분기. dynamic-able field 면 ⚙ 버튼 노출.
  const dynamicUI = canBindDynamic ? (
    <div className="flex items-center justify-end gap-1 -mt-1 mb-1">
      <button
        type="button"
        onClick={() => setDynamicPickerOpen(true)}
        title="Dynamic Source binding 추가"
        className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition"
      >
        ⚙ Dynamic
      </button>
    </div>
  ) : null;

  return (
    <LabeledField label={spec.label} hint={spec.hint}>
      {dynamicUI}
      {dynamicPickerOpen && dynamicKind && (
        <DynamicSourcePicker
          value={value}
          onChange={(next) => onChange(next)}
          fieldKind={dynamicKind}
          availableContexts={dynamicContexts}
          hint={spec.hint}
          onClose={() => setDynamicPickerOpen(false)}
        />
      )}
      {spec.kind === 'text' && (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
        />
      )}
      {spec.kind === 'html' && (
        // RichEditor is uncontrolled re: contentEditable DOM — once mounted it
        // owns its innerHTML. We key on spec.path so switching to a different
        // 'html' field (e.g. quote → content) remounts the editor with that
        // field's value; otherwise the previous element's HTML would linger.
        <RichEditor
          key={spec.path}
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
          placeholder={spec.hint || 'Enter content…'}
          minHeight="140px"
        />
      )}
      {spec.kind === 'image' && (
        <ImageFieldAdapter
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
          variant={inferImageVariant(spec.path)}
          blockType={blockType}
          pageId={pageId}
          sectionId={sectionId}
          path={spec.path}
        />
      )}
      {spec.kind === 'icon' && (
        <IconField
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
        />
      )}
      {spec.kind === 'product' && (
        <ProductPicker
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
        />
      )}
      {spec.kind === 'form' && (
        <FormPicker
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
        />
      )}
      {spec.kind === 'gallery-image-order' && propsBag && (
        <GalleryImageOrderField
          value={Array.isArray(value) ? (value as number[]) : []}
          onChange={(next) => onChange(next)}
          propsBag={propsBag}
        />
      )}
      {spec.kind === 'url' && (
        <LinkField
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
        />
      )}
      {spec.kind === 'select' && spec.choices && (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
        >
          {spec.choices.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )}
      {spec.kind === 'bool' && (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4"
          />
          {spec.label}
        </label>
      )}
      {spec.kind === 'color' && (
        <ColorField
          value={(value as string) ?? ''}
          onChange={(next) => onChange(next)}
          palette={palette}
        />
      )}
      {spec.kind === 'number' && (
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
        />
      )}
    </LabeledField>
  );
}


// ─── Box-model controls (padding / margin / border / background) ───────

/**
 * Compact 4-axis (top/right/bottom/left) editor + a few extras
 * (background, border, max-width). Stores values as a plain
 * Record<string, string> on `props.containerStyle` — BlockRenderer
 * applies it as inline CSS to a wrapping div, so this works for every
 * block type without per-component support.
 *
 * Empty inputs clear that key from the store, keeping the persisted
 * blob lean and letting the storefront default kick back in cleanly.
 */
function BoxModelControls({
  container,
  onChange,
}: {
  container: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState(container);
  // External re-sync (different section selected, server echo).
  useEffect(() => setDraft(container), [container]);

  const set = (key: string, value: string) => {
    const next = { ...draft };
    if (value && value.trim()) next[key] = value.trim();
    else delete next[key];
    setDraft(next);
    onChange(next);
  };

  // Width / Height / Content Alignment helpers (setAlign + setWidthMode
  // + currentAlign) were removed alongside the duplicate UI — typed
  // Align / Height / Background Width fields on the per-block registry
  // (HERO_BANNER 'Layout' section, etc.) are now the only path. The
  // dropped free-form alignment buttons used display:flex which
  // collapsed section wrappers to content width (hero-shrinking bug).

  return (
    <div className="space-y-3">
      {/* Width / Height / Content Alignment moved to the per-block
          registry ('Layout' section of HERO_BANNER / CTA_SECTION, etc.).
          The free-form alignment buttons here used display:flex which
          collapsed section wrappers to content width — bug removed
          along with the duplicated UI. Only the spacing / border /
          background / shadow that registry doesn't cover remains. */}

      <SpacingField
        prefix="padding"
        values={draft}
        onChange={(next) => {
          setDraft(next);
          onChange(next);
        }}
      />
      <SpacingField
        prefix="margin"
        values={draft}
        onChange={(next) => {
          setDraft(next);
          onChange(next);
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <BoxField label="Background" placeholder="#fff / rgba(0,0,0,0.05)"
          value={draft.background ?? ''} onChange={(v) => set('background', v)} />
        <BoxField label="Max Width" placeholder="1200px / 100%"
          value={draft.maxWidth ?? ''} onChange={(v) => set('maxWidth', v)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <BoxField label="Border" placeholder="1px solid #e5e7eb"
          value={draft.border ?? ''} onChange={(v) => set('border', v)} />
        <BoxField label="Border Radius" placeholder="8px / 1rem"
          value={draft.borderRadius ?? ''} onChange={(v) => set('borderRadius', v)} />
      </div>

      <BoxField label="Box Shadow" placeholder="0 4px 12px rgba(0,0,0,0.08)"
        value={draft.boxShadow ?? ''} onChange={(v) => set('boxShadow', v)} />
    </div>
  );
}

function BoxField({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <LabeledField label={label}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
      />
    </LabeledField>
  );
}

// ─── Items[] editor ───────────────────────────────────────────

function ItemsEditor({
  items, blockType, onChange, palette, pageId, sectionId,
}: {
  items: Record<string, unknown>[];
  blockType: string;
  onChange: (items: Record<string, unknown>[]) => void;
  palette?: Array<{ key: string; label?: string; hex: string }>;
  /** Forwarded to per-item FieldControls so the "🔮 AI 자동" button
   *  in an item's image field can call the section-image endpoint
   *  with the right ids + itemIndex. */
  pageId?: string;
  sectionId?: string;
}) {
  const fields = ITEM_FIELDS_BY_TYPE[blockType];
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  if (!fields) {
    return (
      <p className="text-xs text-gray-500">
        Item editing is not supported for this block yet.
      </p>
    );
  }

  const updateItem = (idx: number, key: string, value: unknown) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
    onChange(next);
  };
  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    setOpenIdx((cur) => (cur === idx ? null : cur));
  };
  const addItem = () => {
    const blank: Record<string, unknown> = {};
    for (const f of fields) blank[f.key] = '';
    onChange([...items, blank]);
    setOpenIdx(items.length);
  };
  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    if (m) next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((it, idx) => {
        const isOpen = openIdx === idx;
        const summary =
          (it.title as string) ||
          (it.name as string) ||
          (it.question as string) ||
          (it.label as string) ||
          (it.text as string) ||
          (it.value as string) ||
          `Item ${idx + 1}`;
        return (
          <div key={idx} className="border border-gray-200 rounded">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="text-xs text-gray-400 font-mono shrink-0">#{idx + 1}</span>
              <span className="text-xs flex-1 truncate">{summary}</span>
              <span className="text-xs text-gray-400">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="px-2 pb-2 space-y-2 border-t border-gray-100">
                {fields.map((f) => (
                  <FieldControl
                    key={f.key}
                    // Synthesize the full dotted path so ImageFieldAdapter
                    // can extract the item index for the auto-generate
                    // endpoint (`items[3].imageUrl` → itemIndex=3).
                    spec={{ label: f.label, path: `items[${idx}].${f.key}`, kind: f.kind }}
                    value={it[f.key]}
                    onChange={(v) => updateItem(idx, f.key, v)}
                    palette={palette}
                    blockType={blockType}
                    pageId={pageId}
                    sectionId={sectionId}
                  />
                ))}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveItem(idx, idx - 1)} className="px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50" disabled={idx === 0}>↑</button>
                    <button type="button" onClick={() => moveItem(idx, idx + 1)} className="px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50" disabled={idx === items.length - 1}>↓</button>
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="px-2 py-0.5 text-red-600 hover:bg-red-50 rounded">Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addItem}
        className="w-full text-xs py-1.5 border border-dashed border-gray-300 rounded text-gray-600 hover:bg-gray-50 hover:border-gray-400"
      >
        + Add Item
      </button>
    </div>
  );
}

// ─── Per-element style overrides (Elementor / Kadence style panel) ──

/**
 * Six-control style panel for a single text/html element. Writes to the
 * shared `props.elementStyles[<path>]` blob that storefront blocks read
 * via mergeElementStyle from @dw-church/blocks. Empty/blank values omit
 * that key from the override so the storefront default kicks back in
 * without the operator having to "reset" anything explicitly.
 *
 * Color resolution mirrors element-styles.ts: hex / rgb / hsl / var()
 * pass through; bare names map to palette CSS vars (primary, accent,
 * text, muted, etc.) at render time.
 */
const PALETTE_KEYS = ['', 'primary', 'secondary', 'accent', 'text', 'muted', 'background', 'surface', 'border'] as const;
// FONT_WEIGHTS / typography preset list moved into TypographyTokenField —
// the inspector now hands the typography section over to the component
// in property-fields and just forwards the operator override blob.

/**
 * Wraps ElementStyleControls with the applied-style readout. Lives here
 * (instead of inline at the call site) so the useAppliedStyle hook
 * doesn't fire when the operator's in __section__ view — only the
 * focused element drives a DOM read. The hook's deps include the
 * current override blob so commits flow through to the readout
 * immediately without the operator re-clicking.
 */
function FocusedStyleSection({
  sectionId,
  elementPath,
  kind,
  draft,
  queueCommit,
  palette,
}: {
  sectionId: string;
  elementPath: string;
  kind: 'text' | 'html' | 'image';
  draft: Record<string, unknown>;
  queueCommit: (next: Record<string, unknown>) => void;
  /** Tenant palette swatches (key→hex) for the Global Colors popup. */
  palette?: Array<{ key: string; label?: string; hex: string }>;
}) {
  // Normal vs Hover state — reads/writes swap to a `:hover`-suffixed
  // key. Storefront BlockRenderer compiles those entries into a
  // [data-element]:hover stylesheet so the operator's hover overrides
  // actually apply. Default state is base ('normal').
  const [stateMode, setStateMode] = useState<'normal' | 'hover'>('normal');
  // Reset to normal when the focused element changes.
  useEffect(() => setStateMode('normal'), [sectionId, elementPath]);

  const elementStyles = (draft.elementStyles as Record<string, ElementStyle | undefined> | undefined) ?? {};
  const targetKey = stateMode === 'hover' ? `${elementPath}:hover` : elementPath;
  const overrideValue = elementStyles[targetKey] ?? {};
  // Applied (computed) style read from the live preview is base-state
  // only — :hover values aren't reflected by getComputedStyle on a
  // non-hovered element. Hover panel uses empty placeholders since
  // there's no useful baseline to show.
  // Dep is the SERIALIZED override (not the fresh `{}` ref) so useAppliedStyle
  // re-reads the DOM only when the override actually changes — otherwise it
  // re-ran + setApplied on every render, churning the inspector.
  const overrideKey = JSON.stringify(overrideValue);
  const applied = useAppliedStyle(sectionId, elementPath, [overrideKey]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Style
        </h3>
        {/* Normal / Hover state toggle — operator-controlled. Hover
            mode writes to `${path}:hover` so the storefront stylesheet
            picks it up; Normal writes to the unsuffixed key (base). */}
        <div className="inline-flex rounded border border-gray-200 overflow-hidden text-[11px]">
          {(['normal', 'hover'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateMode(s)}
              className={`px-2 py-0.5 transition-colors ${
                stateMode === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'normal' ? 'Normal' : 'Hover'}
            </button>
          ))}
        </div>
      </div>
      <ElementStyleControls
        kind={kind}
        value={overrideValue}
        applied={stateMode === 'normal' ? applied ?? undefined : undefined}
        palette={palette}
        onChange={(next) => {
          const merged: Record<string, ElementStyle | undefined> = { ...elementStyles };
          const hasAny = Object.values(next).some((v) => v != null && String(v).trim());
          if (hasAny) merged[targetKey] = next;
          else delete merged[targetKey];
          const nextStyles = Object.keys(merged).length > 0 ? merged : undefined;
          queueCommit({ ...draft, elementStyles: nextStyles });
        }}
      />
      {stateMode === 'hover' && (
        <p className="mt-2 text-[10px] text-gray-500 leading-relaxed">
          Values entered here apply only on hover. Unset fields fall through to the Normal state.
        </p>
      )}
    </section>
  );
}

function ElementStyleControls({
  value,
  onChange,
  kind,
  applied,
  palette,
}: {
  value: ElementStyle;
  onChange: (next: ElementStyle) => void;
  kind?: 'text' | 'html' | 'image';
  applied?: AppliedStyle;
  palette?: Array<{ key: string; label?: string; hex: string }>;
}) {
  const [draft, setDraft] = useState<ElementStyle>(value);
  // Sync from the parent ONLY when the override CONTENT changes — not on every
  // render. `value` is `elementStyles[key] ?? {}`, a fresh object ref each
  // render, so a plain `[value]` dep reset the local draft on unrelated
  // re-renders (useAppliedStyle's retries, canvas updates) and could wipe an
  // in-progress edit. Compare serialized content instead.
  const valueKey = JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(value), [valueKey]);

  const set = <K extends keyof ElementStyle>(key: K, v: ElementStyle[K] | undefined) => {
    const next: ElementStyle = { ...draft };
    if (v == null || (typeof v === 'string' && !v.trim())) delete next[key];
    else next[key] = v;
    setDraft(next);
    onChange(next);
  };
  // Multi-key patch — typography preset 같이 여러 속성을 한 번에 박을 때
  // set() 을 4번 연속 호출하면 closure 의 draft 가 stale 이라 마지막
  // 호출만 적용되는 버그가 있었음. setMany 는 한 next 객체에 patch 를
  // 머지해서 setDraft + onChange 1회만 발화 → atomic.
  const setMany = (patch: Partial<ElementStyle>) => {
    const next: ElementStyle = { ...draft };
    for (const [k, v] of Object.entries(patch)) {
      const key = k as keyof ElementStyle;
      if (v == null || (typeof v === 'string' && !v.trim())) delete next[key];
      else (next as Record<string, unknown>)[k] = v;
    }
    setDraft(next);
    onChange(next);
  };

  if (kind === 'image') return <ImageStyleControls draft={draft} set={set} />;
  return <TextStyleControls draft={draft} set={set} setMany={setMany} applied={applied} palette={palette} />;
}

function TextStyleControls({
  draft,
  set,
  setMany,
  applied,
  palette,
}: {
  draft: ElementStyle;
  set: <K extends keyof ElementStyle>(key: K, v: ElementStyle[K] | undefined) => void;
  setMany: (patch: Partial<ElementStyle>) => void;
  applied?: AppliedStyle;
  palette?: Array<{ key: string; label?: string; hex: string }>;
}) {
  // Effective values — what the input/select shows. Override wins;
  // when no override is set we pull the browser-computed value from
  // `applied` so the operator literally sees what's rendering. Clearing
  // an input commits an empty override (set() drops the entry); the
  // next render falls back to applied again, so there's no "blank
  // state" to manage. Operator's stop-typing → effective-value re-fills.
  // Color override pass-through (could be 'primary' palette key, '#hex',
  // or 'var(--accent)'). When unset, show the resolved rgb-as-hex so
  // the picker swatch and the text field match.
  const effectiveColor = draft.color ?? (applied?.color ? rgbToHex(applied.color) : '');

  return (
    <div className="space-y-3">
      {/* Typography preset — Font Size + Weight + Letter Spacing + Line
          Height all bundled into TypographyTokenField. The component
          owns the token / Custom / Default mode derivation, the 4-field
          setMany patch, and the design-tokens preset list import. Adding
          a new typography scale requires schema + ui-labels edit only. */}
      <TypographyTokenField
        value={{
          fontSize: draft.fontSize,
          fontWeight: draft.fontWeight,
          letterSpacing: draft.letterSpacing,
          lineHeight: draft.lineHeight,
        }}
        applied={applied
          ? {
              fontSize: applied.fontSize,
              fontWeight: applied.fontWeight,
              letterSpacing: applied.letterSpacing,
              lineHeight: applied.lineHeight,
              defaultSize: applied.defaultSize,
            }
          : undefined}
        onChange={(patch) => setMany(patch)}
      />

      <LabeledField label="Color">
        <ColorField
          value={effectiveColor}
          onChange={(next) => set('color', next)}
          palette={palette}
          paletteKeys={
            palette && palette.length > 0
              ? undefined
              : (PALETTE_KEYS.filter((k) => k) as unknown as string[])
          }
        />
      </LabeledField>

      <LabeledField label="Align">
        <div className="inline-flex rounded border border-gray-300 overflow-hidden">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => set('textAlign', draft.textAlign === a ? undefined : a)}
              className={`px-3 py-1.5 text-xs ${draft.textAlign === a ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title={a === 'left' ? 'Left' : a === 'center' ? 'Center' : 'Right'}
            >
              {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
            </button>
          ))}
          {draft.textAlign && (
            <button
              type="button"
              onClick={() => set('textAlign', undefined)}
              className="px-2 py-1.5 text-xs bg-white text-gray-400 hover:text-gray-700 border-l border-gray-300"
              title="Reset alignment"
            >
              ✕
            </button>
          )}
        </div>
      </LabeledField>

      <SizeAndAlignControls draft={draft} set={set} />
      {/* Effects collapsible — operator-supplied raw CSS for shadow /
          blend / transform / opacity. Hidden so the common typography
          case isn't drowned by less-used inputs. */}
      <CollapsibleGroup title="Effects (Shadow · Blend · Opacity)">
        <LabeledField label="Text Shadow">
          <input
            type="text"
            value={draft.textShadow ?? ''}
            onChange={(e) => set('textShadow', e.target.value)}
            placeholder="2px 2px 6px rgba(0,0,0,0.3)"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
          />
        </LabeledField>
        <div className="grid grid-cols-2 gap-2">
          <LabeledField label="Opacity (0-1)">
            <input
              type="text"
              value={draft.opacity ?? ''}
              onChange={(e) => set('opacity', e.target.value)}
              placeholder="1"
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
            />
          </LabeledField>
          <LabeledField label="Blend Mode">
            <select
              value={draft.mixBlendMode ?? ''}
              onChange={(e) => set('mixBlendMode', e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
            >
              <option value="">Normal (default)</option>
              <option value="multiply">Multiply (darken)</option>
              <option value="screen">Screen (lighten)</option>
              <option value="overlay">Overlay</option>
              <option value="difference">Difference</option>
              <option value="exclusion">Exclusion</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
              <option value="hard-light">Hard Light</option>
              <option value="soft-light">Soft Light</option>
            </select>
          </LabeledField>
        </div>
        <LabeledField label="Transform">
          <input
            type="text"
            value={draft.transform ?? ''}
            onChange={(e) => set('transform', e.target.value)}
            placeholder="rotate(-2deg) / translateY(-4px)"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
          />
        </LabeledField>
        <LabeledField label="Background (highlight)">
          <input
            type="text"
            value={draft.background ?? ''}
            onChange={(e) => set('background', e.target.value)}
            placeholder="rgba(255,255,0,0.3) / linear-gradient(...)"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
          />
        </LabeledField>
      </CollapsibleGroup>
    </div>
  );
}

// ─── Shared size + horizontal-position controls ─────────────────────

/**
 * Width preset chips + horizontal position toggle, used inside both
 * the text-side and image-side FocusedStyleSection controls. Writes
 * to `maxWidth` (CSS value) and `marginInline` (CSS shorthand) on the
 * ElementStyle blob.
 *
 * Width presets seed maxWidth and switch marginInline to "auto" so
 * the constrained element stays centered by default — that's the
 * 95% case operators want. They can then override the horizontal
 * position via the toggle if they want left/right instead of center.
 *
 * Free-text input remains for non-preset values (e.g. "640px", "33%",
 * "50rem"). Clearing the input restores the default (no width cap,
 * no margin-inline override).
 */
const WIDTH_PRESETS: Array<{ label: string; value: string }> = [
  { label: '25%',  value: '25%' },
  { label: '50%',  value: '50%' },
  { label: '75%',  value: '75%' },
  { label: '100%', value: '100%' },
];

function SizeAndAlignControls({
  draft,
  set,
}: {
  draft: ElementStyle;
  set: <K extends keyof ElementStyle>(key: K, v: ElementStyle[K] | undefined) => void;
}) {
  const currentAlign: 'start' | 'center' | 'end' | undefined =
    draft.marginInline === 'auto' ? 'center'
    : draft.marginInline === 'auto 0' ? 'end'
    : draft.marginInline === '0 auto' ? 'start'
    : undefined;

  const setHorizAlign = (a: 'start' | 'center' | 'end' | 'clear') => {
    if (a === 'clear') set('marginInline', undefined);
    else if (a === 'start') set('marginInline', '0 auto');
    else if (a === 'center') set('marginInline', 'auto');
    else set('marginInline', 'auto 0');
  };

  const applyPreset = (value: string) => {
    set('maxWidth', value);
    // Default to centered when applying a preset width — by far the
    // most common intent. Operator can switch to start/end below.
    if (!draft.marginInline) set('marginInline', 'auto');
  };

  return (
    <div className="space-y-3 rounded-md border border-gray-200 p-3">
      <p className="text-[11px] font-semibold text-gray-700">Size · Position</p>

      {/* Width presets — quick chips */}
      <LabeledField label="Width">
        <div className="grid grid-cols-4 gap-1">
          {WIDTH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              className={`text-[11px] py-1 rounded border ${
                draft.maxWidth === p.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </LabeledField>

      {/* Free-text width — accepts px/%/rem/vw etc. */}
      <LabeledField label="Custom">
        <input
          type="text"
          value={draft.maxWidth ?? ''}
          onChange={(e) => set('maxWidth', e.target.value || undefined)}
          placeholder="640px / 33% / 50rem"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
        />
      </LabeledField>

      {/* Horizontal position via margin-inline — only meaningful when
          width is constrained, but always shown so operators learn
          where to find it. */}
      <LabeledField label="Position">
        <div className="grid grid-cols-4 gap-1">
          {([
            { key: 'start',  label: 'Left' },
            { key: 'center', label: 'Center' },
            { key: 'end',    label: 'Right' },
          ] as const).map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setHorizAlign(b.key)}
              className={`text-[11px] py-1 rounded border ${
                currentAlign === b.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHorizAlign('clear')}
            className="text-[11px] py-1 rounded border bg-white border-gray-300 hover:bg-gray-50 text-gray-500"
            title="Reset to default"
          >
            Reset
          </button>
        </div>
      </LabeledField>
    </div>
  );
}

// ─── Image-side style controls ──────────────────────────────────────

const BORDER_RADIUS_PRESETS = ['', '0', '4px', '8px', '12px', '16px', '24px', '9999px'] as const;
const ASPECT_RATIO_PRESETS = ['', '1 / 1', '4 / 3', '3 / 4', '16 / 9', '9 / 16', '21 / 9'] as const;
const OBJECT_FIT_OPTIONS: Array<{ value: ElementStyle['objectFit'] | ''; label: string }> = [
  { value: '', label: 'Default' },
  { value: 'cover', label: 'Cover (fill, crop)' },
  { value: 'contain', label: 'Contain (fit inside)' },
  { value: 'fill', label: 'Fill (stretch)' },
  { value: 'none', label: 'None (no crop)' },
  { value: 'scale-down', label: 'Scale-down' },
];

/**
 * Visual controls for image elements — same elementStyles[path] surface
 * as TextStyleControls so the storefront merge does not care which
 * control set produced the values.
 */
function ImageStyleControls({
  draft,
  set,
}: {
  draft: ElementStyle;
  set: <K extends keyof ElementStyle>(key: K, v: ElementStyle[K] | undefined) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Border radius — text input + preset shortcuts (last = 9999px = pill) */}
      <LabeledField label="Border Radius">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={draft.borderRadius ?? ''}
            onChange={(e) => set('borderRadius', e.target.value)}
            placeholder="8px / 50%"
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
          />
          <select
            value={BORDER_RADIUS_PRESETS.includes((draft.borderRadius ?? '') as typeof BORDER_RADIUS_PRESETS[number]) ? (draft.borderRadius ?? '') : ''}
            onChange={(e) => set('borderRadius', e.target.value)}
            className="text-xs border border-gray-300 rounded px-1.5 py-1.5 bg-white"
            title="Preset"
          >
            {BORDER_RADIUS_PRESETS.map((p) => (
              <option key={p} value={p}>{p === '9999px' ? 'Pill' : p || '—'}</option>
            ))}
          </select>
        </div>
      </LabeledField>

      {/* Aspect ratio — common presets only; free text for the rest */}
      <LabeledField label="Aspect Ratio">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={draft.aspectRatio ?? ''}
            onChange={(e) => set('aspectRatio', e.target.value)}
            placeholder="16 / 9"
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
          />
          <select
            value={ASPECT_RATIO_PRESETS.includes((draft.aspectRatio ?? '') as typeof ASPECT_RATIO_PRESETS[number]) ? (draft.aspectRatio ?? '') : ''}
            onChange={(e) => set('aspectRatio', e.target.value)}
            className="text-xs border border-gray-300 rounded px-1.5 py-1.5 bg-white"
            title="Preset"
          >
            {ASPECT_RATIO_PRESETS.map((p) => (
              <option key={p} value={p}>{p || '—'}</option>
            ))}
          </select>
        </div>
      </LabeledField>

      <LabeledField label="Object Fit">
        <select
          value={draft.objectFit ?? ''}
          onChange={(e) => set('objectFit', (e.target.value as ElementStyle['objectFit']) || undefined)}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
        >
          {OBJECT_FIT_OPTIONS.map((o) => (
            <option key={o.value ?? ''} value={o.value ?? ''}>{o.label}</option>
          ))}
        </select>
      </LabeledField>

      {/* Opacity — slider + numeric. Stored as a string ('0.6') so it
          shares the ElementStyle plumbing with the text-side string
          fields; getElementStyle passes it through to CSS as-is. */}
      <LabeledField label={`Opacity ${draft.opacity ? `· ${Math.round(parseFloat(draft.opacity) * 100)}%` : ''}`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={draft.opacity ? parseFloat(draft.opacity) : 1}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            // 1.0 = default, drop the override so the operator sees a clean reset.
            set('opacity', v === 1 ? undefined : v.toFixed(2));
          }}
          className="w-full"
        />
      </LabeledField>

      {/* Size + horizontal position — shared component. */}
      <SizeAndAlignControls draft={draft} set={set} />

      <LabeledField label="Max Height">
        <input
          type="text"
          value={draft.maxHeight ?? ''}
          onChange={(e) => set('maxHeight', e.target.value || undefined)}
          placeholder="480px / 60vh"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
        />
      </LabeledField>

      <CollapsibleGroup title="Effects (Shadow · Blend · Transform)">
        <LabeledField label="Box Shadow">
          <input
            type="text"
            value={draft.boxShadow ?? ''}
            onChange={(e) => set('boxShadow', e.target.value)}
            placeholder="0 4px 12px rgba(0,0,0,0.15)"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
          />
        </LabeledField>
        <LabeledField label="Blend Mode">
          <select
            value={draft.mixBlendMode ?? ''}
            onChange={(e) => set('mixBlendMode', e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
          >
            <option value="">Normal (default)</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="difference">Difference</option>
            <option value="luminosity">Luminosity</option>
          </select>
        </LabeledField>
        <LabeledField label="Transform">
          <input
            type="text"
            value={draft.transform ?? ''}
            onChange={(e) => set('transform', e.target.value)}
            placeholder="rotate(-2deg) / scale(1.05)"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono placeholder:text-gray-400"
          />
        </LabeledField>
      </CollapsibleGroup>
    </div>
  );
}
