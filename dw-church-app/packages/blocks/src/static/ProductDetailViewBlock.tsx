/**
 * ProductDetailViewBlock (admin-canvas preview) — sync mirror of the
 * storefront's async product 상세 뷰 (apps/web ProductDetailViewBlock).
 *
 * 왜 따로 있나: 스토어프론트 버전은 productSlug 로 /api/v1 fetch 하는
 * async Server Component 이라 admin 캔버스(동기 BlockRenderer)에서 못
 * 돈다. 예전엔 product_detail_view 가 DATA_BLOCK_LABELS 의 placeholder
 * 박스로만 떠서 운영자가 커머스 레이아웃을 편집기에서 볼 수 없었음
 * (대표님 2026-05-28 "여전히 이렇게 되는데?"). 이 컴포넌트는 동일한
 * 4 variant 레이아웃을 ssample/placeholder 제품 데이터로 그려서 운영자가
 * 구조를 보고 element 스타일(title/specsTitle/ctaLabel)·운영자 prop
 * (specsTitle/benefits/showQuantity 등)을 인스펙터로 편집할 수 있게 함.
 *
 * 스토어프론트 BlockRenderer 는 SHARED_BLOCK_MAP 을 spread 한 뒤
 * product_detail_view 를 async 버전으로 override 하므로 실제 사이트는
 * 영향 없음 — 이 sync 버전은 오직 admin 캔버스 미리보기에만 사용.
 *
 * 운영자 인스펙터 prop (스토어프론트와 동일):
 *   variant / showSku / showSpecs / showGallery / showQuantity
 *   ctaLabel / ctaHref / specsTitle / priceFieldKey / benefits
 */

import { HeadingElement, TextBodyElement, ButtonElement } from '../elements';

type Variant = 'commerce' | 'editorial' | 'minimal' | 'spec-sheet';

interface SampleField {
  key: string;
  label: string;
  value: string;
}

// 편집기 미리보기용 sample 제품 — 실제 데이터는 발행 시 라우트가 주입.
// 영어 + USD (타깃 미국). [[feedback-english-usd-us]]
const SAMPLE = {
  title: 'Product name (sample)',
  sku: 'SKU-0000',
  description:
    'Product description goes here. Live data is shown automatically after publishing.',
  price: '24.00',
  fields: [
    { key: 'material', label: 'Material', value: 'Stainless steel' },
    { key: 'size', label: 'Size', value: '320 × 240 mm' },
    { key: 'origin', label: 'Origin', value: 'United States' },
  ] as SampleField[],
};

interface ProductDetailViewBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function ProductDetailViewBlock({ props }: ProductDetailViewBlockProps) {
  const rawVariant = props.variant as string;
  const variant: Variant =
    rawVariant === 'minimal' ? 'minimal'
    : rawVariant === 'spec-sheet' ? 'spec-sheet'
    : rawVariant === 'editorial' ? 'editorial'
    : 'commerce';

  const showSku = (props.showSku as boolean | undefined) ?? true;
  const showSpecs = (props.showSpecs as boolean | undefined) ?? true;
  const showGallery = (props.showGallery as boolean | undefined) ?? true;
  const showQuantity = (props.showQuantity as boolean | undefined) ?? false;
  const showPrice = (props.showPrice as boolean | undefined) ?? true;
  const showCta = (props.showCta as boolean | undefined) ?? true;
  const ctaLabel = (props.ctaLabel as string) || 'Inquire';
  const ctaHref = (props.ctaHref as string) || '/contact';
  const specsTitle = (props.specsTitle as string) || 'Product details';
  const benefits = Array.isArray(props.benefits)
    ? (props.benefits as string[])
    : typeof props.benefits === 'string'
      ? (props.benefits as string).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  const galleryLayout = (props.galleryLayout as string) || 'thumbnails';
  const contentPlacement = (props.contentPlacement as string) === 'under-cta' ? 'under-cta' : 'section';

  const visibleFields = showSpecs ? SAMPLE.fields : [];

  const body =
    variant === 'commerce'
      ? <CommercePreview
          props={props}
          showSku={showSku}
          showGallery={showGallery}
          showQuantity={showQuantity}
          showPrice={showPrice}
          showCta={showCta}
          galleryLayout={galleryLayout}
          contentPlacement={contentPlacement}
          visibleFields={visibleFields}
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          specsTitle={specsTitle}
          benefits={benefits}
        />
      : variant === 'spec-sheet'
        ? <SpecSheetPreview props={props} showSku={showSku} showGallery={showGallery} visibleFields={visibleFields} ctaLabel={ctaLabel} ctaHref={ctaHref} />
        : variant === 'minimal'
          ? <SimplePreview props={props} maxW="max-w-3xl" showSku={showSku} showGallery={showGallery} visibleFields={visibleFields} ctaLabel={ctaLabel} ctaHref={ctaHref} />
          : <SimplePreview props={props} maxW="max-w-5xl" editorial showSku={showSku} showGallery={showGallery} visibleFields={visibleFields} ctaLabel={ctaLabel} ctaHref={ctaHref} />;

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
          Preview — live product data appears after publishing
        </span>
      </div>
      {body}
    </div>
  );
}

/* ─── placeholder 갤러리 — layout 옵션 미리보기 ─────────────── */

function GalleryPlaceholder({ layout, showExtra }: { layout: string; showExtra: boolean }) {
  const featured = (
    <div className="aspect-square rounded-2xl bg-gray-100 border border-gray-100 flex items-center justify-center text-gray-300 text-sm">
      Product image
    </div>
  );
  if (!showExtra) return <div className="space-y-3">{featured}</div>;

  // grid-2 / stack: featured 위, 나머지 placeholder 를 2컬럼/1컬럼으로.
  if (layout === 'grid-2' || layout === 'stack') {
    return (
      <div className="space-y-3">
        {featured}
        <div className={layout === 'grid-2' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          {[0, 1].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  // carousel: 좌/우 화살표 칩 + 가로 스크롤(스크롤바 숨김) 미리보기.
  if (layout === 'carousel') {
    return (
      <div className="space-y-3">
        {featured}
        <div className="relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white border border-gray-200 shadow text-gray-400 text-xs">‹</div>
          <div className="flex gap-2 overflow-x-auto px-9 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-20 shrink-0 aspect-square rounded-lg bg-gray-100 border-2 ${i === 0 ? 'border-[var(--brand-primary,#16a34a)]' : 'border-transparent'}`} />
            ))}
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white border border-gray-200 shadow text-gray-400 text-xs">›</div>
        </div>
      </div>
    );
  }

  // thumbnails (default): featured + 5-up 썸네일 그리드.
  return (
    <div className="space-y-3">
      {featured}
      <div className="grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg bg-gray-100 border-2 ${
              i === 0 ? 'border-[var(--brand-primary,#16a34a)]' : 'border-transparent'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── commerce — 2-column 커머스 레이아웃 ─────────────────────── */

function CommercePreview({
  props, showSku, showGallery, showQuantity, showPrice, showCta, galleryLayout, contentPlacement, visibleFields, ctaLabel, ctaHref, specsTitle, benefits,
}: {
  props: Record<string, unknown>;
  showSku: boolean;
  showGallery: boolean;
  showQuantity: boolean;
  showPrice: boolean;
  showCta: boolean;
  galleryLayout: string;
  contentPlacement: string;
  visibleFields: SampleField[];
  ctaLabel: string;
  ctaHref: string;
  specsTitle: string;
  benefits: string[];
}) {
  // 본문(content) 위치 미리보기 — 실제 본문은 발행 시. 운영자가 배치를
  // 시각적으로 확인하도록 placeholder 표시.
  const contentSample = (
    <TextBodyElement
      text="Body content (sample) — the actual product description appears here"
      props={props}
      elementKey="content"
      defaultTag="div"
      defaultSize="body"
      className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-gray-400"
    />
  );
  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <GalleryPlaceholder layout={galleryLayout} showExtra={showGallery} />
        </div>

        <div className="flex flex-col">
          <HeadingElement
            text={SAMPLE.title}
            props={props}
            elementKey="title"
            defaultTag="h1"
            defaultSize="h1"
            className="text-2xl sm:text-3xl font-bold"
          />

          {visibleFields.length > 0 && (
            <div className="mt-6">
              <HeadingElement
                text={specsTitle}
                props={props}
                elementKey="specsTitle"
                defaultTag="h2"
                defaultSize="label"
                className="text-sm font-semibold mb-2"
              />
              <ul className="space-y-1 text-sm text-gray-600">
                {visibleFields.map((f) => (
                  <li key={f.key}>{f.value}</li>
                ))}
              </ul>
            </div>
          )}

          {showSku && (
            <TextBodyElement
              text={`SKU · ${SAMPLE.sku}`}
              props={props}
              elementKey="sku"
              defaultTag="div"
              defaultSize="caption"
              className="mt-2 font-mono uppercase tracking-wider text-gray-400"
            />
          )}

          {showPrice && (
            <HeadingElement
              text={`$${SAMPLE.price}`}
              props={props}
              elementKey="price"
              defaultTag="div"
              defaultSize="h3"
              className="mt-6 font-bold"
              baseStyle={{ color: 'var(--brand-primary, #16a34a)' }}
            />
          )}

          {(showQuantity || showCta) && (
            <div className="mt-5 flex items-center gap-3">
              {showQuantity && (
                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                  <span className="px-3 py-2 text-gray-400 select-none">−</span>
                  <span className="px-3 py-2 text-sm tabular-nums border-x border-gray-200">1</span>
                  <span className="px-3 py-2 text-gray-400 select-none">+</span>
                </div>
              )}
              {showCta && (
                <ButtonElement
                  text={ctaLabel}
                  href={ctaHref}
                  props={props}
                  elementKey="ctaLabel"
                  defaultVariant="filled"
                  className="px-6 py-2.5"
                />
              )}
            </div>
          )}

          {benefits.length > 0 && (
            <div
              className="mt-6 rounded-lg p-4"
              style={{ background: 'var(--brand-surface, #f0f7f0)' }}
              data-element="benefits"
            >
              <ul className="space-y-1.5 text-sm text-gray-700">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span style={{ color: 'var(--brand-primary, #16a34a)' }}>●</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contentPlacement === 'under-cta' && <div className="mt-6">{contentSample}</div>}
        </div>
      </div>

      {contentPlacement === 'section' && (
        <div className="mt-12 max-w-3xl mx-auto">{contentSample}</div>
      )}
    </article>
  );
}

/* ─── spec-sheet — 2-column B2B 표 형식 ───────────────────────── */

function SpecSheetPreview({
  props, showSku, showGallery, visibleFields, ctaLabel, ctaHref,
}: {
  props: Record<string, unknown>;
  showSku: boolean;
  showGallery: boolean;
  visibleFields: SampleField[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <article className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="aspect-square w-full rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
            Product image
          </div>
          {showGallery && (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square rounded bg-gray-100" />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <HeadingElement text={SAMPLE.title} props={props} elementKey="title" defaultTag="h1" defaultSize="h2" />
          {showSku && (
            <TextBodyElement
              text={`SKU: ${SAMPLE.sku}`}
              props={props}
              elementKey="sku"
              defaultTag="div"
              defaultSize="caption"
              className="mt-2 font-mono uppercase tracking-wide"
            />
          )}
          <TextBodyElement
            text={SAMPLE.description}
            props={props}
            elementKey="description"
            defaultTag="p"
            defaultSize="body"
            className="mt-4"
          />
          {visibleFields.length > 0 && (
            <div className="mt-6 border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {visibleFields.map((f) => (
                    <tr key={f.key} className="border-b last:border-b-0">
                      <td className="bg-gray-50 px-4 py-3 font-medium text-gray-700 w-1/3">{f.label}</td>
                      <td className="px-4 py-3">{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ctaLabel && (
            <div className="mt-8">
              <ButtonElement text={ctaLabel} href={ctaHref} props={props} elementKey="ctaLabel" defaultVariant="filled" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── editorial / minimal — 1-column ──────────────────────────── */

function SimplePreview({
  props, maxW, editorial, showSku, showGallery, visibleFields, ctaLabel, ctaHref,
}: {
  props: Record<string, unknown>;
  maxW: string;
  editorial?: boolean;
  showSku: boolean;
  showGallery: boolean;
  visibleFields: SampleField[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <article className={`mx-auto ${maxW} px-4 py-8 sm:px-6 sm:py-12`}>
      <div
        className={`w-full rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-sm mb-8 ${
          editorial ? 'aspect-[4/3]' : 'aspect-square'
        }`}
      >
        Product image
      </div>
      <div className={editorial ? 'text-center' : ''}>
        <HeadingElement
          text={SAMPLE.title}
          props={props}
          elementKey="title"
          defaultTag="h1"
          defaultSize={editorial ? 'h1' : 'h2'}
        />
        {showSku && (
          <TextBodyElement
            text={SAMPLE.sku}
            props={props}
            elementKey="sku"
            defaultTag="div"
            defaultSize="caption"
            className="mt-2 font-mono uppercase tracking-wide text-gray-500"
          />
        )}
        <TextBodyElement
          text={SAMPLE.description}
          props={props}
          elementKey="description"
          defaultTag="p"
          defaultSize={editorial ? 'h3' : 'body'}
          className={editorial ? 'mt-6 italic max-w-3xl mx-auto' : 'mt-6'}
        />
      </div>
      {visibleFields.length > 0 && (
        <div className={editorial ? 'mt-12 grid sm:grid-cols-2 gap-4' : 'mt-6 space-y-2'}>
          {visibleFields.map((f) => (
            <div
              key={f.key}
              className={editorial ? 'rounded-lg border border-gray-200 p-4' : 'flex justify-between border-b border-gray-100 pb-2'}
            >
              <span className="text-xs uppercase tracking-wide text-gray-500">{f.label}</span>
              <span className={editorial ? 'block mt-1 font-medium' : 'font-medium'}>{f.value}</span>
            </div>
          ))}
        </div>
      )}
      {showGallery && (
        <div className={`mt-8 grid gap-3 ${editorial ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`rounded bg-gray-100 ${editorial ? 'aspect-[4/3]' : 'aspect-square'}`} />
          ))}
        </div>
      )}
      {ctaLabel && (
        <div className={editorial ? 'mt-12 text-center' : 'mt-8'}>
          <ButtonElement
            text={ctaLabel}
            href={ctaHref}
            props={props}
            elementKey="ctaLabel"
            defaultVariant={editorial ? 'filled' : 'outlined'}
          />
        </div>
      )}
    </article>
  );
}
