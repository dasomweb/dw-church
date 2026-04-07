/**
 * Apply extracted migration data to a tenant using the existing APIs.
 * Dynamic data → direct DB insert (same as API handlers)
 * Static content → page_sections props update
 */

import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';

interface MigrationResult {
  sermons: number;
  bulletins: number;
  albums: number;
  staff: number;
  events: number;
  history: number;
  columns: number;
  boards: number;
  pages: number;
  settings: number;
  worshipTimes: number;
  images: number;
}

export async function applyMigration(
  tenantSlug: string,
  data: Record<string, unknown>,
): Promise<MigrationResult> {
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  const result: MigrationResult = {
    sermons: 0,
    bulletins: 0,
    albums: 0,
    staff: 0,
    events: 0,
    history: 0,
    columns: 0,
    boards: 0,
    pages: 0,
    settings: 0,
    worshipTimes: 0,
    images: 0,
  };

  // ─── Church Info → Settings ────────────────────────────
  const churchInfo = data.churchInfo as Record<string, string> | undefined;
  if (churchInfo) {
    const settingsMap: Record<string, string> = {
      name: 'church_name',
      address: 'church_address',
      phone: 'church_phone',
      email: 'church_email',
      description: 'seo_description',
      logoUrl: 'logo_url',
    };
    for (const [key, dbKey] of Object.entries(settingsMap)) {
      const value = churchInfo[key];
      if (value) {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "${schema}".settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          dbKey,
          value,
        );
        result.settings++;
      }
    }
  }

  // ─── Sermons ───────────────────────────────────────────
  const sermons = data.sermons as Record<string, string>[] | undefined;
  if (sermons?.length) {
    for (const s of sermons) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, status)
         VALUES ($1, $2, $3, $4::date, $5, 'published')
         ON CONFLICT DO NOTHING`,
        s.title || '',
        s.scripture || '',
        s.youtubeUrl || '',
        s.date || null,
        s.thumbnailUrl || '',
      );
      result.sermons++;
    }
  }

  // ─── Staff ─────────────────────────────────────────────
  const staff = data.staff as Record<string, string>[] | undefined;
  if (staff?.length) {
    for (const s of staff) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".staff (name, role, department, photo_url, bio, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT DO NOTHING`,
        s.name || '',
        s.role || '',
        s.department || '',
        s.photoUrl || '',
        s.bio || '',
      );
      result.staff++;
    }
  }

  // ─── Events ────────────────────────────────────────────
  const events = data.events as Record<string, string>[] | undefined;
  if (events?.length) {
    for (const e of events) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".events (title, description, event_date, location, status)
         VALUES ($1, $2, $3::date, $4, 'published')
         ON CONFLICT DO NOTHING`,
        e.title || '',
        e.description || '',
        e.date || null,
        e.location || '',
      );
      result.events++;
    }
  }

  // ─── Bulletins (주보) ───────────────────────────────────
  const bulletins = data.bulletins as Record<string, string>[] | undefined;
  if (bulletins?.length) {
    for (const b of bulletins) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".bulletins (title, bulletin_date, pdf_url, images, status)
         VALUES ($1, $2::date, $3, $4::jsonb, 'published')
         ON CONFLICT DO NOTHING`,
        b.title || '',
        b.date || null,
        b.pdfUrl || '',
        JSON.stringify(b.images || []),
      );
      result.bulletins++;
    }
  }

  // ─── Albums (앨범/갤러리) ──────────────────────────────
  const albums = data.albums as Record<string, unknown>[] | undefined;
  if (albums?.length) {
    for (const a of albums) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".albums (title, images, youtube_url, status)
         VALUES ($1, $2::jsonb, $3, 'published')
         ON CONFLICT DO NOTHING`,
        (a.title as string) || '',
        JSON.stringify(a.images || []),
        (a.youtubeUrl as string) || '',
      );
      result.albums++;
    }
  }

  // ─── Columns (목회칼럼) ────────────────────────────────
  const columns = data.columns as Record<string, string>[] | undefined;
  if (columns?.length) {
    for (const c of columns) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".columns_pastoral (title, content, top_image_url, youtube_url, status)
         VALUES ($1, $2, $3, $4, 'published')
         ON CONFLICT DO NOTHING`,
        c.title || '',
        c.content || '',
        c.imageUrl || '',
        c.youtubeUrl || '',
      );
      result.columns++;
    }
  }

  // ─── Boards (게시판: 선교소식, 교육부, 목장 등) ─────────
  const boards = data.boards as { boardSlug: string; posts: Record<string, string>[] }[] | undefined;
  if (boards?.length) {
    for (const board of boards) {
      for (const post of board.posts) {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "${schema}".boards (board_slug, title, content, author, status, created_at)
           VALUES ($1, $2, $3, $4, 'published', COALESCE($5::timestamptz, NOW()))
           ON CONFLICT DO NOTHING`,
          board.boardSlug,
          post.title || '',
          post.content || '',
          post.author || '',
          post.date || null,
        );
        result.boards++;
      }
    }
  }

  // ─── History ───────────────────────────────────────────
  const history = data.history as Record<string, string>[] | undefined;
  if (history?.length) {
    for (const h of history) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".history (year, month, title, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        h.year || '',
        h.month || '',
        h.title || '',
        h.description || '',
      );
      result.history++;
    }
  }

  // ─── Worship Times → Settings (JSON) ───────────────────
  const worshipTimes = data.worshipTimes as Record<string, string>[] | undefined;
  if (worshipTimes?.length) {
    // Find worship page and update its section props
    const worshipPages = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT ps.id FROM "${schema}".page_sections ps
       JOIN "${schema}".pages p ON ps.page_id = p.id
       WHERE p.slug = 'worship' AND ps.block_type = 'worship_times'
       ORDER BY ps.sort_order LIMIT 1`,
    );
    if (worshipPages.length > 0) {
      await prisma.$queryRawUnsafe(
        `UPDATE "${schema}".page_sections SET props = $1::jsonb WHERE id = $2::uuid`,
        JSON.stringify({ title: '예배 안내', services: worshipTimes }),
        worshipPages[0]!.id,
      );
      result.worshipTimes = worshipTimes.length;
    }
  }

  // ─── Static Page Content → page_sections props ─────────
  const pages = data.pages as { slug: string; sections: { blockType: string; props: Record<string, unknown> }[] }[] | undefined;
  if (pages?.length) {
    for (const page of pages) {
      // Find existing page
      const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${schema}".pages WHERE slug = $1 LIMIT 1`,
        page.slug,
      );
      if (existing.length === 0) continue;
      const pageId = existing[0]!.id;

      // Update or insert sections
      for (let i = 0; i < page.sections.length; i++) {
        const sec = page.sections[i]!;
        // Check if section exists at this position
        const existingSec = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM "${schema}".page_sections
           WHERE page_id = $1::uuid AND sort_order = $2 LIMIT 1`,
          pageId,
          i,
        );
        if (existingSec.length > 0) {
          // Update existing section props (merge)
          await prisma.$queryRawUnsafe(
            `UPDATE "${schema}".page_sections
             SET props = props || $1::jsonb, block_type = $2
             WHERE id = $3::uuid`,
            JSON.stringify(sec.props),
            sec.blockType,
            existingSec[0]!.id,
          );
        } else {
          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
             VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
            pageId,
            sec.blockType,
            JSON.stringify(sec.props),
            i,
          );
        }
      }
      result.pages++;
    }
  }

  return result;
}
