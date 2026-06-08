/**
 * Dynamic Data binding — Elementor-style. 운영자가 인스펙터의 text /
 * image / url field 값을 정적 string 또는 동적 ref 둘 다로 저장 가능.
 * 동적 ref 는 storefront 라우트가 현재 context (product / post /
 * catalog) 의 실제 데이터로 resolve.
 *
 * 2026-05-27 대표님 직접 지시: 분해 전용 블록 (product_hero 등) 으로
 * 펼쳐놓지 말고, 일반 블록 (hero_banner / text_image / features_grid)
 * + Dynamic Data 로 자유 컴포지션할 수 있게.
 */

/* ─── 데이터 모델 ─── */

export const DYNAMIC_MARKER = '__dynamic__';

export type DynamicContext = 'product' | 'post' | 'catalog';

export interface DynamicRef {
  __dynamic__: true;
  context: DynamicContext;
  /** Dot-path with optional array indices, 예: 'title', 'images[0].url',
   *  'customFields.price'. parsePath 가 'items[3].url' 같은 형식도 지원. */
  path: string;
  /** Fallback 표시값 (admin preview / data 없을 때). 미지정 시 표시값 = `[Source]`. */
  fallback?: string;
}

export function isDynamicRef(v: unknown): v is DynamicRef {
  return (
    typeof v === 'object'
    && v !== null
    && (v as Record<string, unknown>)[DYNAMIC_MARKER] === true
    && typeof (v as Record<string, unknown>).context === 'string'
    && typeof (v as Record<string, unknown>).path === 'string'
  );
}

/* ─── Path 파서 ─── */

/**
 * 'items[3].url' → ['items', '3', 'url']
 * 'title'        → ['title']
 * 'images[0].url' → ['images', '0', 'url']
 */
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

/* ─── Resolver ─── */

export type ResolveContexts = Partial<Record<DynamicContext, unknown>>;

/**
 * Walk a section props bag and replace any DynamicRef with the resolved
 * value from the given data context. Recursive — nested objects (items[],
 * elementStyles 등) 도 처리.
 *
 * Returns a new bag with all dynamic refs swapped for their resolved
 * primitive values. 미해결 (context 누락 or path 누락) → fallback || ''.
 */
export function resolveDynamicProps<T = unknown>(
  value: T,
  contexts: ResolveContexts,
): T {
  if (isDynamicRef(value)) {
    const ctx = contexts[value.context];
    if (ctx != null) {
      const resolved = getByPath(ctx, value.path);
      if (resolved !== undefined && resolved !== null) {
        return resolved as unknown as T;
      }
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

/* ─── Dynamic Source 카탈로그 ─── */

/**
 * 운영자가 인스펙터의 ⚙ "Dynamic Source" picker 에서 고를 수 있는 source
 * 옵션. context 별로 분리. customFields.* 같은 동적 path 는 운영자가
 * 직접 path 를 입력하거나, 인스펙터에서 product field schema 를 fetch
 * 해서 dropdown 자동 생성.
 */
export interface DynamicSourceOption {
  /** Dot-path with optional array indices. */
  path: string;
  /** 운영자에게 보이는 라벨. */
  label: string;
  /** 어떤 kind 필드에 binding 가능한지 (인스펙터가 filter). */
  applicableKinds: Array<'text' | 'image' | 'url' | 'number' | 'html'>;
}

export const DYNAMIC_SOURCES: Record<DynamicContext, DynamicSourceOption[]> = {
  product: [
    { path: 'title',           label: 'Product · Title',       applicableKinds: ['text'] },
    { path: 'sku',             label: 'Product · SKU',         applicableKinds: ['text'] },
    { path: 'description',     label: 'Product · Description (short text)', applicableKinds: ['text', 'html'] },
    { path: 'content',         label: 'Product · Content (HTML body)', applicableKinds: ['html', 'text'] },
    { path: 'images[0].url',   label: 'Product · Image 1 (Hero)', applicableKinds: ['image', 'url'] },
    { path: 'images[1].url',   label: 'Product · Image 2',     applicableKinds: ['image', 'url'] },
    { path: 'images[2].url',   label: 'Product · Image 3',     applicableKinds: ['image', 'url'] },
    { path: 'images[3].url',   label: 'Product · Image 4',     applicableKinds: ['image', 'url'] },
    // customFields.* 는 운영자 정의 필드 — 인스펙터가 product field schema
    // 로부터 동적으로 dropdown 생성 (DynamicSourcePicker 안에서 처리).
  ],
  post: [
    { path: 'title',           label: 'Post · Title',          applicableKinds: ['text'] },
    { path: 'content',         label: 'Post · Content (HTML)', applicableKinds: ['html', 'text'] },
    { path: 'topImageUrl',     label: 'Post · Top Image',      applicableKinds: ['image', 'url'] },
    { path: 'bottomImageUrl',  label: 'Post · Bottom Image',   applicableKinds: ['image', 'url'] },
    { path: 'youtubeUrl',      label: 'Post · YouTube URL',    applicableKinds: ['url', 'text'] },
    { path: 'thumbnailUrl',    label: 'Post · Thumbnail',      applicableKinds: ['image', 'url'] },
    { path: 'createdAt',       label: 'Post · Created Date',   applicableKinds: ['text'] },
  ],
  catalog: [
    { path: 'title',           label: 'Catalog · Title',       applicableKinds: ['text'] },
    { path: 'coverMediaUrl',   label: 'Catalog · Cover Image', applicableKinds: ['image', 'url'] },
    { path: 'summary',         label: 'Catalog · Summary',     applicableKinds: ['text', 'html'] },
  ],
};

/* ─── 한 줄 라벨 ─── */

export function dynamicRefLabel(ref: DynamicRef): string {
  const sources = DYNAMIC_SOURCES[ref.context] ?? [];
  const match = sources.find((s) => s.path === ref.path);
  if (match) return match.label;
  // customFields.<key> 처럼 카탈로그에 없는 path 는 raw path 표시
  return `${ref.context} · ${ref.path}`;
}

/* ─── DynamicRef 생성 helper ─── */

export function makeDynamicRef(
  context: DynamicContext,
  path: string,
  fallback?: string,
): DynamicRef {
  return fallback !== undefined
    ? { [DYNAMIC_MARKER]: true, context, path, fallback }
    : { [DYNAMIC_MARKER]: true, context, path };
}

/**
 * Admin 캔버스 / 미리보기용 — 실제 product/post 데이터가 없을 때 dynamic
 * ref 를 `[Source Label]` placeholder 문자열로 swap. 일반 블록 컴포넌트가
 * .split() / .trim() 같은 string 메서드를 호출하다 객체에서 터지는 걸 막음.
 * storefront 는 실제 데이터로 resolveDynamicProps 통과하므로 이 함수 안 씀.
 */
export function placeholderResolveDynamicProps<T = unknown>(value: T): T {
  if (isDynamicRef(value)) {
    return `[${dynamicRefLabel(value)}]` as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => placeholderResolveDynamicProps(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = placeholderResolveDynamicProps(v);
    }
    return out as T;
  }
  return value;
}

/* ─── Page kind → Dynamic context 매핑 ─── */

/**
 * 운영자가 어떤 kind 페이지를 편집 중인지에 따라 사용 가능한 dynamic
 * context 결정. 'static' (일반 페이지) 는 dynamic context 없음 (binding
 * 불가). 템플릿 페이지만 dynamic 활성.
 */
export function dynamicContextsForPageKind(
  pageKind: string | undefined,
): DynamicContext[] {
  switch (pageKind) {
    case 'product_detail':
    case 'single_product':
      return ['product'];
    case 'blog_post':
    // dw-church content-detail templates — sermons / columns / bulletins all
    // share the 'post' field shape (title / content / topImageUrl /
    // youtubeUrl / thumbnailUrl / createdAt), so they bind to the same context.
    case 'sermon_detail':
    case 'column_detail':
    case 'bulletin_detail':
      return ['post'];
    case 'catalog_detail':
      return ['catalog'];
    default:
      return [];
  }
}
