import Link from 'next/link';
import { getSermons, getCurrentVerse } from '@/lib/api';
import { DataSection } from './DataSection';

// 주일설교 묵상 (sermon_meditation) — 에디토리얼 홈 상단 데이터 블록.
// 왼쪽(3): 이번 주 대표 설교(설교 모듈 최신 게시분) — 제목·본문/설교자/날짜·썸네일·요약(2단)·전문 링크.
// 오른쪽(1): "이번 주 묵상" 사이드바 — 이번 주 말씀(말씀 모듈 현재 말씀 자동 or props)·함께 읽는 책·기도 제목·주보 링크.
// 데이터: 설교 = getSermons 최신 1편, 말씀 = getCurrentVerse. 책/기도제목은 운영자 props(주간 갱신).
// 색/서체는 테넌트 테마 토큰(--dw-*)으로 구동 — 하드코딩 hex 없음.
interface Props { props: Record<string, unknown>; slug: string }

interface SermonLike {
  id: string; title?: string; scripture?: string; preacher?: string; date?: string;
  thumbnailUrl?: string; oneLineSummary?: string | null; summary?: string | null;
}

const INK = 'var(--dw-text, #3a3129)';
const OLIVE = 'var(--dw-primary, #7b7d5c)';
const OLIVE_DARK = 'var(--dw-secondary, #5e6044)';
const MUTED = 'var(--brand-muted, #6f6255)';
const FAINT = 'var(--border, #ece2d6)';
const SURFACE = 'var(--dw-surface, #f7f2ea)';
const SERIF = { fontFamily: 'var(--dw-font-heading)' } as const;

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

const label = (color = OLIVE_DARK) =>
  ({ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color } as const);

export async function SermonMeditationBlock({ props, slug }: Props) {
  const eyebrow = (props.eyebrow as string) || '주일설교';
  const moreLabel = (props.moreLabel as string) || '설교 전문 읽기';
  const showAside = props.showAside !== false;

  // ── data ── 홈 대표글(home_featured) 우선, 없으면 최신 게시 설교.
  let sermon: SermonLike | null = null;
  try {
    const feat = await getSermons(slug, { perPage: 1, featured: true });
    let list = (Array.isArray(feat) ? feat : (feat?.data ?? [])) as SermonLike[];
    if (list.length === 0) {
      const res = await getSermons(slug, { perPage: 1 });
      list = (Array.isArray(res) ? res : (res?.data ?? [])) as SermonLike[];
    }
    sermon = list[0] ?? null;
  } catch { sermon = null; }

  // 이번 주 말씀 — 말씀 모듈 현재 말씀 자동, 없으면 props 폴백.
  let verseText = (props.verseText as string) || '';
  let verseRef = (props.verseRef as string) || '';
  if (showAside && !verseText) {
    try {
      const v = await getCurrentVerse(slug);
      if (v?.text) { verseText = v.text; verseRef = v.reference || verseRef; }
    } catch { /* 없으면 props 폴백 */ }
  }

  const sermonTitle = sermon?.title || '이번 주 말씀';
  const sermonHref = sermon?.id ? `/sermons/${sermon.id}` : '/sermons';
  const meta = [sermon?.scripture, sermon?.preacher, fmtDate(sermon?.date)].filter(Boolean).join(' · ');
  const summary = (sermon?.summary || sermon?.oneLineSummary || '').trim();

  const verseLabel = (props.verseLabel as string) || '이번 주 말씀';
  const bookLabel = (props.bookLabel as string) || '함께 읽는 책';
  const bookTitle = (props.bookTitle as string) || '';
  const bookMeta = (props.bookMeta as string) || '';
  const prayerLabel = (props.prayerLabel as string) || '기도 제목';
  const prayerItems = asList(props.prayerItems ?? props.prayerText);
  const asideTitle = (props.asideTitle as string) || '이번 주 묵상';
  const bulletinLabel = (props.bulletinLabel as string) || '이번 주 주보';
  const bulletinUrl = (props.bulletinUrl as string) || '/onlinejubo';

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #fff)">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-11">
          {/* ── 대표 설교 ── */}
          <article className="min-w-0 lg:flex-[3_1_420px]">
            <p style={label()}>{eyebrow}</p>
            <h2 style={{ ...SERIF, margin: '14px 0 0', fontSize: 'clamp(28px,4vw,46px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.25, color: INK }}>{sermonTitle}</h2>
            {meta && <p style={{ margin: '14px 0 0', fontSize: 14, color: MUTED }}>{meta}</p>}

            {sermon?.thumbnailUrl ? (
              <Link href={sermonHref} className="relative mt-7 block w-full overflow-hidden" style={{ aspectRatio: '16 / 9', background: SURFACE }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sermon.thumbnailUrl} alt={sermonTitle} className="absolute inset-0 h-full w-full object-cover" />
              </Link>
            ) : (
              <div className="mt-7 w-full" style={{ aspectRatio: '16 / 9', background: SURFACE }} aria-hidden />
            )}

            {summary && (
              <p className="mt-6 md:columns-2 md:gap-8" style={{ fontSize: 17, lineHeight: 1.95, color: INK, columnRuleWidth: 1, columnRuleStyle: 'solid', columnRuleColor: FAINT, whiteSpace: 'pre-line' }}>{summary}</p>
            )}

            <p style={{ margin: '20px 0 0', fontSize: 15, fontWeight: 600 }}>
              <Link href={sermonHref} style={{ color: OLIVE }}>{moreLabel} ›</Link>
            </p>
          </article>

          {/* ── 이번 주 묵상 ── */}
          {showAside && (
            <aside className="min-w-0 lg:flex-[1_1_240px]" style={{ borderTop: `1px solid ${INK}`, paddingTop: 20 }}>
              <p style={{ ...label(), margin: '0 0 18px', paddingBottom: 10, borderBottom: `1px solid ${INK}` }}>{asideTitle}</p>
              <div style={{ display: 'grid', gap: 20 }}>
                {verseText && (
                  <div style={{ paddingBottom: 18, borderBottom: `1px solid ${FAINT}` }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '.08em', color: MUTED }}>{verseLabel}</p>
                    <p style={{ ...SERIF, margin: '8px 0 0', fontSize: 17, fontWeight: 500, lineHeight: 1.75, color: INK }}>{verseText}</p>
                    {verseRef && <p style={{ margin: '8px 0 0', fontSize: 13, color: MUTED }}>{verseRef}</p>}
                  </div>
                )}
                {bookTitle && (
                  <div style={{ paddingBottom: 18, borderBottom: `1px solid ${FAINT}` }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '.08em', color: MUTED }}>{bookLabel}</p>
                    <p style={{ ...SERIF, margin: '8px 0 0', fontSize: 18, fontWeight: 600, color: INK }}>{bookTitle}</p>
                    {bookMeta && <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.7, color: MUTED }}>{bookMeta}</p>}
                  </div>
                )}
                {prayerItems.length > 0 && (
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '.08em', color: MUTED }}>{prayerLabel}</p>
                    <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 15, lineHeight: 1.7, color: INK }}>
                      {prayerItems.map((t, i) => <p key={i} style={{ margin: 0 }}>{t}</p>)}
                    </div>
                  </div>
                )}
              </div>
              <p style={{ margin: '24px 0 0', fontSize: 15, fontWeight: 600 }}>
                <Link href={bulletinUrl} style={{ color: OLIVE }}>{bulletinLabel} ›</Link>
              </p>
            </aside>
          )}
        </div>
      </div>
    </DataSection>
  );
}
