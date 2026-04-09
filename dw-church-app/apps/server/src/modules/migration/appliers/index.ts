/**
 * Apply Orchestrator — runs all appliers in the correct order.
 * Order per MIGRATION.md §13:
 *   1. Images → R2 (first, because other appliers need R2 URLs)
 *   2. Settings
 *   3. Staff
 *   4. Sermons
 *   5. Bulletins
 *   6. Columns
 *   7. Events
 *   8. Albums
 *   9. History
 *  10. Boards
 *  11. Page contents (static block props)
 *  12. Worship times
 *  13. Menus
 */

import type { ClassifiedData, ApplyResult } from '../types.js';
import { emptyApplyResult } from '../types.js';
import { migrateImages } from './images.js';
import { applySettings } from './settings.js';
import { applySermons, applyBulletins, applyColumns, applyEvents, applyAlbums, applyBoards } from './posts.js';
import { applyStaff, applyHistory, applyWorshipTimes, applyMenus } from './config.js';
import { applyPageContents } from './pages.js';

export async function applyAll(
  tenantSlug: string,
  data: ClassifiedData,
  onProgress?: (step: string, done: boolean) => void,
): Promise<ApplyResult> {
  const result = emptyApplyResult();

  // 1. Images → R2
  onProgress?.('이미지 R2 업로드', false);
  const allImages = collectAllImages(data);
  const urlMap = await migrateImages(allImages, tenantSlug);
  result.images = urlMap.size;
  onProgress?.('이미지 R2 업로드', true);

  // 2. Settings
  onProgress?.('교회 기본정보', false);
  result.settings = await applySettings(tenantSlug, data.churchInfo);
  onProgress?.('교회 기본정보', true);

  // 3. Staff
  onProgress?.('교역자', false);
  result.staff = await applyStaff(tenantSlug, data.staff, urlMap);
  onProgress?.('교역자', true);

  // 4. Sermons
  onProgress?.('설교', false);
  result.sermons = await applySermons(tenantSlug, data.sermons, urlMap);
  onProgress?.('설교', true);

  // 5. Bulletins
  onProgress?.('주보', false);
  result.bulletins = await applyBulletins(tenantSlug, data.bulletins, urlMap);
  onProgress?.('주보', true);

  // 6. Columns
  onProgress?.('칼럼', false);
  result.columns = await applyColumns(tenantSlug, data.columns, urlMap);
  onProgress?.('칼럼', true);

  // 7. Events
  onProgress?.('행사', false);
  result.events = await applyEvents(tenantSlug, data.events, urlMap);
  onProgress?.('행사', true);

  // 8. Albums
  onProgress?.('앨범', false);
  result.albums = await applyAlbums(tenantSlug, data.albums, urlMap);
  onProgress?.('앨범', true);

  // 9. History
  onProgress?.('연혁', false);
  result.history = await applyHistory(tenantSlug, data.history);
  onProgress?.('연혁', true);

  // 10. Boards
  onProgress?.('게시판', false);
  result.boards = await applyBoards(tenantSlug, data.boards);
  onProgress?.('게시판', true);

  // 11. Page contents
  onProgress?.('페이지 콘텐츠', false);
  result.pages = await applyPageContents(tenantSlug, data.pageContents, urlMap);
  onProgress?.('페이지 콘텐츠', true);

  // 12. Worship times
  onProgress?.('예배시간', false);
  result.worshipTimes = await applyWorshipTimes(tenantSlug, data.worshipTimes);
  onProgress?.('예배시간', true);

  // 13. Menus
  onProgress?.('메뉴', false);
  result.menus = await applyMenus(tenantSlug, data.menus);
  onProgress?.('메뉴', true);

  return result;
}

/**
 * Collect all image URLs from classified data for batch R2 upload.
 */
function collectAllImages(data: ClassifiedData): string[] {
  const urls: string[] = [...data.images];

  // Staff photos
  for (const s of data.staff) {
    if (s.photoUrl) urls.push(s.photoUrl);
  }

  // Sermon thumbnails
  for (const s of data.sermons) {
    if (s.thumbnailUrl) urls.push(s.thumbnailUrl);
  }

  // Bulletin images
  for (const b of data.bulletins) {
    urls.push(...b.images);
  }

  // Album images
  for (const a of data.albums) {
    urls.push(...a.images);
  }

  // Column images
  for (const c of data.columns) {
    if (c.topImageUrl) urls.push(c.topImageUrl);
  }

  // Event images
  for (const e of data.events) {
    if (e.imageUrl) urls.push(e.imageUrl);
  }

  // Page content images
  for (const p of data.pageContents) {
    for (const b of p.blocks) {
      if (typeof b.props.imageUrl === 'string') urls.push(b.props.imageUrl);
      if (typeof b.props.photoUrl === 'string') urls.push(b.props.photoUrl);
      if (Array.isArray(b.props.images)) urls.push(...(b.props.images as string[]));
    }
  }

  return urls;
}
