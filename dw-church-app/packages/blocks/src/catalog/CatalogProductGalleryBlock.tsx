/**
 * Catalog product gallery spread — fashion-magazine style photo
 * showcase for a product's secondary images (images[1..N]). Pairs with
 * CatalogProductPageBlock: the product page renders the hero photo +
 * caption; this block fills the following spread(s) with a full-bleed
 * editorial layout of the remaining shots so the catalog reads as a
 * proper portfolio.
 *
 * Operator workflow (per CEO directive 2026-05-25):
 *   1. Add CatalogProductPage for the product → spread N (hero shot).
 *   2. Add CatalogProductGallery for the SAME productId → spread N+1.
 *   3. Add another CatalogProductGallery with rangeStart=4 for more
 *      images → spread N+2. And so on.
 *
 * Image source resolution mirrors CatalogProductPageBlock — the
 * storefront server fetches the product by productId and injects
 * `props.product` before render. Admin canvas's catalog preview
 * pre-fetches the same way.
 *
 * Layout variants (selected via the catalog's spread `style`):
 *   editorial — 2-photo asymmetric magazine spread (large left + 2-up right)
 *   grid      — uniform 2x2 / 3x2 grid (operator picks `columns`)
 *   corporate — labeled 2x2 grid with caption strip
 */

import {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
} from '../utilities/catalog-page';
import { getStarterVisuals, normalizeStarterStyle } from '../utilities/catalog-starter-visuals';

interface ResolvedProduct {
  title?: string;
  sku?: string | null;
  description?: string | null;
  images?: Array<{ url: string; alt?: string }>;
}

interface CatalogProductGalleryBlockProps {
  props: Record<string, unknown>;
}

export function CatalogProductGalleryBlock({ props }: CatalogProductGalleryBlockProps) {
  const productId = (props.productId as string) || '';
  const product = (props.product as ResolvedProduct | undefined) ?? null;
  const style = normalizeStarterStyle(props.style as string | undefined);
  const v = getStarterVisuals(style);

  // images[0] = hero (rendered by the sibling CatalogProductPage block,
  // not here). Default rangeStart=1 to start at the second image; the
  // operator can shift it to paginate (e.g. rangeStart=5 for spread 3).
  const rangeStart = typeof props.rangeStart === 'number' ? (props.rangeStart as number) : 1;
  // Max photos per spread:
  //   editorial = 8 (mosaic 1~8c variants cover 1-8 photos per spread).
  //   grid / corporate = columns × rows (operator-picked grid density).
  // 2026-05-26 운영자 지시: 이전엔 editorial max=3 으로 짤려 spread 당
  // 3장만 노출돼서 사진이 많은 제품에서 다수 손실. mosaic 최대치까지
  // 풀어줘서 모든 사진이 다 화보에 들어가도록.
  const columnsRaw = props.columns as '2' | '3' | undefined;
  const columns = columnsRaw === '3' ? 3 : 2;
  const rowsRaw = props.rows as '2' | '3' | undefined;
  const rows = rowsRaw === '3' ? 3 : 2;
  const max = style === 'editorial' ? 8 : columns * rows;

  const allImages = product?.images ?? [];
  // 운영자가 인스펙터에서 drag-drop 으로 순서 지정한 경우 imageOrder
  // (= product.images 의 인덱스 배열). 미지정 시 기본 rangeStart 슬라이스.
  // 대표님 요청 2026-05-27 — "보여지는 사진의 순서를 드래그앤드롭으로".
  const imageOrder = Array.isArray(props.imageOrder) ? (props.imageOrder as number[]) : null;
  let slice: Array<{ url: string; alt?: string }>;
  if (imageOrder && imageOrder.length > 0) {
    slice = imageOrder
      .map((idx) => allImages[idx])
      .filter((img): img is { url: string; alt?: string } => !!img)
      .slice(0, max);
  } else {
    slice = allImages.slice(rangeStart, rangeStart + max);
  }
  const title = product?.title ?? '';

  // Page background override — 운영자가 인스펙터에서 'Page Background
  // (override)' 컬러 입력하면 v.paper 대신 그 값 사용. 비우면 page style
  // 의 기본 paper.
  const pageBackgroundColor = (props.pageBackgroundColor as string) || '';
  const paper = pageBackgroundColor || v.paper;

  // Empty state — operator added the block but no extra images yet.
  if (slice.length === 0) {
    return (
      <div
        className={CATALOG_SPREAD_CLASS}
        style={{
          aspectRatio: CATALOG_SPREAD_ASPECT,
          background: paper,
          borderColor: v.rule,
          color: v.inkMuted,
          fontFamily: v.bodyFamily,
        }}
      >
        <div className="absolute inset-0 grid place-items-center text-xs px-12 text-center">
          {productId
            ? `'${title || 'Product'}' has no additional photos (rangeStart=${rangeStart}). Add more images to the product or adjust rangeStart.`
            : 'Select a product in the inspector'}
        </div>
      </div>
    );
  }

  if (style === 'editorial') {
    // Spread index derived from rangeStart so consecutive auto-gallery
    // pages of the same product alternate layouts (variant A / B).
    const spreadIndex = Math.max(0, Math.floor((rangeStart - 1) / 4));
    const galleryLayout = (props.galleryLayout as string) || 'auto';
    return (
      <EditorialSpread
        slice={slice}
        title={title}
        v={v}
        paper={paper}
        spreadIndex={spreadIndex}
        galleryLayout={galleryLayout}
      />
    );
  }
  if (style === 'corporate') {
    return <CorporateSpread slice={slice} title={title} v={v} paper={paper} columns={columns} rows={rows} />;
  }
  return <GridSpread slice={slice} title={title} v={v} paper={paper} columns={columns} rows={rows} />;
}

/* ─── editorial — magazine portfolio spread ─────────────────
 * Layout is chosen by image count AND spread index so consecutive
 * gallery spreads in the same catalog don't repeat the same mosaic.
 * Mirrors the reference magazine portfolios the CEO pointed at —
 * each spread has its own asymmetric / mosaic / large-and-small mix.
 */
type Img = { url: string; alt?: string };

/** Maps inspector-facing layout keys (운영자가 select 로 고른 값) to the
 *  internal mosaic id. 'auto' (또는 미지정) 일 때 사진 수 × spreadIndex
 *  기반 자동 회전. 명시 선택은 mosaic 고정 — 사진 부족하면 빈 셀로. */
const OPERATOR_LAYOUT_TO_MOSAIC: Record<string, string> = {
  'single':        'magazine1',
  'split-2':       'magazine2a',
  'wide-narrow':   'magazine2b',
  'large-2up':     'magazine3a',
  'strip-3':       'magazine3b',
  'top-2down':     'magazine3c',
  'grid-2x2':      'magazine4a',
  'hero-3thumb':   'magazine4b',
  'golden-1to3':   'magazine4c',
  'hero-2x2':      'magazine5a',
  '4thumb-hero':   'magazine5b',
  'feature-5':     'magazine6a',
  'grid-3x2':      'magazine6b',
  'huge-5thumb':   'magazine6c',
  'mixed-3col':    'magazine7a',
  'hero-6grid':    'magazine7b',
  'grid-4x2':      'magazine8a',
  'windmill':      'magazine8b',
  'magazine-5-3':  'magazine8c',
};

function EditorialSpread({
  slice,
  title,
  v,
  paper,
  spreadIndex = 0,
  galleryLayout,
}: {
  slice: Img[];
  title: string;
  v: ReturnType<typeof getStarterVisuals>;
  /** Resolved page background (operator override || v.paper). */
  paper: string;
  spreadIndex?: number;
  /** Operator-picked layout. 'auto' (or undefined) → 사진 수 + spreadIndex
   *  로 자동 회전. 명시 선택 → 그 mosaic 고정. */
  galleryLayout?: string;
}) {
  // 운영자 명시 선택 우선 — registry 의 galleryLayout select 값이
  // OPERATOR_LAYOUT_TO_MOSAIC 에 매핑되어 있으면 그 mosaic 강제.
  const explicit = galleryLayout && galleryLayout !== 'auto'
    ? OPERATOR_LAYOUT_TO_MOSAIC[galleryLayout]
    : undefined;
  // 자동 분기 — count + spreadIndex. 15 distinct mosaics covering 1-9
  // photo counts. spreadIndex 가 A/B/C 변형 회전 → 연속 spread 가 다르게.
  const n = slice.length;
  const auto =
    n >= 8 ? (['magazine8a', 'magazine8b', 'magazine8c'] as const)[spreadIndex % 3]
    : n === 7 ? (['magazine7a', 'magazine7b'] as const)[spreadIndex % 2]
    : n === 6 ? (['magazine6a', 'magazine6b', 'magazine6c'] as const)[spreadIndex % 3]
    : n === 5 ? (['magazine5a', 'magazine5b'] as const)[spreadIndex % 2]
    : n === 4 ? (['magazine4a', 'magazine4b', 'magazine4c'] as const)[spreadIndex % 3]
    : n === 3 ? (['magazine3a', 'magazine3b', 'magazine3c'] as const)[spreadIndex % 3]
    : n === 2 ? (['magazine2a', 'magazine2b'] as const)[spreadIndex % 2]
    : 'magazine1';
  const layoutId = explicit ?? auto;

  return (
    <div
      className={CATALOG_SPREAD_CLASS}
      style={{
        aspectRatio: CATALOG_SPREAD_ASPECT,
        background: paper,
        borderColor: v.rule,
        color: v.ink,
        fontFamily: v.bodyFamily,
      }}
    >
      {/* Top header — product name + spread index. Tiny but always
          visible so the operator (and end-user) knows which product
          this gallery belongs to. CEO directive 2026-05-25. */}
      {title && (
        <div
          className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-6 pointer-events-none"
        >
          <div
            className="text-[10px] font-mono uppercase tracking-[0.2em]"
            style={{ color: v.inkMuted }}
          >
            {title}
          </div>
          <div
            className="text-[10px] font-mono uppercase"
            style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
          >
            {v.productEyebrow} · {String(spreadIndex + 1).padStart(2, '0')}
          </div>
        </div>
      )}
      {/* Mosaic content area — top/bottom insets reserve room for the
          header + page footer (PAGE NN) the CatalogReader prints. */}
      <div className="absolute left-6 right-6" style={{ top: '36px', bottom: '36px' }}>
        {layoutId === 'magazine1' && <Mosaic1 slice={slice} title={title} v={v} />}
        {layoutId === 'magazine2a' && <Mosaic2 slice={slice} title={title} v={v} />}
        {layoutId === 'magazine2b' && <Mosaic2b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine3a' && <Mosaic3a slice={slice} title={title} v={v} />}
        {layoutId === 'magazine3b' && <Mosaic3b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine3c' && <Mosaic3c slice={slice} title={title} v={v} />}
        {layoutId === 'magazine4a' && <Mosaic4a slice={slice} title={title} v={v} />}
        {layoutId === 'magazine4b' && <Mosaic4b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine4c' && <Mosaic4c slice={slice} title={title} v={v} />}
        {layoutId === 'magazine5a' && <Mosaic5 slice={slice} title={title} v={v} />}
        {layoutId === 'magazine5b' && <Mosaic5b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine6a' && <Mosaic6a slice={slice} title={title} v={v} />}
        {layoutId === 'magazine6b' && <Mosaic6b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine6c' && <Mosaic6c slice={slice} title={title} v={v} />}
        {layoutId === 'magazine7a' && <Mosaic7a slice={slice} title={title} v={v} />}
        {layoutId === 'magazine7b' && <Mosaic7b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine8a' && <Mosaic8a slice={slice} title={title} v={v} />}
        {layoutId === 'magazine8b' && <Mosaic8b slice={slice} title={title} v={v} />}
        {layoutId === 'magazine8c' && <Mosaic8c slice={slice} title={title} v={v} />}
      </div>
    </div>
  );
}

function Tile({
  img,
  title,
  v,
  className,
  style,
}: {
  img: Img | undefined;
  title: string;
  v: ReturnType<typeof getStarterVisuals>;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: v.imagePlaceholderBg, ...style }}
    >
      {img && (
        <img src={img.url} alt={img.alt ?? title} loading="lazy" decoding="async"
          className="absolute inset-0 w-full h-full object-cover" />
      )}
    </div>
  );
}

/* 1 photo → full-bleed cinematic */
function Mosaic1({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return <Tile img={slice[0]} title={title} v={v} className="absolute inset-0" />;
}

/* 2 photos → side-by-side portrait + portrait */
function Mosaic2({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-3">
      <Tile img={slice[0]} title={title} v={v} />
      <Tile img={slice[1]} title={title} v={v} />
    </div>
  );
}

/* 3 photos — variant A: 1 large left + 2 stacked right */
function Mosaic3a({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-rows-2 gap-3">
        <Tile img={slice[1]} title={title} v={v} />
        <Tile img={slice[2]} title={title} v={v} />
      </div>
    </div>
  );
}

/* 3 photos — variant B: 3-column equal strip */
function Mosaic3b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-3 gap-3">
      <Tile img={slice[0]} title={title} v={v} />
      <Tile img={slice[1]} title={title} v={v} />
      <Tile img={slice[2]} title={title} v={v} />
    </div>
  );
}

/* 4 photos — variant A: 2x2 uniform magazine grid */
function Mosaic4a({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-3">
      {slice.slice(0, 4).map((img, i) => (
        <Tile key={i} img={img} title={title} v={v} />
      ))}
    </div>
  );
}

/* 4 photos — variant B: featured hero + 3 small thumbnail strip */
function Mosaic4b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: '3fr 1fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-cols-3 gap-3">
        <Tile img={slice[1]} title={title} v={v} />
        <Tile img={slice[2]} title={title} v={v} />
        <Tile img={slice[3]} title={title} v={v} />
      </div>
    </div>
  );
}

/* 5 photos — large hero + 4-tile collage */
function Mosaic5({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '5fr 4fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-cols-2 grid-rows-2 gap-3">
        <Tile img={slice[1]} title={title} v={v} />
        <Tile img={slice[2]} title={title} v={v} />
        <Tile img={slice[3]} title={title} v={v} />
        <Tile img={slice[4]} title={title} v={v} />
      </div>
    </div>
  );
}

/* 6+ photos — variant A: 3x2 magazine collage with one large feature */
function Mosaic6a({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  // Featured tile (slice[0]) spans 2 columns + 2 rows; remaining 4 in a 2x2 grid on the right.
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-cols-1 gap-3" style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
        {slice.slice(1, 6).map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
    </div>
  );
}

/* 6+ photos — variant B: 3-column uniform grid with 2 rows */
function Mosaic6b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-3">
      {slice.slice(0, 6).map((img, i) => (
        <Tile key={i} img={img} title={title} v={v} />
      ))}
    </div>
  );
}

/* 2 photos — variant B: 1 large + 1 small portrait stripe */
function Mosaic2b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <Tile img={slice[1]} title={title} v={v} />
    </div>
  );
}

/* 3 photos — variant C: 1 large top + 2 small bottom */
function Mosaic3c({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: '2fr 1fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-cols-2 gap-3">
        <Tile img={slice[1]} title={title} v={v} />
        <Tile img={slice[2]} title={title} v={v} />
      </div>
    </div>
  );
}

/* 4 photos — variant C: golden ratio (1 large left tall + 3 stacked right) */
function Mosaic4c({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '5fr 3fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-rows-3 gap-3">
        {[slice[1], slice[2], slice[3]].map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
    </div>
  );
}

/* 5 photos — variant B: 1 big bottom + 4 small top strip */
function Mosaic5b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: '1fr 3fr', gap: '12px' }}>
      <div className="grid grid-cols-4 gap-3">
        {[slice[0], slice[1], slice[2], slice[3]].map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
      <Tile img={slice[4]} title={title} v={v} />
    </div>
  );
}

/* 6 photos — variant C: 1 huge feature + 5 thumb strip (bottom) */
function Mosaic6c({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: '3fr 1fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-cols-5 gap-2">
        {slice.slice(1, 6).map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
    </div>
  );
}

/* 7 photos — variant A: 3 column collage with mixed heights */
function Mosaic7a({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-3 gap-3">
      <div className="grid grid-rows-3 gap-3">
        {[slice[0], slice[1], slice[2]].map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
      <div className="grid grid-rows-2 gap-3">
        <Tile img={slice[3]} title={title} v={v} />
        <Tile img={slice[4]} title={title} v={v} />
      </div>
      <div className="grid grid-rows-2 gap-3">
        <Tile img={slice[5]} title={title} v={v} />
        <Tile img={slice[6]} title={title} v={v} />
      </div>
    </div>
  );
}

/* 7 photos — variant B: featured top-left + 6-tile 3x2 grid right */
function Mosaic7b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <Tile img={slice[0]} title={title} v={v} />
      <div className="grid grid-cols-3 grid-rows-2 gap-2">
        {slice.slice(1, 7).map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
    </div>
  );
}

/* 8+ photos — variant A: 4x2 uniform grid */
function Mosaic8a({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-3">
      {slice.slice(0, 8).map((img, i) => (
        <Tile key={i} img={img} title={title} v={v} />
      ))}
    </div>
  );
}

/* 8+ photos — variant B: 1 big center + 7 around (windmill) */
function Mosaic8b({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-3">
      {/* Center large 2x2 */}
      <Tile img={slice[0]} title={title} v={v} className="col-span-2 row-span-2 col-start-2" />
      {/* Top row sides */}
      <Tile img={slice[1]} title={title} v={v} className="col-start-1 row-start-1" />
      <Tile img={slice[2]} title={title} v={v} className="col-start-4 row-start-1" />
      {/* Middle row sides */}
      <Tile img={slice[3]} title={title} v={v} className="col-start-1 row-start-2" />
      <Tile img={slice[4]} title={title} v={v} className="col-start-4 row-start-2" />
      {/* Bottom row */}
      <Tile img={slice[5]} title={title} v={v} className="col-start-1 row-start-3" />
      <Tile img={slice[6]} title={title} v={v} className="col-start-2 row-start-3 col-span-2" />
      <Tile img={slice[7]} title={title} v={v} className="col-start-4 row-start-3" />
    </div>
  );
}

/* 8+ photos — variant C: 5 + 3 magazine (5 top thumb strip + 3 below) */
function Mosaic8c({ slice, title, v }: { slice: Img[]; title: string; v: ReturnType<typeof getStarterVisuals> }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: '1fr 2fr', gap: '12px' }}>
      <div className="grid grid-cols-5 gap-3">
        {slice.slice(0, 5).map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {slice.slice(5, 8).map((img, i) => (
          <Tile key={i} img={img} title={title} v={v} />
        ))}
      </div>
    </div>
  );
}

/* ─── grid — uniform N×M tiles ─── */
function GridSpread({
  slice, title, v, paper, columns, rows,
}: {
  slice: Array<{ url: string; alt?: string }>;
  title: string;
  v: ReturnType<typeof getStarterVisuals>;
  paper: string;
  columns: number;
  rows: number;
}) {
  return (
    <div
      className={CATALOG_SPREAD_CLASS}
      style={{
        aspectRatio: CATALOG_SPREAD_ASPECT,
        background: paper,
        borderColor: v.rule,
        color: v.ink,
        fontFamily: v.bodyFamily,
      }}
    >
      <div
        className="absolute inset-6 grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: '8px',
        }}
      >
        {slice.map((img, i) => (
          <div key={i} className="relative overflow-hidden" style={{ background: v.imagePlaceholderBg }}>
            <img src={img.url} alt={img.alt ?? title} loading="lazy" decoding="async"
              className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── corporate — 2×2 labeled grid with caption strip ─── */
function CorporateSpread({
  slice, title, v, paper, columns, rows,
}: {
  slice: Array<{ url: string; alt?: string }>;
  title: string;
  v: ReturnType<typeof getStarterVisuals>;
  paper: string;
  columns: number;
  rows: number;
}) {
  return (
    <div
      className={CATALOG_SPREAD_CLASS}
      style={{
        aspectRatio: CATALOG_SPREAD_ASPECT,
        background: paper,
        borderColor: v.rule,
        color: v.ink,
        fontFamily: v.bodyFamily,
      }}
    >
      <div
        className="absolute inset-6 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {slice.map((img, i) => (
          <figure key={i} className="relative overflow-hidden" style={{ border: `1px solid ${v.rule}` }}>
            <img src={img.url} alt={img.alt ?? title} loading="lazy" decoding="async"
              className="absolute inset-0 w-full h-full object-cover" />
            <figcaption
              className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[9px] font-mono uppercase"
              style={{ background: 'rgba(255,255,255,0.85)', letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
            >
              FIG. {String(i + 1).padStart(2, '0')}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="absolute top-6 left-6 text-[10px] font-mono uppercase"
        style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}>
        {v.productEyebrow} · GALLERY
      </div>
    </div>
  );
}
