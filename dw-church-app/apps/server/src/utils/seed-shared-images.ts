import { prisma } from '../config/database.js';
import { uploadFile } from '../config/r2.js';

/**
 * One-time seed of the curated Unsplash image set into the shared_images
 * table. Runs only when the table is empty so re-deploys are no-ops.
 *
 * Each image is fetched once, persisted to R2 under shared/gallery/seed-...,
 * and a DB row is inserted with the new self-hosted URL — honoring the
 * project rule against hotlinking external CDNs.
 */

interface SeedItem {
  src: string;        // source URL (Unsplash)
  title: string;
  category: string;   // matches GALLERY_CATEGORIES ids
}

const SEED: SeedItem[] = [
  // 자연
  { category: 'nature', title: '산과 호수',     src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=85&fm=jpg' },
  { category: 'nature', title: '숲속 안개',     src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=85&fm=jpg' },
  { category: 'nature', title: '푸른 숲',       src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85&fm=jpg' },
  { category: 'nature', title: '초원과 하늘',   src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85&fm=jpg' },

  // 꽃
  { category: 'flower', title: '핑크 꽃',       src: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=1920&q=85&fm=jpg' },
  { category: 'flower', title: '라벤더',        src: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=1920&q=85&fm=jpg' },
  { category: 'flower', title: '들꽃',          src: 'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1920&q=85&fm=jpg' },

  // 하늘
  { category: 'sky', title: '일출',             src: 'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=1920&q=85&fm=jpg' },
  { category: 'sky', title: '구름',             src: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=85&fm=jpg' },
  { category: 'sky', title: '황금빛 하늘',      src: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=85&fm=jpg' },
  { category: 'sky', title: '노을',             src: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1920&q=85&fm=jpg' },

  // 십자가
  { category: 'cross', title: '십자가 실루엣',  src: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&q=85&fm=jpg' },
  { category: 'cross', title: '언덕 위 십자가', src: 'https://images.unsplash.com/photo-1445855743215-296f0ec091ef?w=1920&q=85&fm=jpg' },
  { category: 'cross', title: '빛과 십자가',    src: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1920&q=85&fm=jpg' },
  { category: 'cross', title: '나무 십자가',    src: 'https://images.unsplash.com/photo-1474314170901-f351b68f544f?w=1920&q=85&fm=jpg' },

  // 교회
  { category: 'church', title: '교회 건물',     src: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&q=85&fm=jpg' },
  { category: 'church', title: '예배당 내부',   src: 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=1920&q=85&fm=jpg' },
  { category: 'church', title: '교회 첨탑',     src: 'https://images.unsplash.com/photo-1519491050282-cf00c82424cb?w=1920&q=85&fm=jpg' },
];

export interface SeedResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

export async function seedSharedImages(): Promise<SeedResult | null> {
  const existing = await prisma.sharedImage.count();
  if (existing > 0) return null; // already seeded

  const result: SeedResult = { attempted: SEED.length, succeeded: 0, failed: 0 };

  for (let i = 0; i < SEED.length; i++) {
    const item = SEED[i]!;
    try {
      const res = await fetch(item.src);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const key = `shared/gallery/seed-${item.category}-${String(i).padStart(2, '0')}.${ext}`;
      const url = await uploadFile(key, buf, contentType);
      await prisma.sharedImage.create({
        data: {
          url,
          r2Key: key,
          title: item.title,
          category: item.category,
          tags: [],
        },
      });
      result.succeeded++;
    } catch {
      result.failed++;
    }
  }
  return result;
}
