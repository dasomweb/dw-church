/**
 * Core module: maps WP REST API data to tenant page sections with proper content.
 * Downloads images to R2, builds block props from structured WP data.
 */

import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import { uploadFile as r2Upload } from '../../config/r2.js';
import { randomUUID } from 'crypto';
import type { WPPage, WPPost } from './wp-api.js';

// ─── Helpers ───────────────────────────────────────────────

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract all <img src> URLs from HTML */
function extractImagesFromHtml(html: string): string[] {
  const imgs: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    if (match[1] && !match[1].startsWith('data:')) imgs.push(match[1]);
  }
  return [...new Set(imgs)];
}

/** Extract <table> rows as service-like objects */
function extractTablesFromHtml(html: string): { name: string; time: string; location: string }[] {
  const services: { name: string; time: string; location: string }[] = [];
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
        time: cells[1] ?? '',
        location: cells[2] ?? '',
      });
    }
  }
  return services;
}

/** Extract YouTube URLs from HTML (embeds, iframes, links) */
function extractYoutubeUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) urls.push(`https://www.youtube.com/watch?v=${match[1]}`);
  }
  return [...new Set(urls)];
}

/** Extract first blockquote text from HTML */
function extractBlockquote(html: string): string {
  const match = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  return match ? stripHtml(match[1] ?? '') : '';
}

/** Extract address from plain text (Korean or English patterns) */
function extractAddress(text: string): string {
  const lines = text.split(/[.\n]/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/[시도구군읍면동로길번지]/.test(trimmed) && trimmed.length > 5 && trimmed.length < 200) {
      return trimmed;
    }
    if (/\d+\s+\w+\s+(st|ave|rd|blvd|dr|ln|way|ct)/i.test(trimmed) && trimmed.length < 200) {
      return trimmed;
    }
  }
  return '';
}

// ─── Image Migration ───────────────────────────────────────

/** Download an external image and upload to R2. Returns R2 URL or original on failure. */
async function migrateImageToR2(imageUrl: string, tenantSlug: string): Promise<string> {
  if (!imageUrl || imageUrl.startsWith('data:')) return imageUrl;
  // Already on R2
  if (imageUrl.includes('r2.dev/') || imageUrl.includes('r2.cloudflarestorage.com')) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'TrueLight-Migration/1.0' },
    });
    if (!res.ok) return imageUrl;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());

    // Max 5MB per image
    if (buffer.length > 5 * 1024 * 1024) return imageUrl;

    const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
    const key = `tenant_${tenantSlug}/migration/${randomUUID()}${ext}`;
    const r2Url = await r2Upload(key, buffer, contentType);
    return r2Url;
  } catch {
    return imageUrl; // Keep original URL on failure
  }
}

/** Migrate all image URLs found in an HTML string to R2 and return updated HTML + migrated URLs map */
async function migrateHtmlImages(
  html: string,
  tenantSlug: string,
): Promise<{ html: string; migratedUrls: Map<string, string> }> {
  const imageUrls = extractImagesFromHtml(html);
  const migratedUrls = new Map<string, string>();
  let updatedHtml = html;

  for (const url of imageUrls) {
    const r2Url = await migrateImageToR2(url, tenantSlug);
    if (r2Url !== url) {
      migratedUrls.set(url, r2Url);
      // Replace all occurrences of this URL in the HTML
      updatedHtml = updatedHtml.split(url).join(r2Url);
    }
  }

  return { html: updatedHtml, migratedUrls };
}

// ─── Block Props Builders ──────────────────────────────────

interface ExtractedWPContent {
  title: string;
  htmlContent: string;      // content.rendered with images migrated to R2
  plainText: string;         // stripped version
  featuredImageUrl: string;  // R2 URL of featured image
  images: string[];          // all R2 image URLs from content
  youtubeUrls: string[];
  tables: { name: string; time: string; location: string }[];
  slug: string;
}

function buildStaticBlockProps(
  blockType: string,
  wp: ExtractedWPContent,
): Record<string, unknown> {
  switch (blockType) {
    case 'text_image':
      return {
        title: wp.title,
        content: wp.htmlContent.slice(0, 5000),
        imageUrl: wp.images[0] || wp.featuredImageUrl || '',
      };

    case 'text_only':
      return {
        title: wp.title,
        content: wp.plainText.slice(0, 5000),
      };

    case 'pastor_message': {
      // Assumption: pastor name may appear in first sentence or heading
      const firstLine = wp.plainText.split(/[.\n]/)[0] ?? '';
      return {
        title: wp.title,
        pastorName: firstLine.length < 50 ? firstLine : '',
        message: wp.plainText.slice(0, 5000),
        imageUrl: wp.images[0] || wp.featuredImageUrl || '',
      };
    }

    case 'church_intro':
      return {
        title: wp.title,
        description: wp.plainText.slice(0, 5000),
        imageUrl: wp.images[0] || wp.featuredImageUrl || '',
      };

    case 'mission_vision':
      return {
        title: wp.title,
        content: wp.plainText.slice(0, 5000),
      };

    case 'worship_times': {
      const services = wp.tables.length > 0
        ? wp.tables
        : [{ name: '', time: '', location: '' }];
      return {
        title: wp.title,
        services,
      };
    }

    case 'location_map': {
      const address = extractAddress(wp.plainText);
      return {
        title: wp.title,
        address,
      };
    }

    case 'contact_info':
      return {
        title: wp.title,
      };

    case 'newcomer_info':
      return {
        title: wp.title,
        content: wp.plainText.slice(0, 5000),
        imageUrl: wp.images[0] || wp.featuredImageUrl || '',
      };

    case 'image_gallery':
      return {
        title: wp.title,
        images: wp.images,
      };

    case 'video':
      return {
        title: wp.title,
        youtubeUrl: wp.youtubeUrls[0] || '',
      };

    case 'quote_block': {
      const quote = extractBlockquote(wp.htmlContent) || wp.plainText.slice(0, 300);
      return {
        quote,
        source: wp.title,
      };
    }

    default:
      return {
        title: wp.title,
        content: wp.plainText.slice(0, 5000),
      };
  }
}

function buildDynamicBlockProps(
  blockType: string,
  wp: ExtractedWPContent,
): Record<string, unknown> {
  switch (blockType) {
    case 'recent_sermons':
      return { title: wp.title, limit: 12, variant: 'grid-4' };
    case 'recent_bulletins':
      return { title: wp.title, limit: 12, variant: 'grid-4' };
    case 'recent_columns':
      return { title: wp.title, limit: 12, variant: 'grid-3' };
    case 'album_gallery':
      return { title: wp.title, limit: 12, variant: 'grid-4' };
    case 'event_grid':
      return { title: wp.title, limit: 12, variant: 'cards-4' };
    case 'staff_grid':
      return { title: wp.title, limit: 20, variant: 'grid-4' };
    case 'history_timeline':
      return { title: wp.title };
    case 'board':
      return { title: wp.title, boardSlug: wp.slug };
    default:
      return { title: wp.title };
  }
}

const DYNAMIC_BLOCK_TYPES = new Set([
  'recent_sermons', 'recent_bulletins', 'recent_columns',
  'album_gallery', 'event_grid', 'staff_grid',
  'history_timeline', 'board',
]);

// ─── Main Migration Function ────────────────────────────────

/**
 * Migrate a single WP page to a tenant: extract content, upload images to R2,
 * build page sections, and write to DB.
 */
export async function migrateWPPageToTenant(
  tenantSlug: string,
  targetPageId: string | null,
  wpPage: WPPage,
  selectedBlockType: string,
  allWPMedia: Map<number, string>,
): Promise<{ pageId: string; sectionsCreated: number }> {
  const schema = validateSchemaName(`tenant_${tenantSlug}`);

  // 1. Extract structured data from WP page
  const rawTitle = stripHtml(wpPage.title.rendered);
  const rawContent = wpPage.content.rendered || '';

  // 2. Download images and upload to R2
  const { html: migratedContent } = await migrateHtmlImages(rawContent, tenantSlug);

  // Featured image: lookup in media map then upload to R2
  let featuredImageUrl = '';
  if (wpPage.featured_media && allWPMedia.has(wpPage.featured_media)) {
    const originalUrl = allWPMedia.get(wpPage.featured_media)!;
    featuredImageUrl = await migrateImageToR2(originalUrl, tenantSlug);
  }

  // Collect all migrated image URLs
  const contentImages = extractImagesFromHtml(migratedContent);
  const allImages = [...new Set([
    ...(featuredImageUrl ? [featuredImageUrl] : []),
    ...contentImages,
  ])];

  const plainText = stripHtml(migratedContent);
  const youtubeUrls = extractYoutubeUrls(rawContent);
  const tables = extractTablesFromHtml(rawContent);

  const wp: ExtractedWPContent = {
    title: rawTitle,
    htmlContent: migratedContent,
    plainText,
    featuredImageUrl,
    images: allImages,
    youtubeUrls,
    tables,
    slug: wpPage.slug,
  };

  // 3. Build page sections
  const sections: { blockType: string; props: Record<string, unknown> }[] = [];

  // Section 0: hero_banner always first
  sections.push({
    blockType: 'hero_banner',
    props: {
      title: rawTitle,
      backgroundImageUrl: featuredImageUrl || allImages[0] || '',
      height: 'md',
      layout: 'full',
    },
  });

  // Section 1+: based on selectedBlockType
  if (DYNAMIC_BLOCK_TYPES.has(selectedBlockType)) {
    sections.push({
      blockType: selectedBlockType,
      props: buildDynamicBlockProps(selectedBlockType, wp),
    });
  } else {
    sections.push({
      blockType: selectedBlockType,
      props: buildStaticBlockProps(selectedBlockType, wp),
    });
  }

  // 4. Create/update page in tenant DB
  let finalPageId = targetPageId;

  if (!finalPageId) {
    // Create new page
    const maxOrder = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
      `SELECT MAX(sort_order) as max FROM "${schema}".pages`,
    );
    const nextOrder = ((maxOrder[0]?.max) ?? 0) + 1;

    const newPage = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schema}".pages (title, slug, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id`,
      rawTitle,
      wpPage.slug,
      nextOrder,
    );
    if (newPage.length === 0) {
      throw new Error(`Failed to create page: ${wpPage.slug}`);
    }
    finalPageId = newPage[0]!.id;
  }

  // Delete existing page_sections for this page
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid`,
    finalPageId,
  );

  // Insert new sections
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]!;
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
       VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
      finalPageId,
      sec.blockType,
      JSON.stringify(sec.props),
      i,
    );
  }

  return { pageId: finalPageId, sectionsCreated: sections.length };
}

// ─── Dynamic Content Migration ─────────────────────────────

/**
 * Migrate WP posts into tenant DB tables (sermons, bulletins, columns, events, staff, board_posts).
 * Returns count of successfully migrated items.
 */
export async function migrateWPPostsToTenant(
  tenantSlug: string,
  posts: WPPost[],
  postType: 'sermon' | 'bulletin' | 'column' | 'event' | 'staff' | 'general',
  mediaMap: Map<number, string>,
): Promise<number> {
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (const post of posts) {
    try {
      const title = stripHtml(post.title.rendered);
      const content = post.content.rendered || '';
      const plainContent = stripHtml(content);
      const postDate = post.date || null;

      // Migrate featured image to R2
      let thumbnailUrl = '';
      if (post.featured_media && mediaMap.has(post.featured_media)) {
        const originalUrl = mediaMap.get(post.featured_media)!;
        thumbnailUrl = await migrateImageToR2(originalUrl, tenantSlug);
      }

      // Extract content images for galleries
      const contentImages = extractImagesFromHtml(content);
      const youtubeUrls = extractYoutubeUrls(content);

      switch (postType) {
        case 'sermon': {
          // Extract scripture reference from content (first line often has it)
          const scriptureMatch = plainContent.match(/(?:본문|말씀|scripture)[:\s]*([^\n.]+)/i);
          const scripture = scriptureMatch?.[1]?.trim() || '';
          const youtubeUrl = youtubeUrls[0] || '';

          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, status)
             VALUES ($1, $2, $3, $4::date, $5, 'published')
             ON CONFLICT DO NOTHING`,
            title,
            scripture,
            youtubeUrl,
            postDate,
            thumbnailUrl,
          );
          count++;
          break;
        }

        case 'bulletin': {
          // Migrate content images for bulletin gallery
          const migratedImages: string[] = [];
          for (const img of contentImages.slice(0, 10)) {
            const r2Url = await migrateImageToR2(img, tenantSlug);
            migratedImages.push(r2Url);
          }

          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".bulletins (title, bulletin_date, pdf_url, images, thumbnail_url, status)
             VALUES ($1, $2::date, $3, $4::jsonb, $5, 'published')
             ON CONFLICT DO NOTHING`,
            title,
            postDate,
            '', // No PDF from WP posts
            JSON.stringify(migratedImages),
            thumbnailUrl,
          );
          count++;
          break;
        }

        case 'column': {
          const youtubeUrl = youtubeUrls[0] || '';
          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".columns_pastoral (title, content, top_image_url, youtube_url, thumbnail_url, status)
             VALUES ($1, $2, $3, $4, $5, 'published')
             ON CONFLICT DO NOTHING`,
            title,
            plainContent,
            thumbnailUrl,
            youtubeUrl,
            thumbnailUrl,
          );
          count++;
          break;
        }

        case 'event': {
          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".events (title, description, event_date, background_image_url, thumbnail_url, status)
             VALUES ($1, $2, $3, $4, $5, 'published')
             ON CONFLICT DO NOTHING`,
            title,
            plainContent.slice(0, 2000),
            postDate,
            thumbnailUrl,
            thumbnailUrl,
          );
          count++;
          break;
        }

        case 'staff': {
          // Assumption: staff posts have name as title, role/department in content
          const firstLine = plainContent.split(/[\n.]/)[0]?.trim() || '';
          const role = firstLine.length < 100 ? firstLine : '';
          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".staff (name, role, photo_url, bio, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT DO NOTHING`,
            title,
            role,
            thumbnailUrl,
            plainContent.slice(0, 2000),
          );
          count++;
          break;
        }

        case 'general': {
          // General posts go to board_posts — create or find a default board first
          const boardSlug = 'general';
          // Ensure a default board exists
          await prisma.$queryRawUnsafe(
            `INSERT INTO "${schema}".boards (title, slug, is_active)
             VALUES ($1, $2, true)
             ON CONFLICT DO NOTHING`,
            'General',
            boardSlug,
          );
          const boards = await prisma.$queryRawUnsafe<{ id: string }[]>(
            `SELECT id FROM "${schema}".boards WHERE slug = $1 LIMIT 1`,
            boardSlug,
          );
          if (boards.length > 0) {
            await prisma.$queryRawUnsafe(
              `INSERT INTO "${schema}".board_posts (board_id, title, content, author_name, status, created_at)
               VALUES ($1::uuid, $2, $3, $4, 'published', COALESCE($5::timestamptz, NOW()))
               ON CONFLICT DO NOTHING`,
              boards[0]!.id,
              title,
              plainContent,
              '', // No author from WP standard posts
              postDate,
            );
            count++;
          }
          break;
        }
      }
    } catch {
      // Skip individual post failures gracefully
      continue;
    }
  }

  return count;
}
