/**
 * Maps a PlannerWizard-generated section spec → a b2bsmart block_type + props.
 *
 * Input shape (from apps/agents /api/planner/page-content + content-map):
 *   {
 *     sectionType?: "hero" | "features" | "cta" | "about" | "gallery" | ...,
 *     gutenbergPattern?: "hero-section" | "features-grid" | ...,
 *     title?, subtitle?, description?, content?,
 *     buttonText?, buttonUrl?, imageUrl?,
 *     items?: Array<{ title?, description?, name?, role?, quote?, author?, price?, question?, answer?, ... }>
 *   }
 *
 * Output shape: matches one of apps/server/src/modules/pages/block-schemas.ts
 * entries. We only emit block_types whose schemas are registered there;
 * unknown patterns fall through to text_only with a best-effort
 * description so admins can polish the section in the page editor.
 */

// LLM responses use null in place of empty strings, so each optional field
// accepts undefined (absent) or null (explicit empty). All consumers use
// optional chaining, so both shapes collapse to "" via the ?? '' fallbacks.
export interface SectionSpec {
  sectionType?: string | null;
  gutenbergPattern?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  content?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  imageUrl?: string | null;
  items?: Array<Record<string, unknown>> | null;
  [k: string]: unknown;
}

export interface MappedBlock {
  blockType: string;
  props: Record<string, unknown>;
}

/**
 * Pick the modern-design knobs the AI now emits (eyebrow / bgMode /
 * ctaShape) and pass them through as block props. These don't change
 * the block_type — they tweak how the block renders within its variant.
 * `variant` is intentionally NOT included here because heroes compute
 * their variant from sectionType; features-specific variant gets merged
 * inside the features case where it's meaningful.
 */
function commonExtras(spec: SectionSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof spec.eyebrow === 'string' && spec.eyebrow.trim()) out.eyebrow = spec.eyebrow.trim();
  if (typeof spec.bgMode === 'string' && spec.bgMode.trim()) out.bgMode = spec.bgMode.trim();
  if (typeof spec.ctaShape === 'string' && spec.ctaShape.trim()) out.ctaShape = spec.ctaShape.trim();
  return out;
}

/**
 * Resolve a single section spec to a single block.
 *
 * Returns null if the spec is unusable (no content). Multi-block patterns
 * (e.g. an entire pricing table emitted as one block) are intentionally
 * collapsed into one block_type — admins can split them later.
 */
/**
 * Resolve a dw-church content-module section to its data/static block_type.
 *
 * Returns null when `key` isn't a church section type, so the caller falls
 * through to the generic mapper. Keys accept both the planner pattern
 * (gutenbergPattern, e.g. "recent-sermons" from SECTION_TO_PATTERN) and the
 * raw sectionType the copywriter wrote (e.g. "sermons") — both forms are
 * registered here so a mapping gap can't silently drop a church section to
 * text_only.
 *
 * DATA blocks (recent_sermons / recent_bulletins / recent_columns /
 * video_board / album_gallery / staff_grid / event_grid / history_timeline /
 * schedule_board / board) carry only DISPLAY config (title / limit / variant /
 * category / boardSlug). Their items come from /api/v1/{resource} at render
 * time — the AI never authors them, so we don't read spec.items here.
 *
 * STATIC church blocks (pastor_message / worship_schedule / newcomer_info)
 * DO carry AI-authored copy, so we forward title/subtitle/description/button.
 */
function mapChurchBlock(
  key: string,
  spec: SectionSpec,
  parts: { title: string; subtitle: string; description: string; button: string },
): MappedBlock | null {
  const { title, subtitle, description, button } = parts;
  // A church data block whose grid columns the AI hinted via `variant`
  // (grid-2/grid-3/grid-4/list) — whitelisted so a typo can't break render.
  const VALID_GRID = new Set(['grid-2', 'grid-3', 'grid-4', 'list', 'masonry']);
  const gridVariant = (fallback: string): string =>
    typeof spec.variant === 'string' && VALID_GRID.has(spec.variant) ? spec.variant : fallback;
  const limitOf = (fallback: number): number => {
    const n = Number((spec as Record<string, unknown>).limit);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };

  switch (key) {
    case 'recent-sermons':
    case 'sermons':
      return { blockType: 'recent_sermons', props: { title, limit: limitOf(6), variant: gridVariant('grid-3') } };

    case 'recent-bulletins':
    case 'bulletins':
      return { blockType: 'recent_bulletins', props: { title, limit: limitOf(12), variant: gridVariant('grid-4') } };

    case 'recent-columns':
    case 'columns':
      return { blockType: 'recent_columns', props: { title, limit: limitOf(6), variant: gridVariant('grid-3') } };

    case 'video-board':
    case 'videos':
      return {
        blockType: 'video_board',
        props: {
          title,
          // category is optional — empty string means "all videos".
          category: typeof spec.category === 'string' ? spec.category : '',
          limit: limitOf(6),
          variant: gridVariant('grid-3'),
        },
      };

    case 'album-gallery':
    case 'albums':
      return { blockType: 'album_gallery', props: { title, limit: limitOf(6), variant: gridVariant('grid-3') } };

    case 'staff-grid':
    case 'clergy':
    case 'pastors':
      return { blockType: 'staff_grid', props: { title, limit: limitOf(8) } };

    case 'event-grid':
    case 'events':
      return { blockType: 'event_grid', props: { title, limit: limitOf(6), variant: gridVariant('grid-3') } };

    case 'history-timeline':
    case 'history':
      return { blockType: 'history_timeline', props: { title } };

    case 'schedule-board':
    case 'worship-schedule':
    case 'schedule':
      return {
        blockType: 'schedule_board',
        props: {
          title,
          // imagePosition left/right/none; default left. The schedule rows
          // themselves come from /api/v1/schedules (operator-managed groups).
          imagePosition:
            spec.imagePosition === 'right' || spec.imagePosition === 'none'
              ? spec.imagePosition
              : 'left',
        },
      };

    case 'board':
    case 'notices':
      return {
        blockType: 'board',
        props: {
          title,
          // boardSlug defaults to 'notices' (the standard 공지사항 board);
          // the AI can target another board the operator created.
          boardSlug: typeof spec.boardSlug === 'string' && spec.boardSlug.trim() ? spec.boardSlug.trim() : 'notices',
          limit: limitOf(10),
        },
      };

    // ── Static church blocks (AI authors the copy) ──
    case 'pastor-message':
    case 'greeting':
      // Refuse an empty greeting — same no-placeholder rule as hero/cta.
      if (!title && !description) return null;
      return {
        blockType: 'pastor_message',
        props: {
          title,
          pastorName: typeof spec.pastorName === 'string' ? spec.pastorName : '',
          message: description,
          imageUrl: spec.imageUrl ?? '',
        },
      };

    case 'newcomer-info':
    case 'newcomer':
    case 'new-family':
      if (!title) return null;
      return {
        blockType: 'newcomer_info',
        props: {
          title,
          subtitle: subtitle || '',
          description: description || '',
          buttonText: button || '',
          buttonUrl: spec.buttonUrl ?? '',
        },
      };

    case 'giving-info':
    case 'giving':
    case 'donation':
      // 헌금 안내 — giving INFO (not payment). AI writes title + intro; the
      // operator fills the Zelle/bank/mailing fields after.
      if (!title) return null;
      return {
        blockType: 'giving_info',
        props: {
          title,
          intro: description || '',
        },
      };

    default:
      return null;
  }
}

export function mapSectionToBlock(spec: SectionSpec): MappedBlock | null {
  const key = (spec.gutenbergPattern || spec.sectionType || '').toLowerCase();
  const title = spec.title?.trim() ?? '';
  const subtitle = spec.subtitle?.trim() ?? '';
  const description = spec.description?.trim() ?? spec.content?.trim() ?? '';
  const button = spec.buttonText?.trim() ?? '';

  // ── Church content blocks (dw-church) ──
  // These are DB-driven data blocks (설교/주보/칼럼/영상/앨범/교역자/연혁/
  // 행사/예배·모임/게시판). The planner emits them with just a section
  // title/eyebrow — the items are pulled from /api/v1/{resource} at render
  // time. They're resolved BEFORE the empty-content guard below because a
  // data block with only a title is still a valid, renderable section (the
  // generic guard would otherwise drop it for having no items/description).
  const church = mapChurchBlock(key, spec, { title, subtitle, description, button });
  if (church) return church;

  // Empty section — skip.
  if (!title && !subtitle && !description && !button && !(spec.items?.length)) {
    return null;
  }

  // Hero blocks — every "hero-ish" sectionType lands here and becomes a
  // hero_banner row with the right `variant` prop set so the renderer
  // (apps/web/components/blocks/HeroBannerBlock.tsx) picks the matching
  // sub-component:
  //
  //   hero / hero-section / cover / banner → image-overlay (full bleed bg)
  //   hero-split                            → split-image  (50/50 text+image)
  //   hero-text                             → text-only when no image, else split
  //   page-hero                             → page-hero    (compact sub-page strip)
  //
  // form-split and map-split are coming in a later phase — for now if the
  // LLM emits hero-form / hero-map we degrade to page-hero so the page
  // still has a sensible hero header.
  const HERO_KEYS = new Set([
    'hero',
    'hero-section',
    'hero-split',
    'hero-text',
    'page-hero',
    'cover',
    'banner',
    'hero-form', // future variant — degrade to page-hero for now
    'hero-map',  // future variant — degrade to page-hero for now
  ]);
  if (HERO_KEYS.has(key)) {
    const variant: 'image-overlay' | 'split-image' | 'page-hero' | 'text-only' =
      key === 'page-hero' || key === 'hero-form' || key === 'hero-map'
        ? 'page-hero'
        : key === 'hero-split'
          ? 'split-image'
          : key === 'hero-text' && !spec.imageUrl
            ? 'text-only'
            : key === 'hero-text'
              ? 'split-image'
              : 'image-overlay';

    const heightByVariant: Record<typeof variant, 'sm' | 'md' | 'lg' | 'full'> = {
      'page-hero':     'sm',
      'split-image':   'md',
      'text-only':     'md',
      'image-overlay': 'lg',
    };
    const height = heightByVariant[variant];
    const width: 'contained' | 'full-bleed' =
      variant === 'split-image' ? 'contained' : 'full-bleed';

    // Hero's `bgMode` prop on the block uses 'image'/'gradient' values
    // (different domain than the section-level 'subtle'/'dark'/'accent'
    // we forward via commonExtras). Strip the section-level bgMode so
    // it doesn't collide with the hero's image/gradient mode.
    const { bgMode: _omitHeroBgMode, ...heroExtras } = commonExtras(spec);
    void _omitHeroBgMode;
    // If AI emitted a hero with an EMPTY title, that's a content
    // failure — drop the section and let the wizard surface it.
    // The previous default `'Welcome'` made every empty hero look
    // valid, so the operator never knew the LLM punted on this slot.
    if (!title) return null;
    return {
      blockType: 'hero_banner',
      props: {
        variant,
        title,
        subtitle: subtitle || '',
        description: variant === 'split-image' ? description : '',
        // image-overlay / page-hero use a full-bleed bg; split-image uses a
        // side image. text-only ignores both.
        backgroundImageUrl:
          variant === 'image-overlay' || variant === 'page-hero' ? (spec.imageUrl ?? '') : '',
        imageUrl: variant === 'split-image' ? (spec.imageUrl ?? '') : '',
        imageSide: 'right',
        buttonText: button,
        buttonUrl: spec.buttonUrl ?? '',
        width,
        // Keep `layout` filled too so any pre-v0.4 reader still works.
        layout: width === 'full-bleed' ? 'full' : 'contained',
        height,
        textAlign: variant === 'page-hero' ? 'left' : 'center',
        bgMode: variant === 'text-only' ? 'gradient' : 'image',
        ...heroExtras,
      },
    };
  }

  // CTA — dedicated cta_section block (packages/blocks/.../CtaSectionBlock).
  // Previous note about "no dedicated cta block" is stale — CtaSectionBlock
  // was added with 6 variants (inline-banner / boxed-card / image-overlay /
  // split-image / stats-strip / contact-info). Mapping to hero_banner was
  // the root cause of "every page ends with a hero banner instead of a CTA".
  if (key === 'cta-section' || key === 'cta') {
    const ctaExtras = commonExtras(spec);
    if (!title) return null;
    return {
      blockType: 'cta_section',
      props: {
        // Default variant — 'boxed-card' is the most universal CTA shape
        // (centered card, primary + secondary buttons, fits any page bottom).
        // AI can override via spec.variant when it wants the inline-banner
        // strip or the image-overlay hero-style CTA.
        variant: spec.variant || 'boxed-card',
        title,
        subtitle: subtitle || undefined,
        description: description || undefined,
        buttonText: button,
        buttonUrl: spec.buttonUrl ?? '',
        secondaryButtonText: spec.secondaryButtonText ?? undefined,
        secondaryButtonUrl: spec.secondaryButtonUrl ?? undefined,
        align: 'center',
        ...ctaExtras,
      },
    };
  }

  // Image gallery
  if (key === 'gallery' || key === 'gallery-showcase' || key === 'image-gallery') {
    const images = (spec.items ?? [])
      .map((it) => String(it.imageUrl ?? it.image ?? it.url ?? ''))
      .filter(Boolean);
    if (!title) return null;
    return {
      blockType: 'image_gallery',
      props: {
        title,
        images: images.length > 0 ? images : [],
      },
    };
  }

  // Contact (b2bsmart's contact_info pulls from settings, no props).
  if (key === 'contact' || key === 'contact-info') {
    return { blockType: 'contact_info', props: {} };
  }

  // Map / location.
  if (key === 'map' || key === 'location' || key === 'location-map') {
    return {
      blockType: 'location_map',
      props: { address: description || title, zoom: 15 },
    };
  }

  // Divider / spacer.
  if (key === 'divider' || key === 'spacer') {
    return { blockType: 'divider', props: { spacing: 'md' } };
  }

  // Video.
  if (key === 'video') {
    return {
      blockType: 'video',
      props: { title, youtubeUrl: spec.buttonUrl ?? '' },
    };
  }

  // Text + image (about, services-detail, anything two-column with imagery).
  if (key === 'about' || key === 'about-section' || key === 'text-image' || key === 'image-text' || key === 'media-text') {
    return {
      blockType: 'text_image',
      props: {
        title: title || subtitle,
        // The block now reads `subtitle` as a separate tagline, so
        // forward it directly when both title and subtitle are present.
        // composeContent only kicks in for the body copy, which is
        // either `description` or a stringified items list.
        subtitle: title && subtitle ? subtitle : '',
        content: composeContent(title && subtitle ? '' : subtitle, description, spec.items),
        imageUrl: spec.imageUrl ?? '',
        layout: key === 'image-text' ? 'right' : 'left',
        buttonText: button,
        buttonUrl: spec.buttonUrl ?? '',
        ...commonExtras(spec),
      },
    };
  }

  // ── Web pattern blocks (web-block-patterns-reference §2) ──
  // These get dedicated block_types so the renderer can present them as
  // designed rather than serialising the items array into a text block.

  if (key === 'stats' || key === 'stats-numbers' || key === 'counter' || key === 'numbers') {
    const items = (spec.items ?? []).map((it) => ({
      value: String(it.value ?? it.number ?? it.count ?? '0'),
      label: String(it.label ?? it.title ?? it.name ?? ''),
      unit: String(it.unit ?? it.suffix ?? ''),
      prefix: String(it.prefix ?? ''),
    }));
    return {
      blockType: 'stats_counter',
      props: {
        title: title || '',
        subtitle: subtitle || description || '',
        columns: items.length === 4 ? '4' : items.length === 2 ? '2' : '3',
        items,
        align: 'center',
        ...commonExtras(spec),
      },
    };
  }

  if (key === 'pricing' || key === 'pricing-table' || key === 'plans') {
    const items = (spec.items ?? [])
      .map((it) => ({
        name: String(it.name ?? it.title ?? ''),
        price: String(it.price ?? '').replace(/^\$/, ''),
        period: String(it.period ?? it.interval ?? ''),
        description: String(it.description ?? ''),
        features: Array.isArray(it.features) ? it.features.map(String) : [],
        buttonText: String(it.buttonText ?? it.cta ?? ''),
        buttonUrl: String(it.buttonUrl ?? it.url ?? ''),
        featured: Boolean(it.featured ?? it.recommended ?? false),
      }))
      .filter((it) => it.name && it.price);
    // Empty title or no real items = AI didn't author this section.
    // No "Plan" / "$0" / "mo" defaults — see feedback-no-hardcoded-defaults.
    if (!title || items.length === 0) return null;
    return {
      blockType: 'pricing_table',
      props: {
        title,
        subtitle: subtitle || description || '',
        items,
        ...commonExtras(spec),
      },
    };
  }

  if (key === 'team' || key === 'team-members' || key === 'people' || key === 'staff') {
    const items = (spec.items ?? []).map((it) => ({
      name: String(it.name ?? ''),
      role: String(it.role ?? it.title ?? it.position ?? ''),
      photoUrl: String(it.photoUrl ?? it.imageUrl ?? it.photo ?? ''),
      bio: String(it.bio ?? it.description ?? ''),
    }));
    if (!title) return null;
    return {
      blockType: 'team_members',
      props: {
        title,
        subtitle: subtitle || description || '',
        columns: items.length === 4 ? '4' : items.length === 2 ? '2' : '3',
        items,
        photoStyle: 'circle',
        ...commonExtras(spec),
      },
    };
  }

  if (key === 'subscribe' || key === 'newsletter' || key === 'newsletter-signup' || key === 'email-signup') {
    // Empty subscribe title or button = AI didn't write copy. Refuse
    // rather than shipping a "Subscribe to our newsletter" template
    // line that every site would inherit identically. See
    // feedback-no-hardcoded-defaults.
    if (!title || !button) return null;
    return {
      blockType: 'subscribe_form',
      props: {
        title,
        subtitle: subtitle || description || '',
        buttonText: button,
        bgMode: 'subtle',
      },
    };
  }

  if (key === 'features' || key === 'features-grid' || key === 'services-grid' || key === 'capabilities') {
    const items = (spec.items ?? []).map((it) => ({
      title: String(it.title ?? it.name ?? it.heading ?? ''),
      description: String(it.description ?? it.text ?? ''),
      iconName: String(it.iconName ?? it.icon ?? ''),
      imageUrl: String(it.imageUrl ?? it.image ?? ''),
      caption: String(it.caption ?? ''),
      href: typeof it.href === 'string' ? it.href : undefined,
    }));
    // FeaturesGrid's own variant (compact / image-card / icon-large)
    // can be set by the AI to flex card style — defaults to compact.
    // Whitelist the value so a typo doesn't break the block.
    const VALID_VARIANTS = new Set(['compact', 'image-card', 'icon-large']);
    const featuresVariant = typeof spec.variant === 'string' && VALID_VARIANTS.has(spec.variant)
      ? spec.variant
      : 'compact';
    // image-card variant typically reads better centered with no
    // outline (the image is the visual frame). compact stays outline.
    const cardStyleByVariant: Record<string, string> = {
      'image-card': 'elevated',
      'icon-large': 'outline',
      compact: 'outline',
    };
    const alignByVariant: Record<string, string> = {
      'image-card': 'left',
      'icon-large': 'center',
      compact: 'left',
    };
    return {
      blockType: 'features_grid',
      props: {
        title: title || '',
        subtitle: subtitle || description || '',
        items,
        columns: items.length === 4 ? '4' : items.length === 2 ? '2' : '3',
        cardStyle: cardStyleByVariant[featuresVariant] ?? 'outline',
        align: alignByVariant[featuresVariant] ?? 'left',
        variant: featuresVariant,
        ...commonExtras(spec),
      },
    };
  }

  // Tabbed category filter + grid — Stanislav "Unsere Kategorien".
  // The AI emits this for content that's a SET of categories the visitor
  // can filter through. Distinct from features (no filter) and gallery
  // (no titled cards). Heuristic: tabs[] explicitly present, OR
  // sectionType is 'tabs'/'category-tabs'/'category-filter' AND items
  // include a 'tab' field.
  if (
    key === 'tabs' ||
    key === 'category-tabs' ||
    key === 'category-filter' ||
    key === 'tab-grid' ||
    key === 'filtered-grid'
  ) {
    const rawTabs = Array.isArray(spec.tabs) ? spec.tabs : [];
    const rawCards = Array.isArray(spec.cards)
      ? spec.cards
      : Array.isArray(spec.items)
        ? spec.items
        : [];
    if (rawTabs.length === 0 || rawCards.length === 0) {
      // Fall through to features_grid below — operator can swap manually
      // later. We don't synthesise tabs out of thin air.
    } else {
      return {
        blockType: 'category_tabs',
        props: {
          title: title || '',
          subtitle: subtitle || description || '',
          tabs: rawTabs,
          cards: rawCards,
          buttonText: button || '',
          buttonUrl: spec.buttonUrl ?? '',
          ...commonExtras(spec),
        },
      };
    }
  }

  // Steps / process — "Как мы работаем" / "Unser Ablauf" / "Our Process".
  // Distinct from features (parallel benefits) and check-list (terse
  // bullets) — implies a sequence with numbered indicators per row.
  if (
    key === 'steps' ||
    key === 'process' ||
    key === 'process-steps' ||
    key === 'steps-list' ||
    key === 'how-we-work' ||
    key === 'how-it-works' ||
    key === 'workflow'
  ) {
    const stepItems = (Array.isArray(spec.items) ? spec.items : [])
      .map((it) => {
        if (typeof it === 'string') return { title: it };
        return {
          title: String(it.title ?? it.name ?? it.heading ?? '').trim(),
          description: String(it.description ?? it.text ?? '').trim() || undefined,
          iconName: typeof it.iconName === 'string' ? it.iconName : (typeof it.icon === 'string' ? it.icon : undefined),
          imageUrl: typeof it.imageUrl === 'string' ? it.imageUrl : (typeof it.image === 'string' ? it.image : undefined),
          number: typeof it.number === 'string' ? it.number : undefined,
        };
      })
      .filter((it) => it.title);
    // 5+ steps → vertical (long-form Russian "Как мы работаем" style).
    // 3-4 steps → grid (compact 3-up overview).
    const layout = stepItems.length >= 5 ? 'vertical' : 'grid';
    return {
      blockType: 'steps_list',
      props: {
        title: title || '',
        subtitle: subtitle || description || '',
        items: stepItems,
        layout,
        ...commonExtras(spec),
      },
    };
  }

  if (key === 'check-list' || key === 'checklist' || key === 'bullets' || key === 'feature-list') {
    const items = (Array.isArray(spec.items) ? spec.items : [])
      .map((it) => {
        if (typeof it === 'string') return { text: it };
        return { text: String(it.text ?? it.title ?? it.label ?? ''), description: String(it.description ?? '') };
      })
      .filter((it) => it.text);
    return {
      blockType: 'check_list',
      props: {
        title: title || '',
        items,
        columns: items.length >= 8 ? '2' : '1',
        iconStyle: 'check',
      },
    };
  }

  if (key === 'faq' || key === 'faq-accordion' || key === 'questions' || key === 'q-and-a') {
    const items = (spec.items ?? []).map((it) => ({
      question: String(it.question ?? it.title ?? it.q ?? ''),
      answer: String(it.answer ?? it.description ?? it.a ?? ''),
    }));
    // Empty title or zero items = AI didn't author this section. Refuse
    // rather than shipping a generic English "Frequently Asked Questions"
    // header that every tenant would inherit identically. See
    // feedback-no-hardcoded-defaults.
    if (!title || items.length === 0) return null;
    return {
      blockType: 'faq_accordion',
      props: {
        title,
        subtitle: subtitle || description || '',
        items,
        columns: items.length >= 8 ? '2' : '1',
        defaultOpen: 0,
        ...commonExtras(spec),
      },
    };
  }

  if (key === 'testimonials' || key === 'testimonial' || key === 'reviews' || key === 'social-proof') {
    const items = (spec.items ?? []).map((it) => ({
      quote: String(it.quote ?? it.testimonial ?? it.text ?? it.description ?? ''),
      author: String(it.author ?? it.name ?? ''),
      role: String(it.role ?? it.title ?? it.position ?? ''),
      company: String(it.company ?? it.organization ?? ''),
      avatarUrl: String(it.avatarUrl ?? it.imageUrl ?? it.photo ?? ''),
      rating: typeof it.rating === 'number' ? it.rating : undefined,
    }));
    return {
      blockType: 'testimonials',
      props: {
        title: title || '',
        subtitle: subtitle || description || '',
        items,
        layout: items.length === 1 ? 'single' : items.length === 2 ? 'grid-2' : 'grid-3',
        // Default 'subtle' so testimonials don't crash into a white run;
        // commonExtras lets the AI override to 'dark' / 'accent' / 'none'
        // when it wants the testimonials to be the page's rhythm break.
        bgMode: 'subtle',
        ...commonExtras(spec),
      },
    };
  }

  if (key === 'logo-bar' || key === 'logos' || key === 'partners' || key === 'clients' || key === 'logo-grid') {
    const items = (spec.items ?? [])
      .map((it) => ({
        // No hard-coded "Partner" fallback. A logo entry without a name
        // is a real-tenant data problem (operator must supply alt text);
        // drop it rather than render a generic English placeholder
        // across every site. See feedback-no-hardcoded-defaults.
        name: String(it.name ?? it.title ?? ''),
        logoUrl: String(it.logoUrl ?? it.imageUrl ?? it.url ?? ''),
        linkUrl: String(it.linkUrl ?? ''),
      }))
      .filter((it) => it.name && it.logoUrl);
    if (items.length === 0) return null;
    return {
      blockType: 'logo_bar',
      props: {
        title: title || (subtitle || ''),
        items,
        grayscale: true,
        align: 'center',
      },
    };
  }

  // Unknown / unmapped section types — collapse to text_only when the
  // LLM produced enough content (title or subtitle or items) to be
  // worth shipping. Empty content = null (the section is dropped).
  // Previously this fell through to `labelFor(key)` which injected
  // English section labels ('Features', 'Pricing', 'Team', 'FAQ',
  // 'Partners', 'Recent posts') across every tenant — see
  // feedback-no-hardcoded-defaults.
  const fallbackTitle = title || subtitle || '';
  const fallbackContent = composeContent(subtitle, description, spec.items, button, spec.buttonUrl);
  if (!fallbackTitle && !fallbackContent.trim()) return null;
  return {
    blockType: 'text_only',
    props: {
      title: fallbackTitle,
      content: fallbackContent,
    },
  };
}

function composeContent(
  subtitle?: string | null,
  description?: string | null,
  items?: Array<Record<string, unknown>> | null,
  buttonText?: string | null,
  buttonUrl?: string | null,
): string {
  const lines: string[] = [];
  if (subtitle) lines.push(`<p class="subtitle">${escapeHtml(subtitle)}</p>`);
  if (description) lines.push(`<p>${escapeHtml(description)}</p>`);
  if (items && items.length > 0) {
    lines.push('<ul>');
    for (const it of items) {
      // Best-effort: surface the most useful keys per item shape.
      const itemTitle = String(it.title ?? it.name ?? it.question ?? it.quote ?? '');
      const itemDesc = String(it.description ?? it.role ?? it.answer ?? it.author ?? it.price ?? '');
      if (!itemTitle && !itemDesc) continue;
      const left = itemTitle ? `<strong>${escapeHtml(itemTitle)}</strong>` : '';
      const right = itemDesc ? ` — ${escapeHtml(itemDesc)}` : '';
      lines.push(`  <li>${left}${right}</li>`);
    }
    lines.push('</ul>');
  }
  if (buttonText) {
    const href = buttonUrl ? escapeHtml(buttonUrl) : '#';
    lines.push(`<p><a class="cta" href="${href}">${escapeHtml(buttonText)}</a></p>`);
  }
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// `labelFor()` was removed. It mapped section keys to English labels
// ('Features', 'Pricing', 'Testimonials', 'Team', 'FAQ', 'Partners',
// 'Recent posts') used as a title fallback in text_only blocks — so
// every tenant whose LLM punted on the section heading inherited the
// same English label. The text_only fallback now refuses to render
// without a real title/content (returns null). See
// feedback-no-hardcoded-defaults.
