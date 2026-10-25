import { getBooks } from '@/lib/api';
import { DataSection } from './DataSection';
import { titleAlignClass } from './title-align';
import { getElementStyle } from '@/lib/element-style';

/**
 * recent_books — 책 추천 데이터 블록.
 *
 * 책 추천은 서점 목록이 아니라 **목회적 추천**이라, 표지·저자보다 추천사와
 * 추천인이 읽히게 배치한다. 대표 추천(isFeatured)이 있으면 맨 위에 크게 띄운다.
 *
 * 등록된 책이 없으면 섹션 자체를 숨긴다 — 빈 "책 추천" 제목만 남으면
 * 사이트가 미완성처럼 보인다.
 */
interface Props { props: Record<string, unknown>; slug: string }

interface BookRow {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  coverImageUrl?: string;
  cover_image_url?: string;
  category?: string;
  recommender?: string;
  recommendation?: string;
  link?: string;
  isFeatured?: boolean;
  is_featured?: boolean;
}

function rows(res: unknown): BookRow[] {
  if (Array.isArray(res)) return res as BookRow[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as BookRow[]) : [];
}

const TEXT = 'var(--dw-text, #3a3129)';
const MUTED = 'var(--brand-muted, #6f6255)';
const PRIMARY = 'var(--dw-primary, #7b7d5c)';
const BORDER = 'var(--border, #ece2d6)';
const IMG_BG = 'var(--dw-surface, #f2ece3)';
const SERIF = { fontFamily: "var(--dw-font-heading, var(--brand-font-heading, serif))" } as const;

/** 표지가 없을 때 제목 첫 글자로 자리를 채운다 — 빈 회색 네모보다 낫다. */
function CoverFallback({ title }: { title: string }) {
  return (
    <span
      style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: IMG_BG, color: PRIMARY, fontSize: 'clamp(22px,4vw,34px)', ...SERIF,
      }}
      aria-hidden="true"
    >
      {(title || '?').trim().slice(0, 1)}
    </span>
  );
}

function Cover({ src, title }: { src?: string; title: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', background: IMG_BG, overflow: 'hidden' }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        : <CoverFallback title={title} />}
    </div>
  );
}

/** 구매·소개 링크는 외부로 나가므로 새 창 + noopener. */
function MoreLink({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-block', marginTop: 10, fontSize: 14, fontWeight: 600, color: PRIMARY, textDecoration: 'none' }}>
      {label} ›
    </a>
  );
}

export async function RecentBooksBlock({ props, slug }: Props) {
  const limitRaw = Number(props.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(60, Math.floor(limitRaw)) : 6;
  const category = String(props.category ?? '').trim();
  const variant = String(props.variant ?? 'grid-3');
  const showFeature = String(props.showFeature ?? 'show') !== 'hide';
  const title = String(props.title ?? '책 추천');
  const description = String(props.description ?? '');
  const linkLabel = String(props.linkLabel ?? '자세히 보기');

  const books = rows(await getBooks(slug, { perPage: limit, category: category || undefined }));
  if (books.length === 0) return null;

  // 서버가 is_featured DESC 로 정렬해 주므로 첫 항목이 대표 추천 후보.
  const first = books[0]!;
  const featured = showFeature && (first.isFeatured ?? first.is_featured) ? first : null;
  const list = featured ? books.slice(1) : books;

  const cols = variant === 'grid-2' ? 2 : variant === 'grid-4' ? 4 : variant === 'list' ? 1 : 3;
  const gridClass = cols === 1
    ? 'grid-cols-1'
    : cols === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : cols === 4
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3';

  const cover = (b: BookRow) => b.coverImageUrl || b.cover_image_url || '';

  return (
    <DataSection props={props} defaultBg="var(--dw-background)">
      <h2
        className={`mb-2 text-2xl sm:text-3xl font-bold font-heading ${titleAlignClass(props)}`}
        style={getElementStyle(props, 'title')}
      >
        {title}
      </h2>
      {description && (
        <p className={`mb-8 ${titleAlignClass(props)}`} style={{ fontSize: 16, lineHeight: 1.75, color: MUTED, maxWidth: '34em' }}>
          {description}
        </p>
      )}
      {!description && <div className="mb-8" />}

      {/* 대표 추천 — 한 권을 크게. 추천사가 가장 먼저 읽히도록 가로 배치. */}
      {featured && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '24px 40px', alignItems: 'flex-start',
          borderTop: `3px double ${TEXT}`, borderBottom: `1px solid ${BORDER}`,
          padding: '28px 0', marginBottom: 32,
        }}>
          <div style={{ flex: '0 0 180px', maxWidth: 180 }}>
            <Cover src={cover(featured)} title={featured.title} />
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>
              {featured.category || '이달의 추천'}
            </p>
            <h3 style={{ ...SERIF, margin: '10px 0 0', fontSize: 'clamp(22px,2.8vw,30px)', fontWeight: 600, lineHeight: 1.35, color: TEXT }}>
              {featured.title}
            </h3>
            {(featured.author || featured.publisher) && (
              <p style={{ margin: '6px 0 0', fontSize: 14, color: MUTED }}>
                {[featured.author, featured.publisher].filter(Boolean).join(' · ')}
              </p>
            )}
            {featured.recommendation && (
              <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.85, color: TEXT, whiteSpace: 'pre-line' }}>
                {featured.recommendation}
              </p>
            )}
            {featured.recommender && (
              <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED }}>— {featured.recommender}</p>
            )}
            <MoreLink href={featured.link} label={linkLabel} />
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className={`grid ${gridClass} gap-6`}>
          {list.map((b) => (
            <article key={b.id} style={{ minWidth: 0 }}>
              <Cover src={cover(b)} title={b.title} />
              {b.category && (
                <p style={{ margin: '12px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: PRIMARY }}>{b.category}</p>
              )}
              <h3 style={{ ...SERIF, margin: '6px 0 0', fontSize: 17, fontWeight: 600, lineHeight: 1.45, color: TEXT }}>{b.title}</h3>
              {(b.author || b.publisher) && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>{[b.author, b.publisher].filter(Boolean).join(' · ')}</p>
              )}
              {b.recommendation && (
                <p style={{
                  margin: '8px 0 0', fontSize: 14, lineHeight: 1.75, color: MUTED,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{b.recommendation}</p>
              )}
              {b.recommender && <p style={{ margin: '6px 0 0', fontSize: 12, color: MUTED }}>— {b.recommender}</p>}
              <MoreLink href={b.link} label={linkLabel} />
            </article>
          ))}
        </div>
      )}
    </DataSection>
  );
}
