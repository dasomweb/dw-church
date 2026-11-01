import Link from 'next/link';
import { getLatestSermonNote, getColumns, getLatestOnlineBulletin } from '@/lib/api';
import { DataSection } from './DataSection';

// 최근 설교노트 (recent_sermon_note) — 설교노트 모듈 최신 1건을 홈에 표시.
// 대표 이미지(content.thumbnailUrl) + 제목 + 성경본문 + 본문 발췌 + 설교노트 보기 링크.
//
// variant:
//   'default' — 좌 본문 + 우 3:2 썸네일 (기존)
//   'hero-split' — 홈 상단 마스트헤드형. 좌: 16:9 대표사진 + 카테고리 태그 + 큰 제목 +
//     리드 + 작성자/읽기시간, 우: 괘선으로 구분된 링크 레일(최신 칼럼 · 온라인 주보 ·
//     운영자 추가 항목) + 예배시간. 레일 데이터는 모듈에서 가져오므로 교회가 글만
//     올리면 저절로 채워진다.
interface Props { props: Record<string, unknown>; slug: string }

/** 레일 한 줄 — 운영자가 props.extraItems 로 더 넣을 수 있다. */
interface RailItem { eyebrow?: string; title?: string; summary?: string; href?: string }

/** 한글 기준 분당 읽기 속도(공백 포함). 과학은 아니고 관용값 — 1분 미만은 1분으로. */
function readMinutes(text: string): number {
  return Math.max(1, Math.round((text || '').replace(/\s+/g, '').length / 500));
}
const shortDate = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};
const rows = (res: unknown): any[] => {
  if (Array.isArray(res)) return res;
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? d : [];
};

const INK = 'var(--dw-text, #16181d)';
const OLIVE = 'var(--dw-primary, #1466d6)';
const MUTED = 'var(--brand-muted, #61697a)';
const SURFACE = 'var(--dw-surface, #f7f8fa)';
const SERIF = { fontFamily: 'var(--dw-font-heading)' } as const;

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. 주일`;
}
// 마크다운 서식 제거 → 평문 발췌.
function excerpt(md: string, max = 160): string {
  const plain = (md || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '').replace(/^>\s?/gm, '').replace(/^[-*]\s+/gm, '').replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^---+$/gm, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + '…' : plain;
}

export async function RecentSermonNoteBlock({ props, slug }: Props) {
  let note: Record<string, any> | null = null;
  try { note = await getLatestSermonNote(slug); } catch { note = null; }
  if (!note) return null;

  const c = (note.content ?? {}) as Record<string, any>;
  const adult = (c.congregations?.adult ?? {}) as Record<string, any>;
  const eyebrow = (props.eyebrow as string) || '이번 주 설교노트';
  const title = adult.title || note.title || '설교노트';
  const scripture = c.scripture || '';
  const img = c.thumbnailUrl || '';
  const date = fmtDate(note.noteDate || note.note_date);
  const body = excerpt(adult.text || '', 300);
  const moreLabel = (props.moreLabel as string) || '설교노트 보기';
  const moreUrl = (props.moreUrl as string) || '/sermon-note';

  // ── hero-split: 홈 상단 마스트헤드 ──────────────────────────
  if (String(props.variant ?? '') === 'hero-split') {
    // 레일은 모듈에서 자동으로 채운다 — 교회가 칼럼/주보를 올리면 홈이 따라 바뀐다.
    const [colRes, bulletin] = await Promise.all([
      getColumns(slug, { perPage: 1 }).catch(() => null),
      getLatestOnlineBulletin(slug).catch(() => null),
    ]);
    const col = rows(colRes)[0];
    const extra = Array.isArray(props.extraItems) ? (props.extraItems as RailItem[]) : [];
    const rail: RailItem[] = [
      col && {
        eyebrow: [(props.columnLabel as string) || '저널', shortDate(col.publishAt || col.createdAt)].filter(Boolean).join(' · '),
        title: col.title,
        summary: excerpt(String(col.content ?? '').replace(/<[^>]*>/g, ' '), 70),
        href: `/columns/${col.id}`,
      },
      ...extra,
      bulletin && {
        eyebrow: [(props.bulletinLabel as string) || '온라인 주보', shortDate(bulletin.serviceDate || bulletin.service_date)].filter(Boolean).join(' · '),
        title: bulletin.title,
        href: '/online-bulletin',
      },
    ].filter(Boolean) as RailItem[];

    const tag = (props.tagLabel as string) || '설교노트';
    const author = (props.author as string) || '';
    const worshipTime = (props.worshipTime as string) || '';
    const worshipLabel = (props.worshipLinkLabel as string) || '예배 안내';
    const worshipHref = (props.worshipHref as string) || '/about-worship-info';
    const lede = excerpt(adult.text || '', 170);

    return (
      <DataSection props={props} defaultBg="var(--dw-background, #fff)">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* 좌 — 이번 주 설교노트 */}
          <div className="min-w-0 lg:flex-1">
            <Link href={moreUrl} className="block">
              <div style={{ position: 'relative', aspectRatio: '16 / 9', background: SURFACE, overflow: 'hidden' }}>
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px', margin: '14px 0 0', fontSize: 12, fontWeight: 600 }}>
                <span style={{ background: INK, color: '#fff', padding: '4px 8px', letterSpacing: '.04em' }}>{tag}</span>
                <span style={{ color: MUTED }}>{[date, scripture].filter(Boolean).join(' · ')}</span>
              </div>
              <h1 style={{ ...SERIF, margin: '14px 0 0', fontSize: 'clamp(30px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.15, color: INK, textWrap: 'pretty' as const }}>
                {title}
              </h1>
              {lede && <p style={{ margin: '14px 0 0', maxWidth: '40em', fontSize: 17, lineHeight: 1.7, color: 'var(--dw-text, #55514a)' }}>{lede}</p>}
              {(author || body) && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED }}>
                  {[author, `읽기 ${readMinutes(adult.text || '')}분`].filter(Boolean).join(' · ')}
                </p>
              )}
            </Link>
          </div>

          {/* 우 — 링크 레일 + 예배시간 */}
          <aside className="lg:w-[340px] lg:shrink-0">
            {rail.map((it, i) => (
              <Link key={i} href={it.href || '#'} className="block" style={{ borderTop: `1px solid ${i === 0 ? INK : 'var(--border, #e8e4dc)'}`, padding: '16px 0 20px' }}>
                {it.eyebrow && <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dw-secondary, #5e6044)' }}>{it.eyebrow}</span>}
                <span style={{ ...SERIF, display: 'block', margin: '6px 0 0', fontSize: 21, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.35, color: INK }}>{it.title}</span>
                {it.summary && <span style={{ display: 'block', margin: '6px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--dw-text, #55514a)' }}>{it.summary}</span>}
              </Link>
            ))}
            {worshipTime && (
              <div style={{ borderTop: '1px solid var(--border, #e8e4dc)', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '10px 20px', padding: '16px 0 0' }}>
                <span style={{ ...SERIF, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>{worshipTime}</span>
                <Link href={worshipHref} style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-secondary, #5e6044)' }}>{worshipLabel} ›</Link>
              </div>
            )}
          </aside>
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #fff)">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 lg:flex-1">
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: 'var(--dw-secondary, #5e6044)' }}>{eyebrow}</p>
            <h2 style={{ ...SERIF, margin: '12px 0 0', fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.25, color: INK }}>{title}</h2>
            <p style={{ margin: '12px 0 0', fontSize: 14, color: MUTED }}>{[date, scripture].filter(Boolean).join(' · ')}</p>
            {body && <p style={{ margin: '18px 0 0', fontSize: 16, lineHeight: 1.95, color: 'var(--dw-text, #3a3129)' }}>{body}</p>}
            <p style={{ margin: '22px 0 0', fontSize: 15, fontWeight: 600 }}>
              <Link href={moreUrl} style={{ color: OLIVE }}>{moreLabel} ›</Link>
            </p>
          </div>
          {img && (
            <Link href={moreUrl} className="relative block w-full overflow-hidden lg:flex-[0_0_34%] lg:max-w-[340px]" style={{ aspectRatio: '3 / 2', background: SURFACE, borderRadius: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            </Link>
          )}
        </div>
      </div>
    </DataSection>
  );
}
