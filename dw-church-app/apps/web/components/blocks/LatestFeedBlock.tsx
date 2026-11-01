import {
  getSermonNotes, getColumns, getOnlineBulletins, getSermons,
  getBooks, getEvents, getAlbums, getDevotions,
} from '@/lib/api';
import { FEED_SOURCE_LABELS, DEFAULT_FEED_SOURCES, parseFeedSources, plainExcerpt } from '@dw-church/blocks';
import { DataSection } from './DataSection';
import { LatestFeedClient, type FeedItem } from './LatestFeedClient';

/**
 * latest_feed — 여러 **Content Module** 의 최신 글을 한 줄로 합쳐 보여주는
 * 통합 피드 Data Block.
 *
 * 교회 홈에서 "최신" 한 섹션으로 설교노트·칼럼·주보·설교·책·행사를 섞어 보여주고
 * 카테고리 탭으로 걸러 본다. 어떤 모듈을 담을지는 운영자가 props.sources 로
 * 정하므로(모듈 키 + 라벨), 교회마다 쓰는 모듈이 달라도 그대로 재사용된다.
 *
 * props
 *   title      섹션 제목 (기본 '최신')
 *   sources    담을 모듈 — `키:라벨` 을 쉼표로. 라벨 생략 시 기본 이름.
 *              키: sermon_note · column · online_bulletin · sermon · book ·
 *                  event · album · devotion
 *   showTabs   카테고리 탭 표시/숨김
 *   allLabel   '전체' 탭 라벨
 *   limit      카드 총 개수 (기본 4)
 *   perSource  모듈별로 가져올 개수 (기본 4) — 한 모듈이 피드를 독점하지 않게
 *   columns    열 수 2 / 3 / 4
 *   bookHref / devotionHref  상세 라우트가 없는 모듈의 연결 주소(비우면 링크 없음)
 *   moreLabel / moreUrl      섹션 하단 더보기 링크
 */
interface Props { props: Record<string, unknown>; slug: string }

/** 응답 봉투({data}) 와 배열 응답을 모두 받아 배열로. */
function rows(res: unknown): Record<string, any>[] {
  if (Array.isArray(res)) return res as Record<string, any>[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as Record<string, any>[]) : [];
}

/** 모듈마다 camel/snake 가 섞여 들어오므로 후보 키를 순서대로 찾는다. */
function pick(row: Record<string, any>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}
const dateOf = (row: Record<string, any>, keys: string[]): string =>
  pick(row, [...keys, 'createdAt', 'created_at']).slice(0, 10);

const plain = plainExcerpt;

type Loader = (slug: string, perPage: number, opts: Record<string, string>) => Promise<FeedItem[]>;

/** 모듈 키 → 로더. 라벨은 @dw-church/blocks 의 FEED_SOURCE_LABELS 가 들고 있다.
 *  새 모듈을 피드에 열어주려면 그 맵과 여기 로더를 같이 추가한다. */
const SOURCES: Record<string, { load: Loader }> = {
  sermon_note: {
    load: async (slug, perPage) => rows(await getSermonNotes(slug, { perPage })).map((r) => {
      const c = (r.content ?? {}) as Record<string, any>;
      const adult = (c.congregations?.adult ?? {}) as Record<string, any>;
      return {
        id: String(r.id ?? ''),
        kind: 'sermon_note',
        kindLabel: '',
        title: adult.title || r.title || '설교노트',
        sub: c.scripture || plain(adult.text),
        date: dateOf(r, ['noteDate', 'note_date']),
        image: c.thumbnailUrl || c.thumbnail_url || '',
        href: `/sermon-note/${r.id}`,
      };
    }),
  },
  column: {
    load: async (slug, perPage) => rows(await getColumns(slug, { perPage })).map((r) => ({
      id: String(r.id ?? ''),
      kind: 'column',
      kindLabel: '',
      title: r.title || '',
      sub: plain(r.content),
      date: dateOf(r, ['publishAt', 'publish_at']),
      image: pick(r, ['topImageUrl', 'top_image_url', 'thumbnailUrl', 'thumbnail_url']),
      href: `/columns/${r.id}`,
    })),
  },
  online_bulletin: {
    load: async (slug, perPage) => rows(await getOnlineBulletins(slug, { perPage })).map((r) => ({
      id: String(r.id ?? ''),
      kind: 'online_bulletin',
      kindLabel: '',
      title: r.title || r.serviceTitle || '주일예배',
      sub: plain(r.notice ?? r.summary),
      date: dateOf(r, ['serviceDate', 'service_date']),
      image: pick(r, ['coverImageUrl', 'cover_image_url', 'thumbnailUrl', 'thumbnail_url']),
      href: `/online-bulletins/${r.id}`,
    })),
  },
  sermon: {
    load: async (slug, perPage) => rows(await getSermons(slug, { perPage })).map((r) => ({
      id: String(r.id ?? ''),
      kind: 'sermon',
      kindLabel: '',
      title: r.title || '',
      sub: [pick(r, ['scripture']), pick(r, ['preacherName', 'preacher_name', 'preacher'])].filter(Boolean).join(' · '),
      date: dateOf(r, ['sermonDate', 'sermon_date']),
      image: pick(r, ['thumbnailUrl', 'thumbnail_url']),
      href: `/sermons/${r.id}`,
    })),
  },
  book: {
    load: async (slug, perPage, opts) => rows(await getBooks(slug, { perPage })).map((r) => {
      const covers = r.coverImageUrls ?? r.cover_image_urls ?? [];
      return {
        id: String(r.id ?? ''),
        kind: 'book',
        kindLabel: '',
        title: r.title || '',
        sub: [pick(r, ['author']), pick(r, ['publisher'])].filter(Boolean).join(' · ') || plain(r.recommendation),
        date: dateOf(r, ['recommendedAt', 'recommended_at']),
        image: Array.isArray(covers) ? String(covers[0] ?? '') : '',
        href: opts.bookHref,
      };
    }),
  },
  event: {
    load: async (slug, perPage) => rows(await getEvents(slug, { perPage })).map((r) => ({
      id: String(r.id ?? ''),
      kind: 'event',
      kindLabel: '',
      title: r.title || '',
      sub: plain(r.description),
      date: dateOf(r, ['eventDate', 'event_date']),
      image: pick(r, ['thumbnailUrl', 'thumbnail_url', 'backgroundImageUrl', 'background_image_url']),
      href: `/events/${r.id}`,
    })),
  },
  album: {
    load: async (slug, perPage) => rows(await getAlbums(slug, { perPage })).map((r) => ({
      id: String(r.id ?? ''),
      kind: 'album',
      kindLabel: '',
      title: r.title || '',
      sub: pick(r, ['categoryName', 'category_name']),
      date: dateOf(r, ['albumDate', 'album_date']),
      image: pick(r, ['thumbnailUrl', 'thumbnail_url']),
      href: `/albums/${r.id}`,
    })),
  },
  devotion: {
    load: async (slug, _perPage, opts) => rows(await getDevotions(slug)).map((r) => ({
      id: String(r.id ?? ''),
      kind: 'devotion',
      kindLabel: '',
      title: r.title || '',
      sub: pick(r, ['scriptureRef', 'scripture_ref']) || plain(r.reflection),
      date: dateOf(r, ['devoDate', 'devo_date']),
      image: pick(r, ['imageUrl', 'image_url']),
      href: opts.devotionHref,
    })),
  },
};

// 로더 없는 키는 받지 않는다 — 라벨 맵에만 있고 로더가 없으면 빈 탭이 생긴다.
const KNOWN = Object.fromEntries(
  Object.keys(SOURCES).map((k) => [k, FEED_SOURCE_LABELS[k] ?? k]),
) as Record<string, string>;

export async function LatestFeedBlock({ props, slug }: Props) {
  const title = String(props.title ?? '최신');
  const allLabel = String(props.allLabel ?? '전체');
  const showTabs = String(props.showTabs ?? 'show') !== 'hide';
  const limitRaw = Number(props.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(24, Math.floor(limitRaw)) : 4;
  const perRaw = Number(props.perSource);
  const perSource = Number.isFinite(perRaw) && perRaw > 0 ? Math.min(12, Math.floor(perRaw)) : 4;
  const colRaw = String(props.columns ?? '4');
  const columns = colRaw === '2' ? 2 : colRaw === '3' ? 3 : 4;

  const sources = parseFeedSources(String(props.sources ?? '') || DEFAULT_FEED_SOURCES, KNOWN);
  if (sources.length === 0) return null;

  const opts = {
    bookHref: String(props.bookHref ?? '').trim(),
    devotionHref: String(props.devotionHref ?? '').trim(),
  };

  // 모듈 하나가 죽어도 피드 전체가 사라지지 않도록 각각 독립적으로 삼킨다.
  const batches = await Promise.all(
    sources.map(async ({ key, label }) => {
      try {
        const got = await SOURCES[key]!.load(slug, perSource, opts);
        return got.filter((it) => it.id && it.title).map((it) => ({ ...it, kindLabel: label }));
      } catch {
        return [] as FeedItem[];
      }
    }),
  );

  // 날짜 내림차순 — 날짜가 없는 항목은 뒤로. 등록된 글이 없으면 섹션을 숨긴다.
  const items = batches.flat()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limit);
  if (items.length === 0) return null;

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #fff)">
      <LatestFeedClient
        items={items}
        title={title}
        showTabs={showTabs}
        allLabel={allLabel}
        columns={columns}
        moreLabel={String(props.moreLabel ?? '')}
        moreUrl={String(props.moreUrl ?? '')}
      />
    </DataSection>
  );
}
