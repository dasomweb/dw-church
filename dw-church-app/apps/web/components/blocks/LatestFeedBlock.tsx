import {
  getSermonNotes, getColumns, getOnlineBulletins, getSermons,
  getBooks, getEvents, getAlbums, getDevotions,
} from '@/lib/api';
import {
  FEED_SOURCE_LABELS, DEFAULT_FEED_SOURCES, parseFeedSources, plainExcerpt,
  parseRailLinks, splitRailLines,
} from '@dw-church/blocks';
import { DataSection } from './DataSection';
import { LatestFeedClient, type FeedItem } from './LatestFeedClient';
import { LatestFeedRail, shortDate, type RailRow } from './LatestFeedRail';

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
 *   sources    담을 모듈 — `키[@카테고리][:라벨]` 을 쉼표로. 라벨 생략 시
 *              카테고리 이름(없으면 모듈 기본 이름). `@카테고리` 를 쓰면 같은
 *              모듈을 연재별로 여러 줄 담을 수 있다 —
 *              `column@교회이야기, column@시니어:시니어 라운지, column@일과 영성`
 *              키: sermon_note · column · online_bulletin · sermon · book ·
 *                  event · album · devotion
 *   showTabs   카테고리 탭 표시/숨김
 *   allLabel   '전체' 탭 라벨
 *   limit      카드 총 개수 (기본 4)
 *   perSource  모듈별로 가져올 개수 (기본 4) — 한 모듈이 피드를 독점하지 않게
 *   columns    열 수 2 / 3 / 4
 *   bookHref / devotionHref  상세 라우트가 없는 모듈의 연결 주소(비우면 링크 없음)
 *   moreLabel / moreUrl      섹션 하단 더보기 링크
 *
 * variant `rail-left` / `rail-right` — 카드 옆에 좁은 안내 레일을 세운다.
 *   railTitle / railLines          이번 주 안내 (라벨 + `|` 로 나눈 줄)
 *   railPrayerTitle / railPrayerItems / railPrayerSource
 *                                  기도제목 — source 가 online_bulletin 이면
 *                                  최신 주보에 적은 기도제목을 자동으로 쓴다
 *   railLinks                      바로가기 줄 — `키[:라벨]` (rail-links.ts 문법)
 *   featureEvery                   N번째마다 전폭 피처 행 (0 = 끔, 시안 6)
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
    // opts.category 가 있으면 그 연재만. 저널 카테고리(교회이야기 · 시니어 ·
    // Biblical Parenting · 일과 영성 …)별로 피드 줄을 따로 세울 때 쓴다.
    load: async (slug, perPage, opts) => rows(await getColumns(slug, {
      perPage,
      ...(opts.category ? { category: opts.category } : {}),
    })).map((r) => ({
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

/**
 * 사이드 레일에 들어갈 값을 모은다.
 *
 * 바로가기 줄의 오른쪽 값·주소는 각 모듈의 **최신 글**에서 채운다(피드 카드와
 * 같은 로더를 쓴다 — 상세 주소 규칙이 한 곳에만 있게). 기도제목은 최신 주보에
 * 적은 것을 그대로 가져올 수 있다. 둘 다 주마다 손으로 고치지 않게 하려는 것이다.
 */
async function buildRail(slug: string, props: Record<string, unknown>, opts: Record<string, string>) {
  const links = parseRailLinks(String(props.railLinks ?? ''), KNOWN);

  const railRows: RailRow[] = await Promise.all(links.map(async (link) => {
    // 운영자가 주소를 직접 적은 줄 — 날짜가 없으니 화살표만.
    if (!link.key) return { id: link.id, label: link.label, value: '›', href: link.href };
    try {
      const [latest] = await SOURCES[link.key]!.load(slug, 1, opts);
      return {
        id: link.id,
        label: link.label,
        value: shortDate(latest?.date),
        href: latest?.href || undefined,
      };
    } catch {
      // 모듈 하나가 죽어도 레일 전체가 사라지지 않게 그 줄만 값 없이 둔다
      // (링크도 걸지 않는다 — 죽은 링크보다 안 눌리는 줄이 낫다).
      return { id: link.id, label: link.label, value: '' };
    }
  }));

  let prayerItems = splitRailLines(props.railPrayerItems);
  if (String(props.railPrayerSource ?? 'online_bulletin') === 'online_bulletin') {
    try {
      const [bulletin] = rows(await getOnlineBulletins(slug, { perPage: 1 }));
      const content = (bulletin?.content ?? {}) as Record<string, any>;
      const requests = Array.isArray(content.prayerRequests) ? content.prayerRequests : [];
      const titles = requests.map((r: any) => String(r?.title ?? '').trim()).filter(Boolean);
      // 220px 레일이라 길면 벽이 된다 — 앞쪽 몇 개만. 전체는 주보 상세에 있다.
      if (titles.length > 0) prayerItems = titles.slice(0, 5);
    } catch {
      // 주보를 못 읽으면 운영자가 직접 적은 목록(railPrayerItems)으로 떨어진다.
    }
  }

  return (
    <LatestFeedRail
      title={String(props.railTitle ?? 'THIS WEEK')}
      lines={splitRailLines(props.railLines)}
      prayerTitle={String(props.railPrayerTitle ?? '기도제목')}
      prayerItems={prayerItems}
      rows={railRows}
    />
  );
}

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
  // N번째마다 전폭 피처 행(0 = 끔). 시안은 6 — 0·6번째 카드가 큰 행이 된다.
  const featureRaw = Number(props.featureEvery);
  const featureEvery = Number.isFinite(featureRaw) && featureRaw > 0 ? Math.min(12, Math.floor(featureRaw)) : 0;

  // 사이드 레일 variant — 좌/우 두 가지. 레일을 안 쓰면 기존 전폭 레이아웃 그대로다.
  const variant = String(props.variant ?? '');
  const showRail = variant === 'rail-left' || variant === 'rail-right';
  const railSide = variant === 'rail-right' ? 'right' : 'left';

  const sources = parseFeedSources(String(props.sources ?? '') || DEFAULT_FEED_SOURCES, KNOWN);
  if (sources.length === 0) return null;

  const opts = {
    bookHref: String(props.bookHref ?? '').trim(),
    devotionHref: String(props.devotionHref ?? '').trim(),
  };

  // 모듈 하나가 죽어도 피드 전체가 사라지지 않도록 각각 독립적으로 삼킨다.
  const batches = await Promise.all(
    sources.map(async ({ key, label, category, id: sourceId }) => {
      try {
        const got = await SOURCES[key]!.load(slug, perSource, {
          ...opts,
          ...(category ? { category } : {}),
        });
        // kind 를 소스 id(`키` 또는 `키@카테고리`)로 둔다 — 탭을 가르는 단위가
        // 모듈이 아니라 소스 한 줄이어야 같은 모듈을 연재별로 나눠 담을 수 있다.
        return got.filter((it) => it.id && it.title)
          .map((it) => ({ ...it, kind: sourceId, kindLabel: label }));
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
        rail={showRail ? await buildRail(slug, props, opts) : null}
        railSide={railSide}
        featureEvery={featureEvery}
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
