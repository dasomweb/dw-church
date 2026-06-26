import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';

/**
 * YouTube → Sermons / Videos import via the YouTube Data API v3.
 *
 * The operator first picks a SOURCE on the channel — whole uploads, a specific
 * playlist, or past live streams — then previews and imports its videos.
 *
 * Quota-cheap reads: channels.list + playlists.list + playlistItems.list (1
 * unit/page). The "live" source uses search.list (eventType=completed, 100
 * units/call, capped ~500 results) — used only when explicitly chosen.
 *
 * Honesty rule: we NEVER invent data. Title / publish date / video id /
 * thumbnail come straight from the API. Scripture and the sermon Sunday are
 * EXTRACTED from the real title/description when a clear pattern is present,
 * and left blank otherwise. Parsing ported from the operator's reference script.
 */

const API = 'https://www.googleapis.com/youtube/v3';

export type SourceType = 'uploads' | 'playlist' | 'live';

export interface YoutubeSource {
  type: SourceType;
  id: string;          // playlist id (uploads/playlist) or channel id (live)
  title: string;
  count: number | null;
}

export interface YoutubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  url: string;
  thumbnailUrl: string;
  scripture: string;
  sermonDate: string;
  alreadyImported?: boolean;
}

function requireKey(): string {
  if (!env.YOUTUBE_API_KEY) {
    throw new AppError(
      'YOUTUBE_NOT_CONFIGURED',
      503,
      'YouTube 가져오기가 설정되지 않았습니다. 슈퍼어드민에게 YOUTUBE_API_KEY 등록을 요청하세요.',
    );
  }
  return env.YOUTUBE_API_KEY;
}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: requireKey() }).toString();
  const res = await fetch(`${API}/${path}?${qs}`);
  const body = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    throw new AppError('YOUTUBE_API_ERROR', 502, `YouTube API 호출 실패: ${msg}`);
  }
  return body as T;
}

// ─── input parsing ──────────────────────────────────────────────────────
function parseInput(raw: string): { playlistId?: string; channelId?: string; handle?: string; user?: string } {
  const input = raw.trim();
  const list = input.match(/[?&]list=([\w-]+)/) || (/^PL[\w-]+$|^UU[\w-]+$|^FL[\w-]+$/.test(input) ? [null, input] : null);
  const uc = input.match(/(UC[\w-]{22})/);
  const handle = input.match(/@([A-Za-z0-9._-]+)/);
  const user = input.match(/\/user\/([A-Za-z0-9._-]+)/);
  return {
    playlistId: list?.[1] ?? undefined,
    channelId: uc?.[1] ?? undefined,
    handle: handle?.[1] ?? undefined,
    user: user?.[1] ?? undefined,
  };
}

interface ChannelInfo { channelId: string; channelTitle: string; uploads: string }

async function resolveChannel(parsed: ReturnType<typeof parseInput>): Promise<ChannelInfo | null> {
  let param: Record<string, string> | null = null;
  if (parsed.channelId) param = { part: 'contentDetails,snippet', id: parsed.channelId };
  else if (parsed.handle) param = { part: 'contentDetails,snippet', forHandle: parsed.handle };
  else if (parsed.user) param = { part: 'contentDetails,snippet', forUsername: parsed.user };
  if (!param) return null;
  const data = await yt<{ items?: Array<{ id?: string; snippet?: { title?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }> }>('channels', param);
  const item = data.items?.[0];
  const uploads = item?.contentDetails?.relatedPlaylists?.uploads;
  if (!item?.id || !uploads) return null;
  return { channelId: item.id, channelTitle: item.snippet?.title ?? '', uploads };
}

/** List importable sources for a channel URL/@handle/id, or a single playlist URL. */
export async function listSources(raw: string): Promise<{ channelTitle: string; sources: YoutubeSource[] }> {
  const parsed = parseInput(raw);
  const sources: YoutubeSource[] = [];
  let channelTitle = '';
  let channel: ChannelInfo | null = null;

  // A playlist URL pasted directly → resolve its channel from the playlist.
  if (parsed.playlistId && !parsed.channelId && !parsed.handle && !parsed.user) {
    const pl = await yt<{ items?: Array<{ snippet?: { title?: string; channelId?: string }; contentDetails?: { itemCount?: number } }> }>(
      'playlists', { part: 'snippet,contentDetails', id: parsed.playlistId },
    );
    const item = pl.items?.[0];
    if (item) {
      sources.push({ type: 'playlist', id: parsed.playlistId, title: item.snippet?.title ?? '재생목록', count: item.contentDetails?.itemCount ?? null });
      if (item.snippet?.channelId) channel = await resolveChannel({ channelId: item.snippet.channelId });
    }
  } else {
    channel = await resolveChannel(parsed);
  }

  if (channel) {
    channelTitle = channel.channelTitle;
    // Whole-channel uploads.
    if (!sources.some((s) => s.id === channel!.uploads)) {
      sources.unshift({ type: 'uploads', id: channel.uploads, title: '채널 전체 영상', count: null });
    }
    // The channel's playlists.
    let pageToken: string | undefined;
    for (let g = 0; g < 10; g++) {
      const params: Record<string, string> = { part: 'snippet,contentDetails', channelId: channel.channelId, maxResults: '50' };
      if (pageToken) params.pageToken = pageToken;
      const data = await yt<{ nextPageToken?: string; items?: Array<{ id?: string; snippet?: { title?: string }; contentDetails?: { itemCount?: number } }> }>('playlists', params);
      for (const it of data.items ?? []) {
        if (it.id && !sources.some((s) => s.id === it.id)) {
          sources.push({ type: 'playlist', id: it.id, title: it.snippet?.title ?? '재생목록', count: it.contentDetails?.itemCount ?? null });
        }
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    // Past live streams (search-based, fetched on demand).
    sources.push({ type: 'live', id: channel.channelId, title: '라이브 / 지난 방송', count: null });
  }

  if (sources.length === 0) {
    throw new AppError('YOUTUBE_CHANNEL_NOT_FOUND', 404, '채널 또는 재생목록을 찾을 수 없습니다. URL/ID/@핸들을 확인하세요.');
  }
  return { channelTitle, sources };
}

// ─── parsing (ported from the operator's reference script) ──────────────
const BIBLE_LABEL = /(?:본문|성경본문|말씀)\s*[:：]?\s*([^\n|/]+)/;
const BIBLE_REF = /[가-힣]{1,6}서?\s*\d{1,3}\s*[:：]\s*\d{1,3}(?:\s*[-~]\s*\d{1,3})?/;
const DATE_FULL = /(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/;
const DATE_YY = /\b(\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})\b/;

function parseScripture(text: string): string {
  const label = BIBLE_LABEL.exec(text);
  if (label?.[1]) return label[1].trim();
  const ref = BIBLE_REF.exec(text);
  return ref ? ref[0].trim() : '';
}

function parseSermonDate(text: string): string {
  let y: number, mo: number, d: number;
  const full = DATE_FULL.exec(text);
  if (full) [y, mo, d] = [Number(full[1]), Number(full[2]), Number(full[3])];
  else {
    const yy = DATE_YY.exec(text);
    if (!yy) return '';
    [y, mo, d] = [2000 + Number(yy[1]), Number(yy[2]), Number(yy[3])];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? '' : iso;
}

function videoIdFromUrl(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

function buildVideo(videoId: string, title: string, description: string, publishedAt: string): YoutubeVideo {
  const blob = `${title}\n${description}`;
  return {
    videoId,
    title,
    description,
    publishedAt,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    scripture: parseScripture(blob),
    sermonDate: parseSermonDate(blob) || (publishedAt ? publishedAt.slice(0, 10) : ''),
  };
}

async function fetchPlaylistVideos(playlistId: string): Promise<YoutubeVideo[]> {
  const out: YoutubeVideo[] = [];
  let pageToken: string | undefined;
  for (let g = 0; g < 40; g++) {
    const params: Record<string, string> = { part: 'snippet,contentDetails', playlistId, maxResults: '50' };
    if (pageToken) params.pageToken = pageToken;
    const data = await yt<{ nextPageToken?: string; items?: Array<{ contentDetails?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } }> }>('playlistItems', params);
    for (const it of data.items ?? []) {
      const videoId = it.contentDetails?.videoId;
      const title = it.snippet?.title ?? '';
      if (!videoId || title === 'Private video' || title === 'Deleted video') continue;
      out.push(buildVideo(videoId, title, it.snippet?.description ?? '', it.snippet?.publishedAt ?? ''));
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

async function fetchLiveVideos(channelId: string): Promise<YoutubeVideo[]> {
  const out: YoutubeVideo[] = [];
  let pageToken: string | undefined;
  for (let g = 0; g < 10; g++) {
    const params: Record<string, string> = {
      part: 'snippet', channelId, eventType: 'completed', type: 'video', order: 'date', maxResults: '50',
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await yt<{ nextPageToken?: string; items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } }> }>('search', params);
    for (const it of data.items ?? []) {
      const videoId = it.id?.videoId;
      if (!videoId) continue;
      out.push(buildVideo(videoId, it.snippet?.title ?? '', it.snippet?.description ?? '', it.snippet?.publishedAt ?? ''));
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

/** Fetch a chosen source's videos, oldest first, flagged for already-imported. */
export async function fetchSource(
  schema: string,
  source: YoutubeSource,
  target: 'sermons' | 'videos',
): Promise<{ videos: YoutubeVideo[] }> {
  const videos = source.type === 'live'
    ? await fetchLiveVideos(source.id)
    : await fetchPlaylistVideos(source.id);

  videos.sort((a, b) => (a.sermonDate < b.sermonDate ? -1 : a.sermonDate > b.sermonDate ? 1 : 0));

  const table = target === 'sermons' ? 'sermons' : 'videos';
  const existing = await prisma.$queryRawUnsafe<{ youtube_url: string | null }[]>(
    `SELECT youtube_url FROM "${schema}".${table} WHERE youtube_url IS NOT NULL`,
  );
  const have = new Set(existing.map((r) => (r.youtube_url ? videoIdFromUrl(r.youtube_url) : null)).filter(Boolean) as string[]);
  for (const v of videos) v.alreadyImported = have.has(v.videoId);

  return { videos };
}

export interface ApplyOptions {
  target: 'sermons' | 'videos';
  videos: YoutubeVideo[];
  status: 'draft' | 'published';
  categoryId?: string | null;
  preacher?: string | null;
}

export async function applyImport(schema: string, opts: ApplyOptions): Promise<{ imported: number; skipped: number }> {
  const { target, videos, status } = opts;
  if (!videos.length) return { imported: 0, skipped: 0 };

  const table = target === 'sermons' ? 'sermons' : 'videos';
  const existing = await prisma.$queryRawUnsafe<{ youtube_url: string | null }[]>(
    `SELECT youtube_url FROM "${schema}".${table} WHERE youtube_url IS NOT NULL`,
  );
  const have = new Set(existing.map((r) => (r.youtube_url ? videoIdFromUrl(r.youtube_url) : null)).filter(Boolean) as string[]);

  let imported = 0;
  let skipped = 0;

  if (target === 'sermons') {
    let preacherId: string | null = null;
    if (opts.preacher?.trim()) {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${schema}".preachers WHERE name = $1 LIMIT 1`, opts.preacher.trim(),
      );
      preacherId = rows[0]?.id ?? null;
    }
    for (const v of videos) {
      if (have.has(v.videoId)) { skipped++; continue; }
      const ins = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id, status)
         VALUES ($1, $2, $3, $4::date, $5, $6::uuid, $7) RETURNING id`,
        v.title, v.scripture || null, v.url, v.sermonDate || null, v.thumbnailUrl, preacherId, status,
      );
      const sermonId = ins[0]?.id;
      if (sermonId && opts.categoryId) {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "${schema}".sermon_category_map (sermon_id, category_id) VALUES ($1::uuid, $2::uuid)`,
          sermonId, opts.categoryId,
        );
      }
      have.add(v.videoId);
      imported++;
    }
  } else {
    for (const v of videos) {
      if (have.has(v.videoId)) { skipped++; continue; }
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".videos (title, youtube_url, video_date, thumbnail_url, category_id, status)
         VALUES ($1, $2, $3::date, $4, $5::uuid, $6)`,
        v.title, v.url, v.sermonDate || null, v.thumbnailUrl, opts.categoryId || null, status,
      );
      have.add(v.videoId);
      imported++;
    }
  }

  return { imported, skipped };
}

export function youtubeImportConfigured(): boolean {
  return !!env.YOUTUBE_API_KEY;
}
