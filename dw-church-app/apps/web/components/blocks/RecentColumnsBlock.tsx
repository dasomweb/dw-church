import { getColumns } from '@/lib/api';
import { titleAlignClass } from './title-align';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import Link from 'next/link';
import { koText } from '@dw-church/blocks';

interface RecentColumnsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  const plain = text.replace(/<[^>]*>/g, '');
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

export async function RecentColumnsBlock({ props, slug }: RecentColumnsBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '저널';
  const variant = (props.variant as string) || 'grid-3';
  const columns = variant === 'grid-2' ? 2 : variant === 'grid-4' ? 4 : variant === 'list' ? 1 : 3;
  // 카테고리를 지정하면 그 연재만 뽑는다 — 같은 페이지에 '교회이야기' 섹션과
  // '시니어' 섹션을 따로 둘 수 있다(블록 설정 '카테고리').
  const category = ((props.category as string) || '').trim() || undefined;
  // 카드에 카테고리 라벨을 띄울지. 한 카테고리만 뽑는 섹션에서는 제목과 중복되므로
  // 기본('')은 '카테고리 지정이 없을 때만' 띄운다. 'on'/'off' 로 강제할 수 있고,
  // AI 빌더가 넣는 boolean 도 받는다.
  const sc = props.showCategory;
  const showCategory = sc === 'on' || sc === true ? true
    : sc === 'off' || sc === false ? false
      : !category;

  let data: any[] = [];
  try {
    const result = await getColumns(slug, { perPage: limit, category });
    data = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    data = [];
  }

  if (data.length === 0) {
    return (
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400" style={koText('summary')}>
            {category ? `'${category}' 글이 아직 없습니다.` : '등록된 글이 아직 없습니다.'}
          </p>
        </div>
      </DataSection>
    );
  }

  // ── feature-dark: 다크 밴드 저널 ────────────────────────────
  // 좌측 대표 1편(큰 16:9 카드) + 우측 목록 3편. 잉크 바탕에 흰 글씨라 홈 중간에서
  // 띠처럼 끊어 주는 자리에 쓴다. 바탕색은 테마 잉크(--dw-text)를 그대로 쓰고,
  // 운영자가 블록 Style 의 배경으로 덮을 수 있다.
  if (variant === 'feature-dark') {
    const ON_DARK = '#fff';
    const DARK_RULE = 'rgba(255,255,255,.22)';
    const DARK_IMG = 'rgba(255,255,255,.08)';
    const SAGE = 'var(--dw-accent, #c9cba8)';
    const SIDE = Math.max(0, Math.min(6, Math.floor(Number(props.sideLimit) || 3)));
    const moreLabel = (props.moreLabel as string) || '전체 글';
    const moreUrl = (props.moreUrl as string) || '';

    const lead = data[0];
    const side = data.slice(1, 1 + SIDE);
    const img = (c: any) => c?.topImageUrl ?? c?.top_image_url ?? c?.thumbnailUrl ?? c?.thumbnail_url ?? '';
    const when = (c: any) => c?.publishAt ?? c?.publish_at ?? c?.createdAt ?? c?.created_at ?? '';

    return (
      <DataSection props={props} defaultBg="var(--dw-text, #1a1a1a)">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px 20px' }}>
          <h2 style={{ fontFamily: 'var(--dw-font-heading)', margin: 0, ...koText('sectionTitle'), color: ON_DARK }}>{title}</h2>
          {moreUrl && (
            <Link href={moreUrl} style={{ ...koText('tab'), color: SAGE, textDecoration: 'none' }}>{moreLabel} ›</Link>
          )}
        </div>

        <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:gap-10">
          {lead && (
            <Link href={`/columns/${lead.id}`} className="min-w-0 lg:flex-1" style={{ color: ON_DARK, textDecoration: 'none' }}>
              <div style={{ position: 'relative', aspectRatio: '16 / 9', background: DARK_IMG, overflow: 'hidden' }}>
                {img(lead) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img(lead)} alt={lead.title ?? ''} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <p style={{ margin: '14px 0 0', ...koText('eyebrow'), color: SAGE }}>
                {formatDate(when(lead))}
              </p>
              <h3 style={{ fontFamily: 'var(--dw-font-heading)', margin: '8px 0 0', ...koText('sectionTitle', { fontWeight: 700 }) }}>
                {lead.title ?? ''}
              </h3>
              {lead.content && (
                <p style={{ margin: '10px 0 0', maxWidth: '38em', ...koText('summary'), color: 'rgba(255,255,255,.72)' }}>
                  {truncate(lead.content, 120)}
                </p>
              )}
            </Link>
          )}

          {side.length > 0 && (
            <div className="lg:w-[340px] lg:shrink-0">
              {side.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/columns/${c.id}`}
                  className="block"
                  style={{ borderTop: `1px solid ${DARK_RULE}`, padding: '14px 0 16px', color: ON_DARK, textDecoration: 'none' }}
                >
                  <span style={{ display: 'block', ...koText('eyebrow'), color: SAGE }}>{formatDate(when(c))}</span>
                  <span style={{ fontFamily: 'var(--dw-font-heading)', display: 'block', margin: '5px 0 0', ...koText('cardTitle') }}>
                    {c.title ?? ''}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DataSection>
    );
  }

  const gridClass = columns === 1
    ? 'grid-cols-1'
    : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <DataSection props={props} defaultBg="var(--dw-background)">
      <div className="mx-auto max-w-7xl">
        <h2 className={`mb-8 text-2xl sm:text-3xl font-bold font-heading ${titleAlignClass(props)}`} style={getElementStyle(props, 'title')}>{title}</h2>
        <div className={`grid ${gridClass} gap-6`}>
          {data.map((col: any) => {
            const colTitle = col.title ?? '';
            const content = col.content ?? '';
            const imageUrl = col.topImageUrl ?? col.top_image_url ?? col.thumbnailUrl ?? col.thumbnail_url ?? '';
            // 예약 공개한 칼럼은 등록일이 아니라 공개일을 보여준다 — 미리 써 둔 날짜가
            // 노출되면 성도에게는 날짜가 거꾸로 보인다.
            const date = col.publishAt ?? col.publish_at ?? col.createdAt ?? col.created_at ?? '';
            const id = col.id ?? '';
            const cat = (col.category ?? '') as string;

            return (
              <Link
                key={id}
                href={`/columns/${id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="aspect-video overflow-hidden bg-gray-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={colTitle}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/90 text-2xl sm:text-3xl" style={{ background: 'linear-gradient(135deg, var(--dw-primary, #2563eb), var(--dw-secondary, #64748b))' }}>✍️</div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  {showCategory && cat && (
                    <p className="mb-2 text-[var(--dw-primary)]" style={koText('eyebrow')}>{cat}</p>
                  )}
                  <h3 className="font-bold font-heading line-clamp-2 group-hover:text-[var(--dw-primary)] transition-colors" style={koText('cardTitle')}>
                    {colTitle}
                  </h3>
                  {content && (
                    <p className="mt-2 text-gray-500 line-clamp-2" style={koText('summary')}>{truncate(content, 110)}</p>
                  )}
                  {date && (
                    <p className="mt-3 pt-3 border-t border-black/[0.05] text-gray-400" style={koText('meta')}>{formatDate(date)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DataSection>
  );
}
