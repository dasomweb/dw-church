/**
 * Posts Applier — handles all posting-type data:
 * sermons, bulletins, columns, events, albums, boards.
 * Matches actual DB schema from tenant-template.sql.
 */

import { prisma } from '../../../config/database.js';
import { validateSchemaName } from '../../../utils/validate-schema.js';
import type {
  ClassifiedSermon,
  ClassifiedBulletin,
  ClassifiedColumn,
  ClassifiedEvent,
  ClassifiedAlbum,
  ClassifiedBoard,
} from '../types.js';
import type { ImageUrlMap } from './images.js';
import { normalizeDate, migrationKey } from './normalize-date.js';

// ─── Sermons ────────────────────────────────────────────────
// DB has preacher_id FK → preachers table. We look up or create preacher by name.

export async function applySermons(
  tenantSlug: string,
  sermons: ClassifiedSermon[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (sermons.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  // Get or create default preacher
  let defaultPreacherId: string | null = null;
  const defaultPreachers = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schema}".preachers WHERE is_default = true LIMIT 1`,
  );
  defaultPreacherId = defaultPreachers[0]?.id || null;

  // Cache: preacher name → id
  const preacherCache = new Map<string, string>();

  for (const s of sermons) {
    const thumb = urlMap.get(s.thumbnailUrl) || s.thumbnailUrl;

    // Resolve preacher
    let preacherId = defaultPreacherId;
    if (s.preacher) {
      if (preacherCache.has(s.preacher)) {
        preacherId = preacherCache.get(s.preacher)!;
      } else {
        const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM "${schema}".preachers WHERE name = $1 LIMIT 1`,
          s.preacher,
        );
        if (existing.length > 0) {
          preacherId = existing[0]!.id;
        } else {
          const created = await prisma.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO "${schema}".preachers (name, is_default) VALUES ($1, false) RETURNING id`,
            s.preacher,
          );
          preacherId = created[0]!.id;
        }
        preacherCache.set(s.preacher, preacherId!);
      }
    }

    // Normalize the source date so a non-ISO literal (2024.03.15, 2024년 3월
    // 15일, …) doesn't throw on ::date and drop the whole sermon. Re-import is
    // idempotent on source_url (real permalink or a synthetic title+date key).
    const sermonDate = normalizeDate(s.date);
    const key = migrationKey('sermon', s.sourceUrl, s.title, s.date);
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id, status, source_url)
         VALUES ($1, $2, $3, $4::date, $5, $6::uuid, 'published', $7)
         ON CONFLICT (source_url) WHERE source_url IS NOT NULL
         DO UPDATE SET title = EXCLUDED.title, scripture = EXCLUDED.scripture,
                       youtube_url = EXCLUDED.youtube_url, sermon_date = EXCLUDED.sermon_date,
                       thumbnail_url = EXCLUDED.thumbnail_url, preacher_id = EXCLUDED.preacher_id,
                       updated_at = NOW()`,
        s.title || '',
        s.scripture || '',
        s.youtubeUrl || '',
        sermonDate,
        thumb,
        preacherId,
        key,
      );
      count++;
    } catch {
      // Skip duplicates or invalid data
    }
  }

  return count;
}

// ─── Bulletins ──────────────────────────────────────────────

export async function applyBulletins(
  tenantSlug: string,
  bulletins: ClassifiedBulletin[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (bulletins.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (const b of bulletins) {
    const images = (b.images || []).map((url) => urlMap.get(url) || url);
    // pdfUrl is migrated to R2 too (mapped in urlMap) — never store the source
    // hotlink. Falls back to the original only if migration failed.
    const pdf = (b.pdfUrl && urlMap.get(b.pdfUrl)) || b.pdfUrl || '';
    // bulletin_date is NOT NULL — COALESCE to CURRENT_DATE so a missing/
    // unparseable source date imports the bulletin instead of dropping it.
    const bulletinDate = normalizeDate(b.date);
    const thumb = images[0] || '';
    const key = migrationKey('bulletin', b.sourceUrl, b.title, b.date);
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".bulletins (title, bulletin_date, pdf_url, images, thumbnail_url, status, source_url)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4::jsonb, $5, 'published', $6)
         ON CONFLICT (source_url) WHERE source_url IS NOT NULL
         DO UPDATE SET title = EXCLUDED.title, bulletin_date = EXCLUDED.bulletin_date,
                       pdf_url = EXCLUDED.pdf_url, images = EXCLUDED.images,
                       thumbnail_url = EXCLUDED.thumbnail_url, updated_at = NOW()`,
        b.title || '',
        bulletinDate,
        pdf,
        JSON.stringify(images),
        thumb,
        key,
      );
      count++;
    } catch {
      // Skip
    }
  }

  return count;
}

// ─── Columns (목회칼럼) ─────────────────────────────────────

export async function applyColumns(
  tenantSlug: string,
  columns: ClassifiedColumn[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (columns.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (const c of columns) {
    const topImg = urlMap.get(c.topImageUrl) || c.topImageUrl;
    // Normalize the date (KR/dot/slash → YYYY-MM-DD) and fall back to a
    // synthetic title+date key when the source gave no permalink, so a
    // re-import still UPDATEs instead of duplicating.
    const createdAt = normalizeDate(c.date);
    const key = migrationKey('column', c.sourceUrl, c.title, c.date);
    try {
      // created_at preserves source publish order. When the source page
      // gave us a date, COALESCE picks it; null falls back to NOW().
      // Idempotent on source_url: re-importing the same post UPDATEs the row
      // (refreshing content/image) instead of inserting a duplicate.
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".columns_pastoral (title, content, top_image_url, youtube_url, status, created_at, source_url)
         VALUES ($1, $2, $3, $4, 'published', COALESCE($5::timestamptz, NOW()), $6)
         ON CONFLICT (source_url) WHERE source_url IS NOT NULL
         DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content,
                       top_image_url = EXCLUDED.top_image_url, youtube_url = EXCLUDED.youtube_url,
                       created_at = EXCLUDED.created_at, updated_at = NOW()`,
        c.title || '',
        c.content || '',
        topImg,
        c.youtubeUrl || '',
        createdAt,
        key,
      );
      count++;
    } catch {
      // Skip
    }
  }

  return count;
}

// ─── Events ─────────────────────────────────────────────────
// DB: event_date is VARCHAR, background_image_url is the image field

export async function applyEvents(
  tenantSlug: string,
  events: ClassifiedEvent[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (events.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (const e of events) {
    const img = urlMap.get(e.imageUrl) || e.imageUrl;
    // event_date is a free-form VARCHAR (can read "매주 주일 오후 2시") — keep the
    // source string verbatim. created_at carries the parsed date so the list
    // still orders by real recency; idempotent on source_url.
    const createdAt = normalizeDate(e.date);
    const key = migrationKey('event', e.sourceUrl, e.title, e.date);
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".events (title, description, event_date, location, background_image_url, status, created_at, source_url)
         VALUES ($1, $2, $3, $4, $5, 'published', COALESCE($6::timestamptz, NOW()), $7)
         ON CONFLICT (source_url) WHERE source_url IS NOT NULL
         DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
                       event_date = EXCLUDED.event_date, location = EXCLUDED.location,
                       background_image_url = EXCLUDED.background_image_url,
                       created_at = EXCLUDED.created_at, updated_at = NOW()`,
        e.title || '',
        e.description || '',
        e.date || '',
        e.location || '',
        img,
        createdAt,
        key,
      );
      count++;
    } catch {
      // Skip
    }
  }

  return count;
}

// ─── Albums ─────────────────────────────────────────────────

export async function applyAlbums(
  tenantSlug: string,
  albums: ClassifiedAlbum[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (albums.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (const a of albums) {
    const images = (a.images || []).map((url) => urlMap.get(url) || url);
    // Cover/featured image: gallery cards render thumbnail_url. Without it
    // they show a placeholder even though images[] is populated. Default it
    // to the first migrated image.
    const thumbnail = images[0] || '';
    // Albums have no dedicated date column — created_at carries the source
    // publish date so the gallery keeps its original order (list sorts by
    // created_at DESC). Idempotent on source_url.
    const createdAt = normalizeDate(a.date);
    const key = migrationKey('album', a.sourceUrl, a.title, a.date);
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".albums (title, images, thumbnail_url, youtube_url, status, created_at, source_url)
         VALUES ($1, $2::jsonb, $3, $4, 'published', COALESCE($5::timestamptz, NOW()), $6)
         ON CONFLICT (source_url) WHERE source_url IS NOT NULL
         DO UPDATE SET title = EXCLUDED.title, images = EXCLUDED.images,
                       thumbnail_url = EXCLUDED.thumbnail_url, youtube_url = EXCLUDED.youtube_url,
                       created_at = EXCLUDED.created_at, updated_at = NOW()`,
        a.title || '',
        JSON.stringify(images),
        thumbnail,
        a.youtubeUrl || '',
        createdAt,
        key,
      );
      count++;
    } catch {
      // Skip
    }
  }

  return count;
}

// ─── Boards (게시판) ────────────────────────────────────────
// boards table = board definition, board_posts = actual posts

export async function applyBoards(
  tenantSlug: string,
  boards: ClassifiedBoard[],
): Promise<number> {
  if (boards.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  // Phase 12-γ.5 (2026-06-03): self-heal — some older tenants were cloned
  // from tenant_template BEFORE the boards/board_posts tables were added
  // to the template (라그란지한인침례교회 hit P42P01). Create them now if
  // missing so migration never fails for that reason.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schema}".boards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".board_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      board_id UUID NOT NULL REFERENCES "${schema}".boards(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      author_name VARCHAR(100) NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      attachments JSONB DEFAULT '[]',
      view_count INT DEFAULT 0,
      is_pinned BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  for (const board of boards) {
    // Find or create board
    let boardRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schema}".boards WHERE slug = $1 LIMIT 1`,
      board.boardSlug,
    );
    if (boardRows.length === 0) {
      boardRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schema}".boards (title, slug, is_active) VALUES ($1, $2, true) RETURNING id`,
        board.boardTitle || board.boardSlug,
        board.boardSlug,
      );
    }
    const boardId = boardRows[0]!.id;

    // Insert posts
    for (const post of board.posts) {
      try {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "${schema}".board_posts (board_id, title, content, author_name, status, created_at)
           VALUES ($1::uuid, $2, $3, $4, 'published', COALESCE($5::timestamptz, NOW()))
           ON CONFLICT DO NOTHING`,
          boardId,
          post.title || '',
          post.content || '',
          post.author || '',
          post.date || null,
        );
        count++;
      } catch {
        // Skip
      }
    }
  }

  return count;
}
