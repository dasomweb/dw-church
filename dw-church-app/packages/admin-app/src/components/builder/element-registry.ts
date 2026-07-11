/**
 * Per-block-type element registry. Defines, for each block_type, which
 * named "elements" inside it the operator can edit. The ElementInspector
 * uses this to render the right controls for the click target.
 *
 * Element kinds:
 *   text   - plain string field at props[fieldPath]
 *   html   - rich-text string at props[fieldPath]
 *   image  - URL string at props[fieldPath]
 *   url    - link href at props[fieldPath]
 *   select - enum value at props[fieldPath]; choices[] supplies options
 *   bool   - boolean toggle at props[fieldPath]
 *   color  - color string (palette key OR hex) at props[fieldPath]
 *   number - numeric at props[fieldPath]
 *
 * For list-bearing blocks (features_grid, testimonials, pricing_table,
 * etc.) items are addressed as `items[<idx>].<field>`. The Inspector
 * walks the registry to render whichever fields apply.
 *
 * `__section__` is the synthetic key the BlockRenderer dispatches when
 * the operator clicks the block background (not on a specific element).
 * Maps to the union of every editable element so the operator gets a
 * full sidebar.
 */

export type ElementKind =
  | 'text'
  | 'html'
  | 'image'
  | 'icon'
  | 'product'
  | 'form'
  | 'url'
  | 'select'
  | 'bool'
  | 'color'
  | 'number'
  // Multi-prop kinds — FieldControl reads / writes several props at once
  // instead of a single `path` value. For 'overlay' / 'border' / 'layout'
  // / 'design' the spec's `path` is a dummy slot. For 'link-button',
  // `path` doubles as the prefix for the underlying flat props — e.g.
  // path='button' reads buttonText / buttonUrl / buttonNewTab.
  | 'overlay'
  | 'border'
  | 'link-button'
  | 'layout'
  | 'design'
  | 'gallery-image-order'
  // Repeater kind — edits an ARRAY prop (props[path]) of schedule groups
  // ({ title, columns[], rows[][] }) via ScheduleGroupsField. Single-path
  // (writes the whole array back through onChange), not multi-prop.
  | 'groups'
  // Dynamic select of the tenant's registered video categories (slug value).
  | 'video-category'
  // Dynamic select of the tenant's registered boards (slug value).
  | 'board-select'
  // Dynamic select of the tenant's registered album categories (slug value).
  | 'album-category';

export interface ElementSpec {
  /** Display label in the inspector. */
  label: string;
  /** Where this field lives in props (dot path). */
  path: string;
  kind: ElementKind;
  /** For 'select' kind. */
  choices?: { value: string; label: string }[];
  /** Inline help text. */
  hint?: string;
  /** For 'layout' / 'design' multi-prop kinds — opts forwarded to the
   *  matching <LayoutField> / <DesignField> as enabledFields / heightChoices
   *  / backgroundColorHint. Inspector ignores it for other kinds. */
  layoutOpts?: {
    enabledFields?: {
      height?: boolean;
      textAlign?: boolean;
      width?: boolean;
      contentWidth?: boolean;
    };
    heightChoices?: { value: 'sm' | 'md' | 'lg' | 'full'; label: string }[];
  };
  designOpts?: {
    enabledFields?: {
      backgroundPosition?: boolean;
      sectionBackground?: boolean;
    };
    backgroundColorHint?: string;
  };
  /** True 이면 Dynamic Source ⚙ 버튼 비노출 — slug / id / 가격 field key
   *  처럼 운영자가 직접 입력해야 하는 시스템 값. 미지정 = 기본 활성. */
  disableDynamic?: boolean;
}

export interface BlockElementRegistry {
  /** Sections inside the inspector (a small heading + list of fields). */
  sections: { title: string; elements: ElementSpec[] }[];
}

/**
 * 모든 section block 인스펙터의 Style 탭에 공통 노출돼야 하는 4 묶음:
 *   Layout (Height / Align / Background Width / Container Width)
 *   Design (Background & Position)
 *   Background Overlay (multi-prop)
 *   Border (multi-prop)
 *
 * 대표님 직접 지시 (2026-05-24): HERO_BANNER 스타일의 4 묶음이 '모든 섹션
 * 블록에 공통' 반영. registry 정의가 매 블록마다 똑같이 반복되던 걸
 * helper 호출 한 줄로 정리.
 *
 * 블록별 옵션:
 *   bgModeChoices  — Pricing / Team / Features 처럼 bgMode preset (none/
 *                    subtle/dark/accent) 을 별도 select 로 노출하고 싶을
 *                    때. 미지정 시 Design 섹션만 (bgMode select 없음).
 *   designHint     — Design 섹션의 Section Background color 필드 hint
 *                    (예: '비우면 위 Background preset 사용').
 *   layoutOpts     — LayoutField enabledFields override (보통 미지정 —
 *                    전부 활성). 'split-image' 변형처럼 width 가 의미
 *                    없는 블록만 비활성.
 */
function commonSectionStyleSections(opts?: {
  bgModeChoices?: { value: string; label: string }[];
  designHint?: string;
  layoutOpts?: ElementSpec['layoutOpts'];
}): BlockElementRegistry['sections'] {
  const designElements: ElementSpec[] = [];
  if (opts?.bgModeChoices && opts.bgModeChoices.length > 0) {
    designElements.push({
      label: 'Background',
      path: 'bgMode',
      kind: 'select',
      choices: opts.bgModeChoices,
    });
  }
  designElements.push({
    label: 'Background & Position',
    path: '__design__',
    kind: 'design',
    designOpts: opts?.designHint ? { backgroundColorHint: opts.designHint } : undefined,
  });
  designElements.push({
    label: 'Background Overlay',
    path: 'overlay',
    kind: 'overlay',
    hint: 'Classic or gradient tint over the background image',
  });
  designElements.push({
    label: 'Border',
    path: 'border',
    kind: 'border',
    hint: 'Border type · width · color · 4-side radius',
  });

  return [
    {
      title: 'Layout',
      elements: [
        {
          label: 'Layout',
          path: '__layout__',
          kind: 'layout',
          ...(opts?.layoutOpts ? { layoutOpts: opts.layoutOpts } : {}),
        },
      ],
    },
    {
      title: 'Design',
      elements: designElements,
    },
  ];
}

/** Default bgMode preset choices reused by content blocks that historically
 *  had `bgMode` (Pricing / Team / Logo / FAQ / Features etc.). */
const DEFAULT_BG_MODE_CHOICES = [
  { value: 'none',   label: 'None (white)' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'dark',   label: 'Dark' },
  { value: 'accent', label: 'Accent' },
];

const HERO_BANNER: BlockElementRegistry = {
  sections: [
    {
      title: 'Content',
      elements: [
        { label: 'Layout', path: 'variant', kind: 'select', choices: [
          { value: 'image-overlay', label: 'Background Image + Overlay' },
          { value: 'split-image', label: 'Split (Image + Text)' },
          { value: 'page-hero', label: 'Compact (sub-page header)' },
          { value: 'text-only', label: 'Text Only' },
        ]},
        { label: 'Eyebrow', path: 'eyebrow', kind: 'text', hint: 'Small category label above the headline' },
        { label: 'Headline', path: 'title', kind: 'text' },
        { label: 'Subtitle', path: 'subtitle', kind: 'text' },
        { label: 'Description', path: 'description', kind: 'text', hint: 'Split-image variant only' },
        { label: 'Background Image', path: 'backgroundImageUrl', kind: 'image' },
        { label: 'Mobile Background (optional)', path: 'backgroundImageUrlMobile', kind: 'image', hint: '9:16 recommended — shown on narrow screens instead of desktop background' },
        { label: 'Background Video (YouTube, optional)', path: 'backgroundVideoUrl', kind: 'url', hint: 'Image-overlay variant — autoplay · muted · loop over the background image, which stays as poster / fallback' },
        { label: 'Content Image', path: 'imageUrl', kind: 'image', hint: 'Split-image variant only' },
      ],
    },
    {
      title: 'CTA Buttons',
      elements: [
        // Primary / Secondary CTA bundled as link-button multi-prop —
        // operator sees Label + URL + 새창 토글 in one panel per button.
        // Storage stays as flat buttonText / buttonUrl / buttonNewTab
        // (and secondaryButton* mirror) so storefront button JSX reads
        // the same keys it always has — only the inspector grouping
        // changed.
        { label: 'Primary CTA Button', path: 'button', kind: 'link-button', hint: '비워두면 버튼 숨김' },
        { label: 'Secondary CTA Button', path: 'secondaryButton', kind: 'link-button', hint: '비워두면 버튼 숨김' },
      ],
    },
    ...commonSectionStyleSections({
      designHint: 'text-only / split-image 변형에서 사용 — 비우면 테마 기본값',
    }),
  ],
};

const CTA_SECTION: BlockElementRegistry = {
  sections: [
    {
      title: 'Content',
      elements: [
        { label: 'Layout', path: 'variant', kind: 'select', choices: [
          { value: 'inline-banner', label: 'Inline Banner (narrow strip)' },
          { value: 'boxed-card', label: 'Boxed Card (centered)' },
          { value: 'image-overlay', label: 'Background Image + Overlay (hero style)' },
          { value: 'split-image', label: 'Split (Image + Text)' },
          { value: 'stats-strip', label: 'Stats + CTA (trust-first)' },
          { value: 'contact-info', label: 'Contact + CTA (B2B)' },
        ]},
        { label: 'Eyebrow', path: 'eyebrow', kind: 'text', hint: 'Boxed-card / image-overlay / split-image variants' },
        { label: 'Headline', path: 'title', kind: 'text' },
        { label: 'Subtitle', path: 'subtitle', kind: 'text', hint: 'Image-overlay variant' },
        { label: 'Description', path: 'description', kind: 'text' },
        { label: 'Image', path: 'imageUrl', kind: 'image', hint: 'Split-image variant only' },
        { label: 'Background Image', path: 'backgroundImageUrl', kind: 'image', hint: 'Image-overlay variant (1920×1080 recommended)' },
        { label: 'Contact Phone', path: 'contactPhone', kind: 'text', hint: 'Contact-info variant only' },
        { label: 'Contact Email', path: 'contactEmail', kind: 'text', hint: 'Contact-info variant only' },
      ],
    },
    {
      title: 'CTA Buttons',
      elements: [
        { label: 'Primary CTA Button', path: 'button', kind: 'link-button', hint: '비워두면 버튼 숨김' },
        { label: 'Secondary CTA Button', path: 'secondaryButton', kind: 'link-button', hint: '비워두면 버튼 숨김' },
        { label: 'Button Shape', path: 'ctaShape', kind: 'select', choices: [
          { value: 'pill', label: 'Pill' },
          { value: 'rounded', label: 'Rounded' },
          { value: 'square', label: 'Square' },
        ]},
      ],
    },
    {
      title: 'Block Options',
      elements: [
        { label: 'Image Position', path: 'imageSide', kind: 'select', choices: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ], hint: 'Split-image variant only' },
      ],
    },
    ...commonSectionStyleSections({
      bgModeChoices: [
        { value: 'none', label: 'None (white)' },
        { value: 'subtle', label: 'Subtle' },
        { value: 'accent', label: 'Accent' },
        { value: 'gradient', label: 'Gradient' },
      ],
      designHint: '비우면 위 Background preset 사용 — 색 입력하면 override',
      // CTA height label override — 운영자가 px 까지 보고 싶어함.
      layoutOpts: {
        heightChoices: [
          { value: 'sm',   label: 'Small (340px)' },
          { value: 'md',   label: 'Medium (480px)' },
          { value: 'lg',   label: 'Large (620px)' },
          { value: 'full', label: 'Full (80vh)' },
        ],
      },
    }),
  ],
};

const SPACER: BlockElementRegistry = {
  sections: [{
    title: 'Spacing',
    elements: [
      { label: 'Height', path: 'size', kind: 'select', choices: [
        { value: 'xs', label: 'X-Small' },
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'X-Large' },
      ]},
      { label: 'Show Divider', path: 'showDivider', kind: 'bool' },
    ],
  }],
};

const TIMELINE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Design', elements: [
      { label: 'Layout', path: 'variant', kind: 'select', choices: [
        { value: 'left', label: 'Left Rail (default)' },
        { value: 'center', label: 'Center Rail (alternating)' },
      ]},
      { label: 'Background', path: 'bgMode', kind: 'select', choices: [
        { value: 'none', label: 'None (white)' },
        { value: 'subtle', label: 'Subtle' },
      ]},
      { label: 'Background (custom)', path: 'backgroundColor', kind: 'color', hint: 'Blank uses preset above' },
    ]},
  ],
};

const CONTACT_FORM: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Description', path: 'description', kind: 'text' },
      { label: 'Submit Label', path: 'submitLabel', kind: 'text' },
      { label: 'Success Message', path: 'successMessage', kind: 'text' },
    ]},
    { title: 'Design', elements: [
      { label: 'Layout', path: 'variant', kind: 'select', choices: [
        { value: 'stacked', label: 'Stacked (default)' },
        { value: 'side-by-side', label: 'Side-by-side (title + form)' },
      ]},
    ]},
    { title: 'Submission', elements: [
      { label: 'Endpoint URL', path: 'endpoint', kind: 'text', hint: 'Default: /api/v1/forms/contact' },
    ]},
  ],
};

// 목장사역보고서 폼 (Data Block). Cell leaders submit weekly reports → lands in
// the 폼 제출 inbox as form_type 'cell_report'. Operator tunes the heading copy;
// the form fields themselves are fixed in the block. Background/overlay/spacing
// come from the Advanced tab (props.blockStyle).
const CELL_REPORT: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: '제목', path: 'title', kind: 'text' },
      { label: '안내 문구', path: 'subtitle', kind: 'text' },
    ]},
  ],
};

const COMPARISON_TABLE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Design', elements: [
      { label: 'Background', path: 'bgMode', kind: 'select', choices: [
        { value: 'none', label: 'None (white)' },
        { value: 'subtle', label: 'Subtle' },
      ]},
      { label: 'Background (custom)', path: 'backgroundColor', kind: 'color', hint: 'Blank uses preset above' },
    ]},
  ],
};

const BEFORE_AFTER: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Images', elements: [
      { label: 'Before Image', path: 'beforeImageUrl', kind: 'image' },
      { label: 'After Image', path: 'afterImageUrl', kind: 'image' },
      { label: 'Before Label', path: 'beforeLabel', kind: 'text' },
      { label: 'After Label', path: 'afterLabel', kind: 'text' },
      { label: 'Initial Position (%)', path: 'defaultPosition', kind: 'number', hint: '5–95' },
    ]},
  ],
};

const HOTSPOT_IMAGE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Image', elements: [
      { label: 'Background Image', path: 'imageUrl', kind: 'image' },
    ]},
  ],
};

const SHOPPABLE_IMAGE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Image', elements: [
      { label: 'Scene Image', path: 'imageUrl', kind: 'image' },
    ]},
  ],
};

const LOOKBOOK_SLIDER: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Design', elements: [
      { label: 'Background', path: 'bgMode', kind: 'select', choices: [
        { value: 'none', label: 'None' },
        { value: 'subtle', label: 'Subtle' },
        { value: 'dark', label: 'Dark' },
        { value: 'accent', label: 'Accent' },
      ]},
      { label: 'Background (custom)', path: 'backgroundColor', kind: 'color', hint: 'Blank uses preset above' },
    ]},
  ],
};

const COUNTDOWN_SALE: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'End At', path: 'endAt', kind: 'text', hint: 'ISO format (e.g. 2026-06-30T23:59:59)' },
      { label: 'Button Label', path: 'buttonText', kind: 'text' },
      { label: 'Button URL', path: 'buttonUrl', kind: 'url' },
      { label: 'Expired Text', path: 'expiredText', kind: 'text', hint: 'Shown after the countdown ends' },
    ]},
    { title: 'Design', elements: [
      { label: 'Background', path: 'bgMode', kind: 'select', choices: [
        { value: 'none', label: 'None' },
        { value: 'subtle', label: 'Subtle' },
        { value: 'dark', label: 'Dark' },
        { value: 'accent', label: 'Accent' },
      ]},
      { label: 'Background (custom)', path: 'backgroundColor', kind: 'color', hint: 'Blank uses preset above' },
    ]},
  ],
};

/**
 * Page-level style selector for catalog spreads — editorial / grid /
 * corporate. Decides the entire spread's typographic + visual tone
 * (paper / ink / rule colors via catalog-starter-visuals). 모든 catalog
 * block 의 Style 섹션에 공통 노출되어야 운영자가 카탈로그 페이지마다
 * 톤을 선택 가능.
 *
 * 운영자는 보통 카탈로그 전체를 같은 style 로 통일하지만, 한 권에서
 * 특정 페이지만 다른 톤으로 강조하고 싶을 수도 있어서 page-level 로 둠
 * (catalog-level setting 이 아니라).
 */
const CATALOG_PAGE_STYLE_FIELD: ElementSpec = {
  label: 'Page Style',
  path: 'style',
  kind: 'select',
  choices: [
    { value: 'editorial', label: 'Editorial (magazine 느낌, 큰 사진 + 가벼운 캡션)' },
    { value: 'grid', label: 'Grid (사진 위주, 작은 corner 캡션)' },
    { value: 'corporate', label: 'Corporate (도감 톤, 사양 + 라벨 강조)' },
  ],
  hint: '카탈로그 페이지 전체 톤 — 페이지마다 다르게 셋팅 가능. 보통 모든 페이지 통일 권장',
};

/** Background color override for a catalog spread — falls back to the
 *  page-style's paper color when blank. */
const CATALOG_PAGE_BG_FIELD: ElementSpec = {
  label: 'Page Background (override)',
  path: 'pageBackgroundColor',
  kind: 'color',
  hint: '비우면 Page Style 의 기본 paper 색 사용. 특정 페이지를 다른 색으로 강조할 때만',
};

const CATALOG_COVER: BlockElementRegistry = {
  sections: [
    { title: 'Cover Content', elements: [
      { label: 'Brand Name (small top text)', path: 'brandName', kind: 'text' },
      { label: 'Catalog Title', path: 'title', kind: 'text', hint: 'e.g. "PRODUCT CATALOG", "Modern Unique Products"' },
      { label: 'Subtitle / Tagline', path: 'tagline', kind: 'text' },
      { label: 'Year / Issue', path: 'year', kind: 'text', hint: 'e.g. "2026", "Spring 2026"' },
      { label: 'Cover Image', path: 'imageUrl', kind: 'image', hint: 'Renders large on the right side' },
    ]},
    { title: 'Style', elements: [
      CATALOG_PAGE_STYLE_FIELD,
      CATALOG_PAGE_BG_FIELD,
    ]},
  ],
};

const CATALOG_TOC: BlockElementRegistry = {
  sections: [
    { title: 'Table of Contents', elements: [
      { label: 'Headline', path: 'title', kind: 'text', hint: 'Default: Table of Contents' },
    ]},
    { title: 'Style', elements: [
      CATALOG_PAGE_STYLE_FIELD,
      CATALOG_PAGE_BG_FIELD,
    ]},
  ],
};

const CATALOG_PRODUCT_PAGE: BlockElementRegistry = {
  sections: [
    { title: 'Product Selection', elements: [
      { label: 'Product', path: 'productId', kind: 'product', hint: 'Search by name or SKU. The chosen product\'s photo / title / SKU / description fill in automatically.' },
    ]},
    { title: 'Display Options', elements: [
      { label: 'Show SKU', path: 'show.sku', kind: 'bool' },
      { label: 'Show Description', path: 'show.description', kind: 'bool' },
      { label: 'Show Price', path: 'show.price', kind: 'bool', hint: 'Hidden by default. Only meaningful when custom_fields has a price key.' },
    ]},
    { title: 'Style', elements: [
      CATALOG_PAGE_STYLE_FIELD,
      CATALOG_PAGE_BG_FIELD,
      { label: 'Auto Gallery Spreads', path: 'autoGallery', kind: 'bool', hint: 'magazine(editorial) 변형일 때 추가 이미지를 다음 spread 로 자동 펼침. 기본 ON. 끄려면 이 prop 을 false 로 셋팅 (인스펙터 false 가 명시되면 inject 안 됨)' },
    ]},
  ],
};

const CATALOG_PRODUCT_GALLERY: BlockElementRegistry = {
  sections: [
    { title: 'Product Selection', elements: [
      { label: 'Product', path: 'productId', kind: 'product', hint: '같은 productId 의 hero(images[0]) 외 나머지 사진을 화보로 펼침. CatalogProductPage 와 같은 product 로 지정.' },
    ]},
    { title: 'Pagination', elements: [
      { label: 'Range Start', path: 'rangeStart', kind: 'number', hint: 'images 의 시작 인덱스. 기본 1 (hero 다음부터). 같은 product 의 사진이 많아 여러 spread 로 나누려면 두 번째 gallery 블록의 rangeStart 를 4 또는 5 로.' },
    ]},
    { title: 'Photos', elements: [
      // 보여지는 사진의 순서 — 운영자가 drag-and-drop 으로 변경 (대표님
      // 요청 2026-05-27). 미지정 시 product.images.slice(rangeStart,
      // rangeStart+max). 저장 형식: product.images 의 인덱스 배열.
      { label: '사진 순서', path: 'imageOrder', kind: 'gallery-image-order',
        hint: '드래그해서 슬롯 순서 변경. 비우면 Range Start 부터 자동 순서.' },
    ]},
    { title: 'Layout', elements: [
      // editorial 변형의 운영자 직접 선택 layout. auto 면 사진 수 × spread
      // index 따라 자동 선택 (현재 15+ 종 mosaic 중 회전). 명시 선택하면
      // 그 mosaic 으로 고정 — '이 spread 만 큰 사진 1장' 또는 '4-cell 통일'
      // 같은 운영자 의도 반영.
      { label: 'Layout (editorial)', path: 'galleryLayout', kind: 'select', choices: [
        { value: 'auto',        label: 'Auto — 사진 수에 맞게 자동 선택' },
        { value: 'single',      label: '1장 풀-블리드 (가장 큰 한 장)' },
        { value: 'split-2',     label: '2장 좌우 분할' },
        { value: 'wide-narrow', label: '2장 큰+작은 (2:1 비율)' },
        { value: 'large-2up',   label: '3장 — 큰 + 작은 2장 stack' },
        { value: 'strip-3',     label: '3장 균등 3-column 스트립' },
        { value: 'top-2down',   label: '3장 — 큰 위 + 작은 2장 아래' },
        { value: 'grid-2x2',    label: '4장 2x2 균등 그리드' },
        { value: 'hero-3thumb', label: '4장 — 큰 hero + thumbnail strip 3' },
        { value: 'golden-1to3', label: '4장 — 큰 왼쪽 + 작은 3장 stack (5:3)' },
        { value: 'hero-2x2',    label: '5장 — 큰 hero + 2x2 collage' },
        { value: '4thumb-hero', label: '5장 — thumbnail strip 4 + 큰 아래' },
        { value: 'feature-5',   label: '6장 — 큰 feature + 작은 5장' },
        { value: 'grid-3x2',    label: '6장 3x2 균등 그리드' },
        { value: 'huge-5thumb', label: '6장 — 거대 위 + 작은 5장 strip' },
        { value: 'mixed-3col',  label: '7장 — 3-column 혼합 높이' },
        { value: 'hero-6grid',  label: '7장 — hero + 3x2 grid' },
        { value: 'grid-4x2',    label: '8장 4x2 균등 그리드' },
        { value: 'windmill',    label: '8장 — 풍차 (중앙 큰 + 7장 둘레)' },
        { value: 'magazine-5-3', label: '8장 — 매거진 (5 위 + 3 아래)' },
      ], hint: '운영자가 명시 선택하면 사진 수가 부족해도 빈 칸으로 그려짐. Auto 권장' },
      { label: 'Columns', path: 'columns', kind: 'select', choices: [
        { value: '2', label: '2 columns' },
        { value: '3', label: '3 columns' },
      ], hint: 'grid / corporate 변형 전용' },
      { label: 'Rows', path: 'rows', kind: 'select', choices: [
        { value: '2', label: '2 rows' },
        { value: '3', label: '3 rows' },
      ], hint: 'grid / corporate 변형 전용' },
    ]},
    { title: 'Style', elements: [
      CATALOG_PAGE_STYLE_FIELD,
      CATALOG_PAGE_BG_FIELD,
    ]},
  ],
};

const CATALOG_BACK_COVER: BlockElementRegistry = {
  sections: [
    { title: 'Back Cover Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text', hint: 'e.g. "Thank you for ordering"' },
      { label: 'Message', path: 'message', kind: 'text' },
      { label: 'Contact / Address (multi-line)', path: 'contactLine', kind: 'text' },
      { label: 'Back Cover Image (optional)', path: 'imageUrl', kind: 'image' },
    ]},
    { title: 'Style', elements: [
      CATALOG_PAGE_STYLE_FIELD,
      CATALOG_PAGE_BG_FIELD,
    ]},
  ],
};

const CATALOG_ARCHIVE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
    ]},
    { title: 'Data', elements: [
      { label: 'Limit', path: 'limit', kind: 'number', hint: '0 = all' },
      { label: 'Columns', path: 'variant', kind: 'select', choices: [
        { value: 'grid-2', label: '2 columns' },
        { value: 'grid-3', label: '3 columns' },
        { value: 'grid-4', label: '4 columns' },
      ]},
    ]},
  ],
};

const APPLICATION_FORM_EMBED: BlockElementRegistry = {
  sections: [
    { title: 'Form', elements: [
      { label: '신청서 양식', path: 'formSlug', kind: 'form', hint: '신청서 양식 관리에서 만든 양식을 선택. 변경 시 즉시 라이브.' },
      { label: 'Display mode', path: 'displayMode', kind: 'select', choices: [
        { value: 'inline',    label: 'Inline — 페이지에 form 전체' },
        { value: 'cta-modal', label: 'CTA + 모달 — 카드 클릭 시 모달 안 form' },
      ]},
    ]},
    { title: 'Header', elements: [
      { label: 'Eyebrow', path: 'eyebrow', kind: 'text' },
      { label: 'Title', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'CTA label (cta-modal)', path: 'ctaLabel', kind: 'text', hint: '기본: 신청하기' },
    ]},
    { title: 'After submit', elements: [
      { label: 'Success message (override)', path: 'successMessage', kind: 'text', hint: '비우면 양식의 description 사용' },
      { label: 'After URL', path: 'ctaAfterUrl', kind: 'url', hint: '제출 후 이동할 URL (예: /thank-you)' },
      { label: 'After button label', path: 'ctaAfterLabel', kind: 'text', hint: '제출 후 이동 버튼 라벨' },
    ]},
  ],
};

// form_split — 2-column: tenant application form on one side, title /
// subtitle / content on the other (대표님 2026-05-29). English copy.
const FORM_SPLIT: BlockElementRegistry = {
  sections: [
    { title: 'Form', elements: [
      { label: 'Application form', path: 'formSlug', kind: 'form', hint: 'Pick a form from Application Forms. Changes go live immediately.' },
      { label: 'Layout', path: 'layout', kind: 'select', choices: [
        { value: 'form-left',  label: 'Form left · Text right' },
        { value: 'form-right', label: 'Text left · Form right' },
      ]},
    ]},
    { title: 'Text', elements: [
      { label: 'Title', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'Content', path: 'content', kind: 'html', hint: 'Body text beside the form (rich text / HTML).' },
    ]},
  ],
};

const PRODUCT_DETAIL_VIEW: BlockElementRegistry = {
  sections: [
    { title: 'Product', elements: [
      { label: 'Product slug', path: 'productSlug', kind: 'text', hint: 'Slug from the product manager. Leave empty when the /products/<slug> route auto-injects it.', disableDynamic: true },
      { label: 'Variant', path: 'variant', kind: 'select', choices: [
        { value: 'commerce',   label: 'Commerce — 2 columns (gallery + specs·price·CTA)' },
        { value: 'editorial',  label: 'Editorial — large image + serif + body' },
        { value: 'minimal',    label: 'Minimal — 1 column + sans + concise' },
        { value: 'spec-sheet', label: 'Spec sheet — 2 columns B2B + spec table' },
      ]},
    ]},
    { title: 'Display', elements: [
      { label: 'Show SKU', path: 'showSku', kind: 'bool' },
      { label: 'Show specs (custom fields)', path: 'showSpecs', kind: 'bool' },
      { label: 'Show gallery (extra images)', path: 'showGallery', kind: 'bool' },
      { label: 'Show price', path: 'showPrice', kind: 'bool' },
    ]},
    { title: 'Commerce (variant=commerce)', elements: [
      { label: 'Specs header', path: 'specsTitle', kind: 'text', hint: 'Heading above the specs list. Default: Product details (e.g. "Everything you need to know")' },
      { label: 'Price field key', path: 'priceFieldKey', kind: 'text', hint: 'Custom field key whose value shows as the large price on the right. Default: price', disableDynamic: true },
      { label: 'Show quantity selector', path: 'showQuantity', kind: 'bool', hint: '− 1 + control (decorative; usually OFF for B2B)' },
      { label: 'Gallery layout', path: 'galleryLayout', kind: 'select', choices: [
        { value: 'thumbnails', label: 'Thumbnail strip (click to switch)' },
        { value: 'carousel',   label: 'Carousel (horizontal arrows)' },
        { value: 'grid-2',     label: '2-column grid (below featured)' },
        { value: 'stack',      label: 'Single column (below featured)' },
      ]},
      { label: 'Content placement', path: 'contentPlacement', kind: 'select', choices: [
        { value: 'section',   label: 'Separate section (full width below 2 columns)' },
        { value: 'under-cta', label: 'Under CTA (inside right column)' },
      ]},
    ]},
    { title: 'Benefits (benefits box)', elements: [
      { label: 'Benefit items', path: 'benefits', kind: 'text', hint: 'Comma-separated, e.g. Free shipping, Care plan, Free re-potting. Empty hides the box.' },
    ]},
    { title: 'CTA', elements: [
      { label: 'Show CTA button', path: 'showCta', kind: 'bool' },
      { label: 'CTA label', path: 'ctaLabel', kind: 'text', hint: 'Default: Inquire' },
      { label: 'CTA URL', path: 'ctaHref', kind: 'url', hint: 'Default: /contact' },
    ]},
  ],
};

const BLOG_POST_VIEW: BlockElementRegistry = {
  sections: [
    { title: 'Display', elements: [
      { label: 'Show "← 블로그 목록" link', path: 'showBackLink', kind: 'bool' },
      { label: 'Show meta (date)', path: 'showMeta', kind: 'bool' },
      { label: 'Show cover (top image)', path: 'showCover', kind: 'bool' },
      { label: 'Show content (HTML body)', path: 'showContent', kind: 'bool' },
      { label: 'Show bottom image', path: 'showBottom', kind: 'bool' },
      { label: 'Show YouTube embed', path: 'showYoutube', kind: 'bool' },
    ]},
    { title: 'Navigation', elements: [
      { label: 'List link href', path: 'listHref', kind: 'url', hint: '기본: /blog' },
      { label: 'List link label', path: 'listLabel', kind: 'text', hint: '기본: ← 블로그 목록' },
    ]},
  ],
};

const CATALOG_SHOWCASE: BlockElementRegistry = {
  sections: [
    { title: 'Catalog', elements: [
      {
        label: 'Catalog slug',
        path: 'catalogSlug',
        kind: 'text',
        hint: '카탈로그 관리 화면의 slug 값. 예: 2026-spring',
      },
      // 3 가지 표시 방식 (대표님 2026-05-26). 운영자가 페이지마다 다른
      // 시각적 임팩트로 카탈로그를 노출할 수 있도록.
      { label: 'Display style', path: 'displayStyle', kind: 'select', choices: [
        { value: 'card',         label: '카드 — 이미지 + 텍스트 + CTA → 모달' },
        { value: 'cover-spread', label: '첫 페이지 임베드 — cover spread + CTA → 모달' },
        { value: 'inline',       label: '인라인 reader — 페이지에서 바로 페이지 넘김' },
      ]},
    ]},
    { title: 'Card (Display style = 카드)', elements: [
      { label: 'Headline (override)', path: 'title', kind: 'text', hint: '비우면 카탈로그 제목 자동' },
      { label: 'Subtitle (override)', path: 'subtitle', kind: 'text', hint: '비우면 카탈로그 요약 자동' },
      { label: 'CTA label', path: 'ctaLabel', kind: 'text', hint: '기본: 카탈로그 보기 (cover-spread 도 사용)' },
      { label: 'Cover position', path: 'imagePosition', kind: 'select', choices: [
        { value: 'left', label: '좌측 (이미지 + 텍스트)' },
        { value: 'right', label: '우측 (텍스트 + 이미지)' },
      ]},
    ]},
  ],
};

// ─── 데이터 블록 인스펙터 — 운영자가 데이터 블록 추가 시 'No editor
// registered' 영어 안내가 떠서 뭘 만질지 모르던 문제 해결 (대표님 2026-
// 05-26). 각 블록의 registry.json defaultProps + tenant 콘텐츠 모듈
// (앨범/배너/블로그/게시판/제품) 메뉴로 가는 안내를 한 곳에 모음.

const ALBUM_GALLERY: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
    ]},
    { title: 'Data', elements: [
      { label: 'Limit', path: 'limit', kind: 'number', hint: '표시할 앨범 개수. 0 = 전체' },
      { label: '카테고리', path: 'category', kind: 'album-category', hint: '앨범 카테고리에서 선택 (비우면 전체)' },
      { label: 'Columns', path: 'variant', kind: 'select', choices: [
        { value: 'grid-2', label: '2 columns' },
        { value: 'grid-3', label: '3 columns' },
        { value: 'grid-4', label: '4 columns' },
      ]},
    ]},
  ],
};

const BANNER_SLIDER: BlockElementRegistry = {
  sections: [
    { title: 'Data', elements: [
      { label: 'Category', path: 'category', kind: 'text', hint: '배너 관리에서 분류한 카테고리 slug (기본: main)' },
    ]},
    { title: 'Style', elements: [
      { label: '오버레이 색상', path: 'overlayColor', kind: 'color', hint: '배너 이미지 위 색조 덮개 (기본 검정)' },
      { label: '오버레이 투명도 (%)', path: 'overlayOpacity', kind: 'number', hint: '0~100. 0이면 덮개 없음. 기본 20' },
    ]},
    { title: '높이 (데스크탑 1920px 기준)', elements: [
      // Explicit fixed heights per breakpoint — clearer than the old "% of
      // width" ratio. Common web-design banner heights. The image fills the
      // height (object-cover). Picking any one switches the slider to fixed
      // mode; leaving them blank keeps the legacy ratio for old banners.
      { label: '데스크탑 (≥1024px)', path: 'desktopHeight', kind: 'select', hint: '가로 1920px 데스크탑 기준 높이', choices: [
        { value: '', label: '비율 방식 (기존 배너 유지)' },
        { value: '400px', label: '400px — 낮게' },
        { value: '500px', label: '500px — 보통' },
        { value: '600px', label: '600px — 크게 (추천)' },
        { value: '720px', label: '720px — 와이드' },
        { value: '900px', label: '900px — 시네마틱' },
        { value: '100vh', label: '화면 꽉 채움 (100vh)' },
      ]},
      { label: '태블릿 (768~1023px)', path: 'tabletHeight', kind: 'select', hint: '태블릿 세로 높이', choices: [
        { value: '', label: '비율 방식 (기존 배너 유지)' },
        { value: '300px', label: '300px — 낮게' },
        { value: '400px', label: '400px — 보통 (추천)' },
        { value: '500px', label: '500px — 크게' },
        { value: '600px', label: '600px — 와이드' },
        { value: '70vh', label: '화면 70%' },
      ]},
      { label: '모바일 (<768px)', path: 'mobileHeight', kind: 'select', hint: '모바일 세로 높이', choices: [
        { value: '', label: '비율 방식 (기존 배너 유지)' },
        { value: '220px', label: '220px — 낮게' },
        { value: '300px', label: '300px — 보통 (추천)' },
        { value: '380px', label: '380px — 크게' },
        { value: '480px', label: '480px — 와이드' },
        { value: '60vh', label: '화면 60%' },
      ]},
    ]},
    { title: '여백', elements: [
      { label: '상하 바깥여백 margin (px)', path: 'marginY', kind: 'number', hint: '블록 위/아래 간격' },
      { label: '좌우 안쪽여백 padding (px)', path: 'paddingX', kind: 'number', hint: '좌/우 안쪽 여백' },
    ]},
  ],
};

const RECENT_BLOG_POSTS: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Data', elements: [
      { label: 'Limit', path: 'limit', kind: 'number', hint: '표시할 글 개수. 기본 6' },
      { label: 'Columns', path: 'variant', kind: 'select', choices: [
        { value: 'grid-2', label: '2 columns' },
        { value: 'grid-3', label: '3 columns' },
        { value: 'grid-4', label: '4 columns' },
      ]},
    ]},
  ],
};

const BOARD: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
    ]},
    { title: 'Data', elements: [
      { label: 'Board slug', path: 'boardSlug', kind: 'board-select', hint: '게시판 관리에서 설정한 slug. 예: notices, faq, careers' },
      { label: 'Limit', path: 'limit', kind: 'number', hint: '표시할 글 개수. 기본 10' },
    ]},
  ],
};

const PRODUCTS_SHOWCASE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Product Data', elements: [
      { label: 'Source', path: 'source', kind: 'select', choices: [
        { value: 'recent', label: 'Recent' },
        { value: 'featured', label: 'Featured only' },
        { value: 'category', label: 'By category' },
        { value: 'manual', label: 'Manual selection' },
      ]},
      { label: 'Category ID', path: 'categoryFilter', kind: 'text', hint: 'Used only when source = category' },
      { label: 'Count', path: 'limit', kind: 'number', hint: '카드로 표시할 제품 개수. 기본 6' },
      { label: 'CTA Label', path: 'ctaLabel', kind: 'text', hint: '비우면 CTA 영역 숨김 (예: 자세히 보기 / View details 등 운영자가 직접 입력)' },
    ]},
    { title: 'Layout', elements: [
      { label: 'Layout', path: 'variant', kind: 'select', choices: [
        { value: 'grid', label: 'Grid (uniform cards)' },
        { value: 'portfolio', label: 'Portfolio (varied sizes)' },
        { value: 'magazine', label: 'Magazine (alternating)' },
      ]},
    ]},
    // commonSectionStyleSections 가 typography (폰트/크기/줄간격) + 여백
    // (padding/margin) + section background + border + overlay 까지 모두
    // 인스펙터에 노출. 기존 'Design' 섹션 (variant/bgMode/backgroundColor)
    // 는 위 Layout 섹션 + 아래 common 섹션의 background 컨트롤로 흡수.
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const TEXT_IMAGE: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Eyebrow (optional)', path: 'eyebrow', kind: 'text', hint: 'Small category label above the headline' },
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle (optional)', path: 'subtitle', kind: 'text' },
      { label: 'Body', path: 'content', kind: 'html' },
      { label: 'Content Image', path: 'imageUrl', kind: 'image', hint: 'Split 의 한쪽에 들어가는 이미지' },
      { label: 'Background Image (optional)', path: 'backgroundImageUrl', kind: 'image', hint: '섹션 전체 뒤에 깔리는 배경 — Content Image 와 별개' },
    ]},
    { title: 'CTA Button (optional)', elements: [
      { label: 'CTA Button', path: 'button', kind: 'link-button', hint: '비워두면 버튼 숨김' },
    ]},
    { title: 'Block Options', elements: [
      { label: 'Layout (desktop)', path: 'variant', kind: 'select', choices: [
        { value: 'left', label: 'Image Left · Text Right' },
        { value: 'right', label: 'Image Right · Text Left' },
        { value: 'center', label: 'Center (image + text stacked)' },
      ], hint: 'Side the image lands on when desktop split is 50:50' },
      { label: 'Mobile Stack Order', path: 'mobileStackOrder', kind: 'select', choices: [
        { value: 'text-first', label: 'Text first · Image below' },
        { value: 'image-first', label: 'Image first · Text below' },
      ], hint: 'Order when stacking vertically on phone (not used for left/right desktop layouts)' },
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const TEXT_ONLY: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: '부제목 (Subtitle)', path: 'subtitle', kind: 'text' },
      { label: 'Body', path: 'content', kind: 'html' },
      { label: 'Background Image (optional)', path: 'backgroundImageUrl', kind: 'image', hint: '섹션 전체 뒤에 깔리는 배경' },
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const FEATURES_GRID: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      // Eyebrow — 'CURRENT STOCK' 같은 small caps 라벨이 헤드라인 위에
      // 들어감. FeaturesGridBlock 이 EyebrowElement 로 렌더하는데 인스펙터
      // 에서 누락되어 있어서 운영자가 자기 카피로 못 바꾸던 문제 (대표님
      // 2026-05-26).
      { label: 'Eyebrow (optional)', path: 'eyebrow', kind: 'text', hint: '헤드라인 위 작은 라벨 (예: CURRENT STOCK)' },
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'Background Image (optional)', path: 'backgroundImageUrl', kind: 'image', hint: '섹션 전체 뒤에 깔리는 배경' },
    ]},
    { title: 'Block Options', elements: [
      // Image style per card. FeaturesGridBlock renders all 3 modes:
      //   compact     — 48×48 small icon (current default, small thumbnail)
      //   image-card  — full-card 4:3 image + text below
      //   icon-large  — 80px circular large icon
      { label: 'Image Style', path: 'variant', kind: 'select', choices: [
        { value: 'compact',    label: 'Small Icon' },
        { value: 'image-card', label: 'Card-width Image' },
        { value: 'icon-large', label: 'Large Circle Icon' },
      ]},
      { label: 'Columns (desktop)', path: 'columns', kind: 'select', choices: [
        { value: '2', label: '2 columns' }, { value: '3', label: '3 columns' }, { value: '4', label: '4 columns' },
      ]},
      { label: 'Columns (mobile)', path: 'mobileColumns', kind: 'select', choices: [
        { value: '1', label: '1 column' }, { value: '2', label: '2 columns' },
      ], hint: 'How many cards per row on phone' },
      { label: 'Card Style', path: 'cardStyle', kind: 'select', choices: [
        { value: 'plain', label: 'Plain' }, { value: 'outline', label: 'Outlined' }, { value: 'elevated', label: 'Elevated' },
      ]},
      { label: 'Card Alignment', path: 'align', kind: 'select', choices: [
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]},
      // Card Background — section background 와 별개. 비우면 var(--surface)
      // (보통 흰색). dark section + dark cardBackground 조합도 가능.
      { label: 'Card Background', path: 'cardBackground', kind: 'color', hint: '비우면 테마 surface (흰색) 사용. palette key (primary/accent…) · hex · rgba 모두 가능' },
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const STATS_COUNTER: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Block Options', elements: [
      { label: 'Columns', path: 'columns', kind: 'select', choices: [
        { value: '2', label: '2 columns' }, { value: '3', label: '3 columns' }, { value: '4', label: '4 columns' },
      ]},
      { label: 'Number Alignment', path: 'align', kind: 'select', choices: [
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]},
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const TESTIMONIALS: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'Background Image (optional)', path: 'backgroundImageUrl', kind: 'image', hint: '섹션 전체 뒤에 깔리는 배경' },
    ]},
    { title: 'Block Options', elements: [
      { label: 'Layout', path: 'layout', kind: 'select', choices: [
        { value: 'grid-2', label: '2-column grid' }, { value: 'grid-3', label: '3-column grid' }, { value: 'single', label: 'Single quote' },
      ]},
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const PRICING_TABLE: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'Currency Symbol', path: 'currency', kind: 'text', hint: 'e.g. $, ₩, €' },
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const TEAM_MEMBERS: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Block Options', elements: [
      { label: 'Columns', path: 'columns', kind: 'select', choices: [
        { value: '2', label: '2 columns' }, { value: '3', label: '3 columns' }, { value: '4', label: '4 columns' },
      ]},
      { label: 'Photo Shape', path: 'photoStyle', kind: 'select', choices: [
        { value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' },
      ]},
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const FAQ_ACCORDION: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Block Options', elements: [
      { label: 'Columns', path: 'columns', kind: 'select', choices: [
        { value: '1', label: '1 column' }, { value: '2', label: '2 columns' },
      ]},
      // -1 = 모두 닫힘 / 0+ = 그 인덱스만 열림 / 'all' = 모두 열림 (특수
      // 값). 운영자가 'all' 도 입력 가능하도록 number kind 대신 text.
      { label: 'Default Open', path: 'defaultOpen', kind: 'text', hint: "-1 (모두 닫힘) · 0/1/2... (특정 항목) · all (모두 열림)" },
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const LOGO_BAR: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
    ]},
    { title: 'Block Options', elements: [
      { label: 'Grayscale', path: 'grayscale', kind: 'bool' },
      { label: 'Logo Alignment', path: 'align', kind: 'select', choices: [
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]},
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const QUOTE: BlockElementRegistry = {
  sections: [
    {
      title: 'Content',
      elements: [
        { label: 'Quote', path: 'quote', kind: 'html' },
        { label: 'Source', path: 'source', kind: 'text' },
        { label: 'Reference (book / URL)', path: 'reference', kind: 'text' },
        { label: 'Background Image', path: 'backgroundImageUrl', kind: 'image' },
      ],
    },
    ...commonSectionStyleSections(),
  ],
};

const VIDEO: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'YouTube URL', path: 'youtubeUrl', kind: 'url' },
    ]},
    ...commonSectionStyleSections(),
  ],
};

const IMAGE_GALLERY: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
    ]},
    ...commonSectionStyleSections(),
  ],
};

const SUBSCRIBE_FORM: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
      { label: 'Email Placeholder', path: 'placeholder', kind: 'text' },
      { label: 'Button Label', path: 'buttonText', kind: 'text' },
      { label: 'Success Message', path: 'successMessage', kind: 'text' },
      { label: 'Privacy Note', path: 'privacyText', kind: 'text' },
    ]},
    ...commonSectionStyleSections({
      bgModeChoices: DEFAULT_BG_MODE_CHOICES,
      designHint: '비우면 위 Background preset 사용',
    }),
  ],
};

const LOCATION_MAP: BlockElementRegistry = {
  sections: [{
    title: 'Location',
    elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Address', path: 'address', kind: 'text' },
      { label: 'Latitude', path: 'lat', kind: 'number' },
      { label: 'Longitude', path: 'lng', kind: 'number' },
      { label: 'Zoom', path: 'zoom', kind: 'number' },
    ],
  }],
};

const CONTACT_INFO: BlockElementRegistry = {
  sections: [{
    title: 'Contact',
    elements: [
      { label: 'Headline', path: 'title', kind: 'text', hint: 'Contact details are pulled from site settings' },
    ],
  }],
};

const CHECK_LIST: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Headline', path: 'title', kind: 'text' },
    ]},
    { title: 'Design', elements: [
      { label: 'Columns', path: 'columns', kind: 'select', choices: [
        { value: '1', label: '1 column' }, { value: '2', label: '2 columns' },
      ]},
      { label: 'Icon Style', path: 'iconStyle', kind: 'select', choices: [
        { value: 'check', label: 'Check' }, { value: 'arrow', label: 'Arrow' }, { value: 'dot', label: 'Dot' },
      ]},
    ]},
  ],
};

const STEPS_LIST: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Eyebrow (optional)', path: 'eyebrow', kind: 'text' },
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'Design', elements: [
      { label: 'Layout', path: 'layout', kind: 'select', choices: [
        { value: 'vertical', label: 'Vertical (long process)' }, { value: 'grid', label: 'Grid' }, { value: 'cards', label: 'Cards' },
      ]},
      { label: 'Columns per row', path: 'columns', kind: 'select', choices: [
        { value: '2', label: '2 per row' }, { value: '3', label: '3 per row' }, { value: '4', label: '4 per row' },
      ], hint: 'Grid / Cards layout only (blank = 3)' },
      { label: 'Indicator Mode', path: 'indicatorMode', kind: 'select', choices: [
        { value: 'icon', label: 'Icon + Number Badge' }, { value: 'number', label: 'Big Number' },
      ], hint: 'Blank = auto (based on whether items have icons)' },
      { label: 'Background', path: 'bgMode', kind: 'select', choices: [
        { value: 'none', label: 'None' }, { value: 'subtle', label: 'Subtle' }, { value: 'dark', label: 'Dark' }, { value: 'accent', label: 'Accent' },
      ]},
      { label: 'Background (custom)', path: 'backgroundColor', kind: 'color', hint: 'Blank uses preset above' },
    ]},
  ],
};

const TABS_BLOCK: BlockElementRegistry = {
  sections: [
    { title: 'Header', elements: [
      { label: 'Eyebrow (optional)', path: 'eyebrow', kind: 'text' },
      { label: 'Headline', path: 'title', kind: 'text' },
      { label: 'Subtitle', path: 'subtitle', kind: 'text' },
    ]},
    { title: 'CTA (optional)', elements: [
      { label: 'Button Label', path: 'buttonText', kind: 'text' },
      { label: 'Button URL', path: 'buttonUrl', kind: 'url' },
    ]},
    { title: 'Design', elements: [
      { label: 'Background', path: 'bgMode', kind: 'select', choices: [
        { value: 'none', label: 'None' }, { value: 'subtle', label: 'Subtle' }, { value: 'dark', label: 'Dark' }, { value: 'accent', label: 'Accent' },
      ]},
      { label: 'Background (custom)', path: 'backgroundColor', kind: 'color', hint: 'Blank uses preset above' },
    ]},
  ],
};

const DIVIDER: BlockElementRegistry = {
  sections: [{
    title: 'Divider',
    elements: [
      { label: 'Spacing', path: 'spacing', kind: 'select', choices: [
        { value: 'sm', label: 'Tight' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Loose' },
      ]},
    ],
  }],
};

/**
 * Per-item field metadata for list-bearing blocks. Mirrors what the
 * items[] editor accordion in ElementInspector renders. Lifted here
 * (out of ElementInspector) so LivePreviewPane's inline text editor can
 * also resolve `items[N].field` paths to a kind without importing the
 * inspector.
 */
export interface ItemFieldDef {
  label: string;
  key: string;
  kind: 'text' | 'html' | 'image' | 'icon' | 'url' | 'number' | 'bool' | 'select';
  /** For 'select' kind. */
  choices?: Array<{ value: string; label: string }>;
  /** Inline help text shown next to the field. */
  hint?: string;
}

export const ITEM_FIELDS_BY_TYPE: Record<string, ItemFieldDef[]> = {
  // products_showcase 의 items[] override — 운영자가 productId 입력해서
  // 자동 fetch 데이터 (sku / description) 대신 자기 카피로 덮어쓰기 +
  // 폰트/컬러 elementStyles 적용 (대표님 2026-05-26).
  products_showcase: [
    { label: 'Product ID', key: 'productId', kind: 'text', hint: '제품 관리에서 확인. 비우면 카드 매칭 안 됨' },
    { label: 'Title (override)', key: 'title', kind: 'text', hint: '비우면 제품의 자동 title 사용' },
    { label: 'Caption (override SKU)', key: 'caption', kind: 'text', hint: '비우면 제품의 SKU 자동 표시' },
    { label: 'Short description (override)', key: 'shortDescription', kind: 'html', hint: '비우면 제품 설명 자동 표시' },
  ],
  recent_products: [
    { label: 'Product ID', key: 'productId', kind: 'text', hint: '제품 관리에서 확인. 비우면 카드 매칭 안 됨' },
    { label: 'Title (override)', key: 'title', kind: 'text', hint: '비우면 제품의 자동 title 사용' },
    { label: 'Caption (override SKU)', key: 'caption', kind: 'text', hint: '비우면 제품의 SKU 자동 표시' },
    { label: 'Short description (override)', key: 'shortDescription', kind: 'html', hint: '비우면 제품 설명 자동 표시' },
  ],
  features_grid: [
    { label: 'Title', key: 'title', kind: 'text' },
    { label: 'Description', key: 'description', kind: 'html' },
    { label: 'Icon (optional)', key: 'iconName', kind: 'icon' },
    { label: 'Custom Image (overrides icon)', key: 'imageUrl', kind: 'image' },
    // Card content 아래 노출되는 버튼/링크. buttonStyle 가 'none' 이면
    // 안 보이고, 'button' 이면 ButtonElement filled, 'link' 이면
    // underline 텍스트 링크 (ButtonElement variant=link).
    { label: 'Button label', key: 'buttonLabel', kind: 'text' },
    { label: 'Button URL', key: 'buttonHref', kind: 'url' },
    { label: 'Button style', key: 'buttonStyle', kind: 'select', choices: [
      { value: 'none',   label: '없음' },
      { value: 'button', label: '버튼' },
      { value: 'link',   label: '텍스트 링크' },
    ]},
    { label: 'Open in new tab', key: 'buttonNewTab', kind: 'bool' },
  ],
  stats_counter: [
    { label: 'Value', key: 'value', kind: 'text' },
    { label: 'Label', key: 'label', kind: 'text' },
    { label: 'Unit (suffix)', key: 'unit', kind: 'text' },
    { label: 'Prefix', key: 'prefix', kind: 'text' },
  ],
  team_members: [
    { label: 'Name', key: 'name', kind: 'text' },
    { label: 'Role', key: 'role', kind: 'text' },
    { label: 'Photo URL', key: 'photoUrl', kind: 'image' },
    { label: 'Bio', key: 'bio', kind: 'html' },
  ],
  pricing_table: [
    { label: 'Plan Name', key: 'name', kind: 'text' },
    { label: 'Price', key: 'price', kind: 'text' },
    { label: 'Period', key: 'period', kind: 'text' },
    { label: 'Description', key: 'description', kind: 'text' },
    { label: 'Button Label', key: 'buttonText', kind: 'text' },
    { label: 'Button URL', key: 'buttonUrl', kind: 'url' },
    { label: 'Featured', key: 'featured', kind: 'bool' },
  ],
  testimonials: [
    { label: 'Quote', key: 'quote', kind: 'html' },
    { label: 'Author', key: 'author', kind: 'text' },
    { label: 'Role', key: 'role', kind: 'text' },
    { label: 'Company', key: 'company', kind: 'text' },
    { label: 'Avatar URL', key: 'avatarUrl', kind: 'image' },
    { label: 'Rating (1–5)', key: 'rating', kind: 'number' },
  ],
  faq_accordion: [
    { label: 'Question', key: 'question', kind: 'text' },
    { label: 'Answer', key: 'answer', kind: 'html' },
  ],
  logo_bar: [
    { label: 'Name', key: 'name', kind: 'text' },
    { label: 'Logo URL', key: 'logoUrl', kind: 'image' },
    { label: 'Link URL', key: 'linkUrl', kind: 'url' },
  ],
  check_list: [
    { label: 'Text', key: 'text', kind: 'text' },
    { label: 'Description', key: 'description', kind: 'text' },
  ],
  // Only the stats-strip variant uses items[] today; other variants
  // ignore them. Schema mirrors stats_counter so the agent can populate
  // the same way it already knows for stats blocks.
  cta_section: [
    { label: 'Value', key: 'value', kind: 'text' },
    { label: 'Label', key: 'label', kind: 'text' },
  ],
  timeline: [
    { label: 'Date', key: 'date', kind: 'text' },
    { label: 'Title', key: 'title', kind: 'text' },
    { label: 'Description', key: 'description', kind: 'text' },
    { label: 'Badge (optional)', key: 'badge', kind: 'text' },
  ],
  // comparison_table items[] are *rows*. Columns live separately on
  // props.columns (operator edits via the JSON editor for now — UI for
  // column-collection editing is a follow-up).
  comparison_table: [
    { label: 'Feature', key: 'feature', kind: 'text' },
  ],
  hotspot_image: [
    { label: 'X (%)', key: 'x', kind: 'number' },
    { label: 'Y (%)', key: 'y', kind: 'number' },
    { label: 'Title', key: 'title', kind: 'text' },
    { label: 'Description', key: 'description', kind: 'text' },
  ],
  shoppable_image: [
    { label: 'X (%)', key: 'x', kind: 'number' },
    { label: 'Y (%)', key: 'y', kind: 'number' },
    { label: 'Product ID', key: 'productId', kind: 'text' },
    { label: 'Label (optional)', key: 'label', kind: 'text' },
  ],
  lookbook_slider: [
    { label: 'Image URL', key: 'imageUrl', kind: 'image' },
    { label: 'Caption', key: 'caption', kind: 'text' },
    { label: 'Link URL (optional)', key: 'href', kind: 'url' },
  ],
  steps_list: [
    { label: 'Title', key: 'title', kind: 'text' },
    { label: 'Description', key: 'description', kind: 'text' },
    { label: 'Icon (optional)', key: 'iconName', kind: 'icon' },
    { label: 'Custom Image (overrides icon)', key: 'imageUrl', kind: 'image' },
    { label: 'Number (override)', key: 'number', kind: 'text' },
  ],
};

/**
 * Resolve a click-target path to its ElementSpec kind. Handles both
 * header-level paths (matched against ELEMENT_REGISTRY) and per-item
 * paths like `items[2].title` (matched against ITEM_FIELDS_BY_TYPE).
 * Returns null for unknown blockType / path combinations so the caller
 * can fall back to a sensible default (e.g. open the inspector).
 */
export function getElementKindForPath(blockType: string, path: string): ElementKind | null {
  const reg = ELEMENT_REGISTRY[blockType];
  if (reg) {
    for (const sec of reg.sections) {
      const spec = sec.elements.find((el) => el.path === path);
      if (spec) return spec.kind;
    }
  }
  const m = path.match(/^items\[(\d+)\]\.(.+)$/);
  if (m) {
    const itemFields = ITEM_FIELDS_BY_TYPE[blockType];
    if (itemFields) {
      const f = itemFields.find((x) => x.key === m[2]);
      if (f) return f.kind;
    }
  }
  return null;
}

// ─── dw-church domain blocks ─────────────────────────────────────────
// The registry above was ported from b2bsmart (product/catalog domain).
// These entries cover dw-church's church-specific blocks so the
// super-admin inspector renders proper controls — not the "No editor
// registered" dead-end — for every block in PageEditor BLOCK_DEFS.
//
// Field paths/kinds mirror packages/admin-app/src/pages/PageEditor.tsx
// BLOCK_DEFS verbatim so the inspector reads/writes exactly the keys the
// block renderers (apps/web/components/blocks + BlockRenderer) consume.
// BLOCK_DEFS stays the single source of truth; when it changes, mirror
// here. Structured-array fields (services / images / steps / tags) are
// edited via their dedicated widgets in the tenant PageEditor and are
// intentionally omitted from the scalar inspector.
type ChurchFieldType = 'text' | 'textarea' | 'image' | 'url' | 'number' | 'select' | 'color' | 'video-category';
interface ChurchField {
  key: string;
  label: string;
  type: ChurchFieldType;
  choices?: { value: string; label: string }[];
  hint?: string;
}
const CHURCH_KIND: Record<ChurchFieldType, ElementKind> = {
  text: 'text', textarea: 'html', image: 'image', url: 'url', number: 'number', select: 'select', color: 'color',
  'video-category': 'video-category',
};
function churchBlock(...sections: { title: string; fields: ChurchField[] }[]): BlockElementRegistry {
  return {
    sections: sections.map((s) => ({
      title: s.title,
      elements: s.fields.map((f) => {
        const spec: ElementSpec = { label: f.label, path: f.key, kind: CHURCH_KIND[f.type] };
        if (f.choices) spec.choices = f.choices;
        if (f.hint) spec.hint = f.hint;
        return spec;
      }),
    })),
  };
}
// Layout Block container style — the scalar props every Layout Block
// (row / columns / section) renders from. Children are arranged in the
// canvas, not here.
const LAYOUT_CONTAINER_FIELDS: ChurchField[] = [
  { key: 'padding', label: '패딩 (CSS)', type: 'text', hint: '예: 24px 또는 40px 24px' },
  { key: 'margin', label: '마진 (CSS)', type: 'text' },
  { key: 'backgroundColor', label: '배경색', type: 'color' },
  { key: 'backgroundImageUrl', label: '배경 이미지', type: 'image' },
  { key: 'backgroundImagePosition', label: '배경 이미지 위치', type: 'select', hint: '배경 이미지에서 보여줄 부분(초점)', choices: [
    { value: 'center', label: '가운데 (기본)' },
    { value: 'top', label: '상단 중앙' },
    { value: 'bottom', label: '하단 중앙' },
    { value: 'left', label: '좌측 중앙' },
    { value: 'right', label: '우측 중앙' },
    { value: 'top-left', label: '좌측 상단' },
    { value: 'top-right', label: '우측 상단' },
    { value: 'bottom-left', label: '좌측 하단' },
    { value: 'bottom-right', label: '우측 하단' },
  ]},
  { key: 'overlayColor', label: '오버레이 색상', type: 'color' },
  { key: 'overlayOpacity', label: '오버레이 투명도 (%)', type: 'number' },
  { key: 'borderColor', label: '테두리 색상', type: 'color' },
  { key: 'borderWidth', label: '테두리 두께 (px)', type: 'number' },
  { key: 'borderRadius', label: '모서리 둥글기 (px)', type: 'number' },
  { key: 'linkUrl', label: '링크 URL', type: 'url' },
  { key: 'linkTarget', label: '링크 타겟', type: 'select', choices: [
    { value: '_self', label: '현재 창' }, { value: '_blank', label: '새 창' },
  ]},
];

const PASTOR_MESSAGE = churchBlock(
  { title: 'Content', fields: [
    { key: 'eyebrow', label: '라벨(작은 윗글)', type: 'text', hint: '예: 인사말 · 담임목사' },
    { key: 'title', label: '섹션 제목', type: 'text' },
    { key: 'subtitle', label: '부제목', type: 'text' },
    { key: 'pastorName', label: '이름', type: 'text' },
    { key: 'pastorTitle', label: '직함', type: 'text' },
    { key: 'message', label: '인사말', type: 'textarea' },
    { key: 'imageUrl', label: '사진', type: 'image' },
  ]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'right', label: '사진 우측' }, { value: 'left', label: '사진 좌측' },
    ]},
    { key: 'columnRatio', label: '글:사진 비율', type: 'select', hint: '두 컬럼의 너비 비율 (글:사진)', choices: [
      { value: '1-1', label: '1 : 1 (균등)' },
      { value: '3-2', label: '3 : 2 (글 크게)' },
      { value: '2-1', label: '2 : 1 (글 더 크게 · 사진 작게)' },
      { value: '3-1', label: '3 : 1 (글 매우 크게)' },
      { value: '2-3', label: '2 : 3 (사진 크게)' },
    ]},
  ]},
);
const CHURCH_INTRO = churchBlock(
  { title: 'Content', fields: [
    { key: 'eyebrow', label: '라벨(작은 윗글)', type: 'text' },
    { key: 'title', label: '제목', type: 'text' },
    { key: 'subtitle', label: '부제목', type: 'text' },
    { key: 'content', label: '소개글', type: 'textarea' },
    { key: 'imageUrl', label: '이미지', type: 'image' },
  ]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'with-image', label: '이미지 포함' }, { value: 'text-only', label: '텍스트만' },
    ]},
  ]},
);
const RECENT_SERMONS = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 6' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'grid-4', label: '4 columns' }, { value: 'grid-3', label: '3 columns' },
      { value: 'grid-2', label: '2 columns' }, { value: 'list', label: 'List' },
    ]},
  ]},
);
const RECENT_BULLETINS = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 6' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'list', label: 'List' }, { value: 'grid-2', label: '2 columns' },
      { value: 'grid-3', label: '3 columns' }, { value: 'grid-4', label: '4 columns' },
      { value: 'grid-5', label: '5 columns' }, { value: 'grid-6', label: '6 columns' },
    ]},
  ]},
);
const RECENT_COLUMNS = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 6' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'grid-3', label: '3 columns' }, { value: 'grid-2', label: '2 columns' },
      { value: 'grid-4', label: '4 columns' }, { value: 'list', label: 'List' },
    ]},
  ]},
);
const VIDEO_BOARD = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'category', label: '카테고리', type: 'video-category', hint: '영상 게시판에서 등록한 카테고리에서 선택 (비우면 전체)' },
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 6' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'grid-1', label: '1 column (large)' }, { value: 'grid-2', label: '2 columns' },
      { value: 'grid-3', label: '3 columns' }, { value: 'grid-4', label: '4 columns' },
    ]},
  ]},
);
const SCHEDULE_BOARD = churchBlock(
  { title: 'Data', fields: [
    { key: 'imageUrl', label: '이미지', type: 'image', hint: '예배/모임 표 옆 사진 (없음 선택 시 숨김)' },
    { key: 'imagePosition', label: '이미지 위치', type: 'select', choices: [
      { value: 'left', label: '좌측' }, { value: 'right', label: '우측' }, { value: 'none', label: '없음' },
    ]},
  ]},
  { title: 'Design', fields: [
    { key: 'imageHeight', label: '이미지 높이', type: 'number', hint: '비우면 기본 3:4 비율. 단위는 아래에서 선택.' },
    { key: 'imageHeightUnit', label: '높이 단위', type: 'select', choices: [
      { value: 'px', label: 'px (고정)' }, { value: 'vh', label: 'vh (화면 높이 비율)' },
    ]},
    { key: 'imageFit', label: '이미지 채움', type: 'select', choices: [
      { value: 'cover', label: '커버드 (꽉 채우고 잘림)' }, { value: 'contain', label: '컨텐트 (전체 보임)' },
    ]},
    { key: 'imageGap', label: '사진-표 간격 (px)', type: 'number', hint: '비우면 기본 40px' },
  ]},
);
const EVENT_GRID = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 4' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'cards-4', label: '4 columns' }, { value: 'cards-3', label: '3 columns' },
      { value: 'cards-2', label: '2 columns' },
    ]},
  ]},
);
const STAFF_GRID = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 20' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'grid-4', label: '4 columns' }, { value: 'grid-3', label: '3 columns' },
      { value: 'grid-2', label: '2 columns' }, { value: 'grouped', label: '직분별 그룹' },
    ]},
    { key: 'groupBy', label: '그룹 기준', type: 'select', choices: [
      { value: 'role', label: '직분 (role)' }, { value: 'department', label: '부서 (department)' },
    ], hint: 'grouped 변형에서만 사용' },
  ]},
);
const CELL_GRID = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Data', fields: [
    { key: 'limit', label: '표시 개수', type: 'number', hint: '기본 24' },
    { key: 'variant', label: 'Columns', type: 'select', choices: [
      { value: 'grid-3', label: '3 columns' }, { value: 'grid-2', label: '2 columns' },
      { value: 'grid-4', label: '4 columns' },
    ]},
  ]},
);
const HISTORY_TIMELINE = churchBlock(
  { title: 'Header', fields: [{ key: 'title', label: '제목', type: 'text' }]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'left', label: '좌측' }, { value: 'alternating', label: '교차' },
    ]},
  ]},
);
const WORSHIP_TIMES = churchBlock(
  { title: 'Content', fields: [
    { key: 'eyebrow', label: '라벨(작은 윗글)', type: 'text' },
    { key: 'title', label: '제목', type: 'text', hint: '예배/모임 목록은 콘텐츠 관리에서 편집합니다' },
  ]},
);
const MAP_EMBED = churchBlock(
  { title: 'Location', fields: [
    { key: 'title', label: '제목', type: 'text' },
    { key: 'address', label: '주소', type: 'text' },
  ]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'full', label: '전체 너비' }, { value: 'with-info', label: '정보 포함' },
    ]},
  ]},
);
const ADDRESS_INFO = churchBlock(
  { title: 'Contact', fields: [
    { key: 'title', label: '제목', type: 'text' },
    { key: 'address', label: '주소', type: 'text' },
    { key: 'phone', label: '전화', type: 'text' },
    { key: 'email', label: '이메일', type: 'text' },
  ]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'cards', label: '카드' }, { value: 'inline', label: '인라인' },
    ]},
  ]},
);
const VISITOR_WELCOME = churchBlock(
  { title: 'Content', fields: [
    { key: 'title', label: '제목', type: 'text' },
    { key: 'subtitle', label: '부제목', type: 'text' },
    // NewcomerInfoBlock renders props.content (the old 'message' key was never
    // read → the welcome text never showed). Use 'content' so it actually renders.
    { key: 'content', label: '환영 메시지', type: 'textarea' },
    { key: 'imageUrl', label: '이미지', type: 'image' },
  ]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'split', label: '분할' }, { value: 'centered', label: '중앙' },
    ]},
  ]},
);
const FIRST_TIME_GUIDE = churchBlock(
  { title: 'Content', fields: [
    { key: 'title', label: '제목', type: 'text', hint: '단계 항목은 콘텐츠 관리에서 편집합니다' },
  ]},
  { title: 'Design', fields: [
    { key: 'variant', label: '레이아웃', type: 'select', choices: [
      { value: 'numbered', label: '번호' }, { value: 'icons', label: '아이콘' },
    ]},
  ]},
);
const NEWCOMER_INFO = churchBlock(
  { title: 'Content', fields: [
    { key: 'title', label: '제목', type: 'text' },
    { key: 'subtitle', label: '부제목', type: 'text' },
    { key: 'content', label: '내용', type: 'textarea' },
    { key: 'imageUrl', label: '이미지', type: 'image' },
  ]},
);
// 헌금 안내 — 온라인 헌금 '방법' 안내 (결제 처리 아님). 채워진 방법만 노출.
const GIVING_INFO = churchBlock(
  { title: 'Content', fields: [
    { key: 'title', label: '제목', type: 'text' },
    { key: 'intro', label: '안내문', type: 'textarea' },
    { key: 'zelle', label: 'Zelle (이메일/전화)', type: 'text' },
    { key: 'bankInfo', label: '계좌 이체 정보', type: 'text' },
    { key: 'mailingName', label: '체크 수취인 (교회명)', type: 'text' },
    { key: 'mailingAddress', label: '우편 주소', type: 'text' },
    { key: 'note', label: '추가 안내', type: 'textarea' },
    { key: 'qrImageUrl', label: 'QR 이미지', type: 'image' },
  ]},
);
const WORSHIP_SCHEDULE = churchBlock(
  { title: 'Content', fields: [
    { key: 'eyebrow', label: '라벨(작은 윗글)', type: 'text' },
    { key: 'title', label: '제목', type: 'text', hint: '예배 시간은 콘텐츠 관리에서 편집합니다' },
  ]},
);
// schedule_split — 이미지 + N개의 제목 표 (주일예배 / 교육부 / 주중모임 …).
// 'groups' kind 가 props.groups 배열을 ScheduleGroupsField 로 편집. churchBlock
// 헬퍼는 scalar field 만 지원하므로 registry 를 직접 구성.
const SCHEDULE_SPLIT: BlockElementRegistry = {
  sections: [
    { title: 'Content', elements: [
      { label: '이미지', path: 'imageUrl', kind: 'image' },
      { label: '이미지 위치', path: 'imagePosition', kind: 'select', choices: [
        { value: 'left', label: '왼쪽' }, { value: 'right', label: '오른쪽' },
      ]},
      { label: '예배 / 모임 표', path: 'groups', kind: 'groups' },
    ]},
    { title: 'Design', elements: [
      { label: '이미지 높이', path: 'imageHeight', kind: 'number' },
      { label: '높이 단위', path: 'imageHeightUnit', kind: 'select', choices: [
        { value: 'px', label: 'px (고정)' }, { value: 'vh', label: 'vh (화면 높이 비율)' },
      ]},
      { label: '이미지 채움', path: 'imageFit', kind: 'select', choices: [
        { value: 'cover', label: '커버드 (꽉 채우고 잘림)' }, { value: 'contain', label: '컨텐트 (전체 보임)' },
      ]},
      { label: '사진-표 간격 (px)', path: 'imageGap', kind: 'number' },
    ]},
  ],
};
const LAYOUT_ROW = churchBlock(
  { title: 'Layout', fields: [
    { key: 'gap', label: '간격 (px)', type: 'number' },
    { key: 'divider', label: '구분선 표시', type: 'select', choices: [
      { value: '', label: '없음' }, { value: 'true', label: '있음' },
    ]},
    { key: 'dividerColor', label: '구분선 색상', type: 'color' },
  ]},
  { title: 'Container', fields: LAYOUT_CONTAINER_FIELDS },
);
const LAYOUT_COLUMNS = churchBlock(
  { title: 'Layout', fields: [
    { key: 'layout', label: '열 수', type: 'select', choices: [
      { value: 'columns-2', label: '2열' }, { value: 'columns-3', label: '3열' }, { value: 'columns-4', label: '4열' },
    ]},
    { key: 'gap', label: '간격 (px)', type: 'number' },
  ]},
  { title: 'Container', fields: LAYOUT_CONTAINER_FIELDS },
);
const LAYOUT_SECTION = churchBlock(
  { title: 'Layout', fields: [
    { key: 'maxWidth', label: '최대 너비', type: 'select', choices: [
      { value: '7xl', label: '7xl (기본)' }, { value: '5xl', label: '5xl (좁게)' }, { value: 'full', label: '전체' },
    ]},
  ]},
  { title: 'Container', fields: LAYOUT_CONTAINER_FIELDS },
);

export const ELEMENT_REGISTRY: Record<string, BlockElementRegistry> = {
  // ─── dw-church domain blocks ───────────────────────────────────────
  pastor_message:   PASTOR_MESSAGE,
  church_intro:     CHURCH_INTRO,
  recent_sermons:   RECENT_SERMONS,
  recent_bulletins: RECENT_BULLETINS,
  recent_columns:   RECENT_COLUMNS,
  video_board:      VIDEO_BOARD,
  schedule_board:   SCHEDULE_BOARD,
  event_grid:       EVENT_GRID,
  staff_grid:       STAFF_GRID,
  cell_grid:        CELL_GRID,
  history_timeline: HISTORY_TIMELINE,
  worship_times:    WORSHIP_TIMES,
  worship_schedule: WORSHIP_SCHEDULE,
  schedule_split:   SCHEDULE_SPLIT,
  map_embed:        MAP_EMBED,
  address_info:     ADDRESS_INFO,
  visitor_welcome:  VISITOR_WELCOME,
  first_time_guide: FIRST_TIME_GUIDE,
  newcomer_info:    NEWCOMER_INFO,
  giving_info:      GIVING_INFO,
  layout_row:       LAYOUT_ROW,
  layout_columns:   LAYOUT_COLUMNS,
  layout_section:   LAYOUT_SECTION,

  hero_banner:     HERO_BANNER,
  hero_full_width: HERO_BANNER,

  cta_section:     CTA_SECTION,
  call_to_action:  CTA_SECTION,

  spacer:            SPACER,
  timeline:          TIMELINE,
  contact_form:      CONTACT_FORM,
  cell_report:       CELL_REPORT,
  products_showcase: PRODUCTS_SHOWCASE,
  recent_products:   PRODUCTS_SHOWCASE,
  comparison_table: COMPARISON_TABLE,
  before_after:     BEFORE_AFTER,
  hotspot_image:    HOTSPOT_IMAGE,
  shoppable_image:  SHOPPABLE_IMAGE,
  lookbook_slider:  LOOKBOOK_SLIDER,
  countdown_sale:   COUNTDOWN_SALE,
  catalog_archive:  CATALOG_ARCHIVE,
  catalog_showcase: CATALOG_SHOWCASE,
  product_detail_view: PRODUCT_DETAIL_VIEW,
  blog_post_view: BLOG_POST_VIEW,
  application_form_embed: APPLICATION_FORM_EMBED,
  form_split: FORM_SPLIT,
  album_gallery:    ALBUM_GALLERY,
  banner_slider:    BANNER_SLIDER,
  hero_image_slider:BANNER_SLIDER,
  recent_blog_posts:RECENT_BLOG_POSTS,
  board:            BOARD,
  catalog_cover:           CATALOG_COVER,
  catalog_toc:             CATALOG_TOC,
  catalog_product_page:    CATALOG_PRODUCT_PAGE,
  catalog_product_gallery: CATALOG_PRODUCT_GALLERY,
  catalog_back_cover:      CATALOG_BACK_COVER,

  text_image:      TEXT_IMAGE,
  hero_split:      TEXT_IMAGE,
  business_intro:  TEXT_IMAGE,

  text_only:        TEXT_ONLY,
  mission_vision:   TEXT_ONLY,
  newsletter_signup:TEXT_ONLY,
  section_header:   TEXT_ONLY,

  features_grid:   FEATURES_GRID,
  stats_counter:   STATS_COUNTER,
  testimonials:    TESTIMONIALS,
  pricing_table:   PRICING_TABLE,
  team_members:    TEAM_MEMBERS,
  faq_accordion:   FAQ_ACCORDION,
  logo_bar:        LOGO_BAR,
  check_list:      CHECK_LIST,
  steps_list:      STEPS_LIST,
  tabs:            TABS_BLOCK,

  quote_block:     QUOTE,
  video:           VIDEO,
  image_gallery:   IMAGE_GALLERY,
  subscribe_form:  SUBSCRIBE_FORM,
  location_map:    LOCATION_MAP,
  contact_info:    CONTACT_INFO,
  divider:         DIVIDER,
};

/**
 * Read a value out of a props bag using a dot-separated path. Returns
 * `undefined` for missing intermediates.
 */
/**
 * Parse a dot-notation path with optional array indices into individual
 * segments. Supports `title`, `items[3]`, `items[3].imageUrl`, and
 * chained indices like `rows[0].columns[2].title`.
 *
 *   'items[3].imageUrl' → ['items', '3', 'imageUrl']
 *   'title'             → ['title']
 *
 * Without this split, the registry-supplied elementKey `items[3].imageUrl`
 * is looked up under the literal key `items[3]` (not the array), so the
 * inspector reads / writes the wrong key and the operator sees
 * "이미지가 인스펙터엔 안 보이고, 변경해도 적용 안 됨" — root cause of
 * the 2026-05-27 builder bug.
 */
function parsePath(path: string): string[] {
  const out: string[] = [];
  for (const seg of path.split('.')) {
    const m = seg.match(/^([^[]+)((?:\[\d+\])*)$/);
    if (!m) {
      out.push(seg);
      continue;
    }
    out.push(m[1]!);
    if (m[2]) {
      for (const idx of m[2].matchAll(/\[(\d+)\]/g)) out.push(idx[1]!);
    }
  }
  return out;
}

export function getByPath(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj) return undefined;
  const parts = parsePath(path);
  let cur: unknown = obj;
  for (const p of parts) {
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

/**
 * Immutably set a value at a dot path inside a props bag. Creates
 * intermediate objects / arrays as needed (next segment numeric → array,
 * otherwise object). Returns a new top-level bag with copies along the
 * write path.
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = parsePath(path);
  if (parts.length === 0) return obj;

  function walk(node: unknown, depth: number): unknown {
    const key = parts[depth]!;
    const isLast = depth === parts.length - 1;
    if (isLast) {
      if (Array.isArray(node)) {
        const idx = Number(key);
        const next = node.slice();
        next[idx] = value;
        return next;
      }
      const cur = node && typeof node === 'object'
        ? { ...(node as Record<string, unknown>) }
        : {};
      cur[key] = value;
      return cur;
    }
    const childIsArray = /^\d+$/.test(parts[depth + 1]!);
    const fallback = childIsArray ? [] : {};
    if (Array.isArray(node)) {
      const idx = Number(key);
      const next = node.slice();
      next[idx] = walk(next[idx] ?? fallback, depth + 1);
      return next;
    }
    const cur = node && typeof node === 'object'
      ? { ...(node as Record<string, unknown>) }
      : {};
    cur[key] = walk(cur[key] ?? fallback, depth + 1);
    return cur;
  }

  return walk(obj, 0) as Record<string, unknown>;
}
