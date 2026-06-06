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

/**
 * Phase 12-γ.5 (2026-06-03) — selective migration.
 *
 * User directive: dynamic content (sermons, albums, etc.) takes much
 * longer to migrate than static (vision, about, worship times) AND
 * not every church wants every type. So /migrate-url accepts an
 * `include` array — only the listed content types get applied; the
 * rest are skipped even if the classifier extracted them.
 *
 * Two presets exposed in the dialog:
 *   - STATIC_INCLUDE = 정적 콘텐츠 (페이지·예배·연혁·메뉴·교회정보)
 *   - DYNAMIC_INCLUDE = 동적 콘텐츠 (설교·주보·칼럼·행사·앨범·교역자·게시판)
 */
export type IncludeKey =
  | 'settings' | 'pages' | 'worshipTimes' | 'history' | 'menus'
  | 'sermons' | 'bulletins' | 'columns' | 'events' | 'albums'
  | 'staff' | 'boards';

export const STATIC_INCLUDE: IncludeKey[] = ['settings', 'pages', 'worshipTimes', 'history', 'menus'];
export const DYNAMIC_INCLUDE: IncludeKey[] = ['sermons', 'bulletins', 'columns', 'events', 'albums', 'staff', 'boards'];
export const ALL_INCLUDE: IncludeKey[] = [...STATIC_INCLUDE, ...DYNAMIC_INCLUDE];

export async function applyAll(
  tenantSlug: string,
  data: ClassifiedData,
  options: { include?: IncludeKey[] } = {},
  onProgress?: (step: string, done: boolean) => void,
): Promise<ApplyResult> {
  const result = emptyApplyResult();
  // Default: static-only. Cheapest + safest first-run.
  const include = new Set<IncludeKey>(options.include ?? STATIC_INCLUDE);
  const want = (k: IncludeKey) => include.has(k);

  // 1. Images → R2 — always run if anything we're applying needs them.
  // Static blocks reference imageUrl; dynamic appliers also need urlMap.
  onProgress?.('이미지 R2 업로드', false);
  const allImages = collectImagesForInclude(data, include);
  const urlMap = await migrateImages(allImages, tenantSlug);
  result.images = urlMap.size;
  onProgress?.('이미지 R2 업로드', true);

  // ── Static appliers ─────────────────────────────────────
  if (want('settings')) {
    onProgress?.('교회 기본정보', false);
    result.settings = await applySettings(tenantSlug, data.churchInfo);
    onProgress?.('교회 기본정보', true);
  }
  if (want('pages')) {
    onProgress?.('페이지 콘텐츠', false);
    result.pages = await applyPageContents(tenantSlug, data.pageContents, urlMap);
    onProgress?.('페이지 콘텐츠', true);
  }
  if (want('worshipTimes')) {
    onProgress?.('예배시간', false);
    result.worshipTimes = await applyWorshipTimes(tenantSlug, data.worshipTimes);
    onProgress?.('예배시간', true);
  }
  if (want('history')) {
    onProgress?.('연혁', false);
    result.history = await applyHistory(tenantSlug, data.history);
    onProgress?.('연혁', true);
  }
  if (want('menus')) {
    onProgress?.('메뉴', false);
    result.menus = await applyMenus(tenantSlug, data.menus);
    onProgress?.('메뉴', true);
  }

  // ── Dynamic appliers ────────────────────────────────────
  if (want('staff')) {
    onProgress?.('교역자', false);
    result.staff = await applyStaff(tenantSlug, data.staff, urlMap);
    onProgress?.('교역자', true);
  }
  if (want('sermons')) {
    onProgress?.('설교', false);
    result.sermons = await applySermons(tenantSlug, data.sermons, urlMap);
    onProgress?.('설교', true);
  }
  if (want('bulletins')) {
    onProgress?.('주보', false);
    result.bulletins = await applyBulletins(tenantSlug, data.bulletins, urlMap);
    onProgress?.('주보', true);
  }
  if (want('columns')) {
    onProgress?.('칼럼', false);
    result.columns = await applyColumns(tenantSlug, data.columns, urlMap);
    onProgress?.('칼럼', true);
  }
  if (want('events')) {
    onProgress?.('행사', false);
    result.events = await applyEvents(tenantSlug, data.events, urlMap);
    onProgress?.('행사', true);
  }
  if (want('albums')) {
    onProgress?.('앨범', false);
    result.albums = await applyAlbums(tenantSlug, data.albums, urlMap);
    onProgress?.('앨범', true);
  }
  if (want('boards')) {
    onProgress?.('게시판', false);
    result.boards = await applyBoards(tenantSlug, data.boards);
    onProgress?.('게시판', true);
  }

  return result;
}

/**
 * Only upload images that the included content types actually reference.
 * Skipping unused images saves R2 bandwidth + tenant storage quota.
 */
function collectImagesForInclude(data: ClassifiedData, include: Set<IncludeKey>): string[] {
  const urls: string[] = [];

  // Page-level images always come along when pages are applied.
  if (include.has('pages')) {
    for (const p of data.pageContents) {
      for (const b of p.blocks) {
        if (typeof b.props.imageUrl === 'string') urls.push(b.props.imageUrl);
        if (typeof b.props.photoUrl === 'string') urls.push(b.props.photoUrl);
        // hero_banner background must self-host too (was being skipped → hero
        // hotlinked the source image, which broke once the source died).
        if (typeof b.props.backgroundImageUrl === 'string') urls.push(b.props.backgroundImageUrl);
        if (Array.isArray(b.props.images)) urls.push(...(b.props.images as string[]));
      }
    }
  }

  // og:image / logoUrl land in settings → ship them with settings.
  if (include.has('settings')) {
    if (data.churchInfo.ogImageUrl) urls.push(data.churchInfo.ogImageUrl);
    if (data.churchInfo.logoUrl) urls.push(data.churchInfo.logoUrl);
  }

  // Dynamic content images — only if that content is included.
  if (include.has('staff'))   { for (const s of data.staff)   if (s.photoUrl) urls.push(s.photoUrl); }
  if (include.has('sermons')) { for (const s of data.sermons) if (s.thumbnailUrl) urls.push(s.thumbnailUrl); }
  if (include.has('bulletins')) { for (const b of data.bulletins) urls.push(...b.images); }
  if (include.has('albums'))   { for (const a of data.albums)  urls.push(...a.images); }
  if (include.has('columns'))  { for (const c of data.columns) if (c.topImageUrl) urls.push(c.topImageUrl); }
  if (include.has('events'))   { for (const e of data.events)  if (e.imageUrl) urls.push(e.imageUrl); }

  return [...new Set(urls)];
}

// (Phase 12-γ.5 — collectAllImages removed. Replaced by
// collectImagesForInclude which only ships images referenced by the
// content types the operator actually selected.)
