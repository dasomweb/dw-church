/**
 * Apply extracted migration data to a tenant using the existing APIs.
 * Dynamic data → direct DB insert (same as API handlers)
 * Static content → page_sections props update
 */

import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';

interface MigrationResult {
  sermons: number;
  staff: number;
  events: number;
  history: number;
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
    staff: 0,
    events: 0,
    history: 0,
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
