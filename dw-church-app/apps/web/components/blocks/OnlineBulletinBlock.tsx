import Link from 'next/link';
import { getLatestOnlineBulletin, getOnlineBulletin, getOnlineBulletins } from '@/lib/api';
import { DataSection } from './DataSection';
import { OnlineBulletinView } from './OnlineBulletinView';

interface OnlineBulletinBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * online_bulletin — 온라인 주보 data block.
 *   - props.bulletinId 지정 → 그 주보 1개(스크롤 뷰)
 *   - props.mode==='list' → 발행된 주보 목록(날짜·제목) → 클릭 시 상세(/online-bulletins/{id})
 *   - 그 외(기본) → 최신 발행분(스크롤 뷰)
 * 발행분이 없으면 null(빈 섹션 미출력).
 */
export async function OnlineBulletinBlock({ props, slug }: OnlineBulletinBlockProps) {
  const bulletinId = (props.bulletinId as string) || '';
  const mode = (props.mode as string) || (props.variant as string) || 'latest';

  // ── 목록 모드 ──
  if (!bulletinId && mode === 'list') {
    let list: Record<string, unknown>[] = [];
    try {
      const res = await getOnlineBulletins(slug, { perPage: 60 });
      list = Array.isArray(res) ? res : ((res?.data as Record<string, unknown>[]) ?? []);
    } catch { list = []; }
    return (
      <DataSection props={props} defaultBg="var(--dw-background, #ffffff)">
        <OnlineBulletinListView items={list} title={(props.title as string) || '온라인 주보'} />
      </DataSection>
    );
  }

  // ── 단일(최신 또는 지정) 스크롤 뷰 ──
  let bulletin: Record<string, unknown> | null = null;
  try {
    bulletin = bulletinId ? await getOnlineBulletin(slug, bulletinId) : await getLatestOnlineBulletin(slug);
  } catch {
    bulletin = null;
  }
  if (!bulletin) return null;

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #ffffff)">
      <OnlineBulletinView bulletin={bulletin} />
    </DataSection>
  );
}

const INK = 'var(--dw-text, #16181d)';
const OLIVE = 'var(--dw-primary, #1466d6)';
const MUTED = 'var(--brand-muted, #61697a)';
const FAINT = 'var(--border, #e5e7eb)';

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. (${w})`;
}

// 온라인 주보 목록 — 발행분을 날짜·제목 행으로. 클릭 시 상세 스크롤 뷰로 이동.
function OnlineBulletinListView({ items, title }: { items: Record<string, unknown>[]; title: string }) {
  const list = (items ?? []).filter((b) => b && b.id);
  return (
    <div className="mx-auto max-w-3xl">
      <h2 style={{ margin: 0, fontSize: 'var(--brand-h2, 26px)', fontWeight: 700, letterSpacing: '-0.02em', color: INK, fontFamily: 'var(--dw-font-heading)' }}>{title}</h2>
      <div style={{ height: 3, width: 44, background: OLIVE, borderRadius: 2, margin: '14px 0 4px' }} />
      {list.length === 0 ? (
        <p style={{ marginTop: 24, fontSize: 15, color: MUTED }}>아직 발행된 온라인 주보가 없습니다.</p>
      ) : (
        <ul className="list-none p-0" style={{ margin: '18px 0 0' }}>
          {list.map((b) => {
            const id = String(b.id);
            const date = fmtDate((b.serviceDate as string) || (b.service_date as string));
            const t = (b.title as string) || (b.serviceTitle as string) || '주일예배';
            return (
              <li key={id} style={{ borderTop: `1px solid ${FAINT}` }}>
                <Link href={`/online-bulletins/${id}`} className="flex items-baseline gap-4" style={{ padding: '18px 4px', textDecoration: 'none' }}>
                  {date && <span style={{ flex: 'none', width: 130, fontSize: 13, fontWeight: 700, color: OLIVE }}>{date}</span>}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: INK, fontFamily: 'var(--dw-font-heading)' }}>{t}</span>
                  <span aria-hidden style={{ flex: 'none', color: OLIVE, fontSize: 14 }}>›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
