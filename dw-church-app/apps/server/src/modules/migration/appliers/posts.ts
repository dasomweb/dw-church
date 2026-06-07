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

    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id, status)
         VALUES ($1, $2, $3, $4::date, $5, $6::uuid, 'published')
         ON CONFLICT DO NOTHING`,
        s.title || '',
        s.scripture || '',
        s.youtubeUrl || '',
        s.date || null,
        thumb,
        preacherId,
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
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".bulletins (title, bulletin_date, pdf_url, images, status)
         VALUES ($1, $2::date, $3, $4::jsonb, 'published')
         ON CONFLICT DO NOTHING`,
        b.title || '',
        b.date || null,
        pdf,
        JSON.stringify(images),
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
    const sourceUrl = (c.sourceUrl || '').trim() || null;
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
                       updated_at = NOW()`,
        c.title || '',
        c.content || '',
        topImg,
        c.youtubeUrl || '',
        c.date || null,
        sourceUrl,
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
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".events (title, description, event_date, location, background_image_url, status)
         VALUES ($1, $2, $3, $4, $5, 'published')
         ON CONFLICT DO NOTHING`,
        e.title || '',
        e.description || '',
        e.date || '',
        e.location || '',
        img,
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
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".albums (title, images, thumbnail_url, youtube_url, status)
         VALUES ($1, $2::jsonb, $3, $4, 'published')
         ON CONFLICT DO NOTHING`,
        a.title || '',
        JSON.stringify(images),
        thumbnail,
        a.youtubeUrl || '',
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
