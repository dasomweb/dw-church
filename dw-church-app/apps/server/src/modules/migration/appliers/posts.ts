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
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".bulletins (title, bulletin_date, pdf_url, images, status)
         VALUES ($1, $2::date, $3, $4::jsonb, 'published')
         ON CONFLICT DO NOTHING`,
        b.title || '',
        b.date || null,
        b.pdfUrl || '',
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
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".columns_pastoral (title, content, top_image_url, youtube_url, status)
         VALUES ($1, $2, $3, $4, 'published')
         ON CONFLICT DO NOTHING`,
        c.title || '',
        c.content || '',
        topImg,
        c.youtubeUrl || '',
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
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".albums (title, images, youtube_url, status)
         VALUES ($1, $2::jsonb, $3, 'published')
         ON CONFLICT DO NOTHING`,
        a.title || '',
        JSON.stringify(images),
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
