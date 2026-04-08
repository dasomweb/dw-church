/**
 * Apply extracted migration data to a tenant using the existing APIs.
 * Dynamic data → direct DB insert (same as API handlers)
 * Static content → page_sections props update
 */

import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';

// ─── Helpers ───────────────────────────────────────────────

/** Strip HTML tags and collapse whitespace */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract image URLs from HTML */
function extractImagesFromHtml(html: string): string[] {
  const imgs: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) imgs.push(match[1]);
  }
  return imgs;
}

/** Try to parse simple table rows from HTML */
function parseTablesFromHtml(html: string): { name: string; day: string; time: string; location: string }[] {
  const services: { name: string; day: string; time: string; location: string }[] = [];
  // Match <tr> rows with <td> cells
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1] ?? '')) !== null) {
      cells.push(stripHtml(cellMatch[1] ?? ''));
    }
    if (cells.length >= 2) {
      services.push({
        name: cells[0] ?? '',
        day: cells[1] ?? '',
        time: cells[2] ?? cells[1] ?? '',
        location: cells[3] ?? '',
      });
    }
  }
  return services;
}

/** Extract phone numbers from text */
function extractPhone(text: string): string {
  const phoneMatch = text.match(/(\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4})/);
  return phoneMatch?.[1] ?? '';
}

/** Extract address-like text (line containing common address words) */
function extractAddress(text: string): string {
  const lines = text.split(/[.\n]/);
  for (const line of lines) {
    const trimmed = line.trim();
    // Korean address patterns
    if (/[시도구군읍면동로길번지]/.test(trimmed) && trimmed.length > 5 && trimmed.length < 200) {
      return trimmed;
    }
    // English address patterns
    if (/\d+\s+\w+\s+(st|ave|rd|blvd|dr|ln|way|ct)/i.test(trimmed) && trimmed.length < 200) {
      return trimmed;
    }
  }
  return '';
}

// ─── Block Props Builder ───────────────────────────────────

interface WpContent {
  title: string;
  slug: string;
  htmlContent: string;
  images: string[];
}

function buildBlockProps(
  blockType: string,
  existingProps: Record<string, unknown>,
  wp: WpContent,
): Record<string, unknown> {
  const plainText = stripHtml(wp.htmlContent);
  const htmlImages = extractImagesFromHtml(wp.htmlContent);
  const allImages = [...new Set([...wp.images, ...htmlImages])];

  switch (blockType) {
    case 'hero_banner':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        backgroundImageUrl: existingProps.backgroundImageUrl || allImages[0] || '',
      };

    case 'text_image':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        content: plainText.slice(0, 2000),
        imageUrl: existingProps.imageUrl || allImages[0] || '',
        images: allImages.length > 0 ? allImages : undefined,
      };

    case 'text_only':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        content: plainText.slice(0, 2000),
      };

    case 'church_intro':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        content: plainText.slice(0, 2000),
        imageUrl: existingProps.imageUrl || allImages[0] || '',
      };

    case 'pastor_message': {
      // Try to extract pastor name from first line or title
      const firstLine = plainText.split(/[.\n]/)[0] ?? '';
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        name: existingProps.name || firstLine.slice(0, 50),
        message: plainText.slice(0, 2000),
        photoUrl: existingProps.photoUrl || allImages[0] || '',
      };
    }

    case 'mission_vision':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        content: plainText.slice(0, 2000),
        imageUrl: existingProps.imageUrl || allImages[0] || '',
      };

    case 'staff_grid':
      // Data comes from staff table — just place the block
      return {
        ...existingProps,
        title: existingProps.title || wp.title || '교역자 소개',
      };

    case 'worship_times': {
      const services = parseTablesFromHtml(wp.htmlContent);
      return {
        ...existingProps,
        title: existingProps.title || wp.title || '예배 안내',
        services: services.length > 0 ? services : (existingProps.services || []),
      };
    }

    case 'location_map': {
      const address = extractAddress(plainText);
      return {
        ...existingProps,
        title: existingProps.title || wp.title || '오시는 길',
        address: existingProps.address || address,
      };
    }

    case 'contact_info': {
      const phone = extractPhone(plainText);
      const address = extractAddress(plainText);
      return {
        ...existingProps,
        title: existingProps.title || wp.title || '연락처',
        phone: existingProps.phone || phone,
        address: existingProps.address || address,
      };
    }

    case 'history_timeline':
      return {
        ...existingProps,
        title: existingProps.title || wp.title || '교회 연혁',
        content: plainText.slice(0, 2000),
      };

    case 'newcomer_info':
      return {
        ...existingProps,
        title: existingProps.title || wp.title || '새가족 안내',
        content: plainText.slice(0, 2000),
        imageUrl: existingProps.imageUrl || allImages[0] || '',
      };

    case 'image_gallery':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        images: allImages,
      };

    case 'quote_block':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        content: plainText.slice(0, 500),
      };

    case 'video': {
      // Try to find YouTube URL
      const ytMatch = wp.htmlContent.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        youtubeUrl: ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : (existingProps.youtubeUrl || ''),
      };
    }

    // Dynamic blocks — just place with defaults, data is in DB tables
    case 'recent_sermons':
    case 'recent_bulletins':
    case 'recent_columns':
    case 'album_gallery':
    case 'event_grid':
    case 'board':
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
      };

    default:
      return {
        ...existingProps,
        title: existingProps.title || wp.title,
        content: plainText.slice(0, 2000),
      };
  }
}

// ─── Apply Page Content ────────────────────────────────────

export async function applyPageContent(
  tenantSlug: string,
  pageId: string | null,
  wpContent: WpContent,
  suggestedBlocks: { blockType: string; props: Record<string, unknown> }[],
): Promise<{ pageId: string; sectionsCreated: number }> {
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let targetPageId = pageId;

  // If no pageId, create the page
  if (!targetPageId) {
    const maxOrder = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
      `SELECT MAX(sort_order) as max FROM "${schema}".pages`,
    );
    const nextOrder = ((maxOrder[0]?.max) ?? 0) + 1;

    const newPage = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schema}".pages (title, slug, sort_order, is_visible)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      wpContent.title,
      wpContent.slug,
      nextOrder,
    );
    if (newPage.length === 0) {
      throw new Error(`Failed to create page: ${wpContent.slug}`);
    }
    targetPageId = newPage[0]!.id;
  }

  // Clear existing page_sections for this page
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid`,
    targetPageId,
  );

  // Insert new sections from suggestedBlocks with enriched props
  let sectionsCreated = 0;
  for (let i = 0; i < suggestedBlocks.length; i++) {
    const block = suggestedBlocks[i]!;
    const enrichedProps = buildBlockProps(block.blockType, block.props, wpContent);

    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
       VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
      targetPageId,
      block.blockType,
      JSON.stringify(enrichedProps),
      i,
    );
    sectionsCreated++;
  }

  return { pageId: targetPageId, sectionsCreated };
}

// ─── Migration Result ──────────────────────────────────────

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
