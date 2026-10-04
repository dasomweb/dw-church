'use client';

// 설교노트 목록 페이지 — 은혜침례교회 '설교노트 목록' 시안.
//   제목부 + 대상 탭(전체/장년/EM/Youth/Children/Kids)
//   → 최신 노트 피처(대표 이미지 3:2 + 제목·부제·본문·태그·CTA)
//   → 지난 설교노트 그리드(+ 더 보기) → 시리즈/읽는 법
// 시리즈·설교자는 설교노트 모듈에 없는 값이므로 **있을 때만** 표시한다(없는 값 지어내지 않음).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SermonNote, SermonNoteContent, SermonNoteCongregation, SermonNoteCongregationKey } from '@dw-church/api-client';

const TEXT = 'var(--dw-text, #3a3129)';
const PRIMARY = 'var(--dw-primary, #7b7d5c)';
const SECONDARY = 'var(--dw-secondary, #5e6044)';
const MUTED = 'var(--brand-muted, #6f6255)';
const META = 'var(--brand-muted, #8a7c6d)';
const FAINT_TEXT = '#a89684';
const BORDER = 'var(--border, #e2d8cb)';
const FAINT = 'var(--border, #ece2d6)';
const IMG_BG = 'var(--dw-surface, #f2ece3)';
const RULE = 'var(--dw-text, #3a3129)';
const SERIF = { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" } as const;

const TRACKS: [SermonNoteCongregationKey, string][] = [
  ['adult', '장년'], ['em', 'EM'], ['youth', 'Youth'], ['children', 'Children'], ['kids', 'Kids'],
];
const PAGE = 9; // '더 보기' 한 번에 추가로 보여줄 개수

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
function studyHasItems(s?: SermonNoteCongregation['study']): boolean {
  if (!s) return false;
  return (['observation', 'correlation', 'application'] as const).some((k) => (s[k]?.length ?? 0) > 0);
}
function congHasContent(c?: SermonNoteCongregation): boolean {
  if (!c) return false;
  return !!(c.title?.trim() || c.titleEn?.trim() || c.text?.trim() || (c.cartoonImageUrls?.length ?? 0) > 0 || studyHasItems(c.study));
}

interface Row {
  id: string;
  date: string;
  title: string;
  sub: string;
  ref: string;
  preacher: string;
  series: string;
  img: string;
  trackKeys: SermonNoteCongregationKey[];
  trackLabels: string[];
}

function toRow(n: SermonNote): Row {
  const c = (n.content ?? {}) as SermonNoteContent;
  const extra = c as Record<string, unknown>;
  const congs = c.congregations ?? {};
  const present = TRACKS.filter(([k]) => congHasContent(congs[k]));
  return {
    id: n.id,
    date: fmtDate(n.noteDate),
    title: n.title?.trim() || congs.adult?.title?.trim() || '설교노트',
    sub: String(extra.subtitle ?? ''),
    ref: c.scripture ?? '',
    preacher: String(extra.preacher ?? ''),
    series: String(extra.series ?? ''),
    img: c.thumbnailUrl ?? '',
    trackKeys: present.map(([k]) => k),
    trackLabels: present.map(([, label]) => label),
  };
}

function Chip({ label, small = false, href }: { label: string; small?: boolean; href?: string }) {
  const style = {
      fontSize: small ? 11 : 12,
      fontWeight: 600,
      color: small ? META : SECONDARY,
      border: `1px solid ${small ? FAINT : BORDER}`,
    borderRadius: 999,
    padding: small ? '3px 8px' : '4px 10px',
    textDecoration: 'none',
    display: 'inline-block',
  } as const;
  // 대상 칩은 그 대상의 노트로 바로 들어가는 링크다(?track=).
  return href ? <Link href={href} style={style}>{label}</Link> : <span style={style}>{label}</span>;
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 2', background: IMG_BG, overflow: 'hidden' }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

interface ViewProps {
  notes: SermonNote[];
  eyebrow?: string;
  title?: string;
  description?: string;
  /** 최신 노트 피처(큰 카드) 표시 여부 */
  showFeature?: boolean;
  /** 시리즈 / 읽는 법 안내 섹션 표시 여부 */
  showGuide?: boolean;
  /** 데이터 블록으로 쓸 때는 DataSection 이 상하 여백을 주므로 자체 상단 여백을 없앤다. */
  inBlock?: boolean;
}

export function SermonNoteListView({
  notes,
  eyebrow = 'SERMON NOTES',
  title = '설교노트',
  description = '주일 설교를 읽기 좋게 정리했습니다. 장년부터 Kids까지, 세대마다 같은 말씀을 각자의 눈높이로 읽습니다.',
  showFeature = true,
  showGuide = true,
  inBlock = false,
}: ViewProps) {
  const rows = useMemo(() => (notes ?? []).map(toRow), [notes]);
  const [track, setTrack] = useState<'all' | SermonNoteCongregationKey>('all');
  const [shown, setShown] = useState(PAGE);

  // 실제 데이터에 존재하는 대상만 탭으로 노출(없는 부서 탭을 띄우지 않는다).
  const available = useMemo(
    () => TRACKS.filter(([k]) => rows.some((r) => r.trackKeys.includes(k))),
    [rows],
  );
  const filtered = useMemo(
    () => (track === 'all' ? rows : rows.filter((r) => r.trackKeys.includes(track))),
    [rows, track],
  );
  const trackName = (k: 'all' | SermonNoteCongregationKey) =>
    (k === 'all' ? '전체' : (TRACKS.find(([t]) => t === k)?.[1] ?? ''));

  const latest = filtered[0];
  // 최신 피처를 숨기면 목록이 전부(최신 포함)를 보여준다.
  const rest = showFeature ? filtered.slice(1) : filtered;
  const visible = rest.slice(0, shown);

  // 시리즈는 모듈에 없는 값 — 입력된 노트가 있을 때만 집계해 보여준다.
  const seriesList = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.series) m.set(r.series, (m.get(r.series) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const pick = (k: 'all' | SermonNoteCongregationKey) => { setTrack(k); setShown(PAGE); };
  const tabs: ['all' | SermonNoteCongregationKey, string][] = [['all', '전체'], ...available];

  return (
    <div style={{ background: 'var(--dw-background, #ffffff)', color: TEXT }}>
      {/* ── 제목부 + 대상 탭 ── */}
      <section style={{ padding: inBlock ? '0 22px' : '56px 22px 0' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', borderBottom: `3px double ${RULE}`, paddingBottom: 22,
          display: 'flex', flexWrap: 'wrap', gap: '20px 40px', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: SECONDARY }}>{eyebrow}</p>}
            {title && <h1 style={{ ...SERIF, margin: '16px 0 0', fontSize: 'clamp(30px,4.4vw,52px)', fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h1>}
            {description && (
              <p style={{ margin: '16px 0 0', maxWidth: '28em', fontSize: 17, lineHeight: 1.75, color: MUTED }}>{description}</p>
            )}
          </div>
          {available.length > 0 && (
            <div role="tablist" aria-label="대상" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 22px' }}>
              {tabs.map(([k, label]) => {
                const on = k === track;
                return (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={on}
                    onClick={() => pick(k)}
                    style={{
                      background: 'none', border: 0, borderBottom: on ? `2px solid ${RULE}` : '2px solid transparent',
                      padding: '10px 0 8px', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                      color: on ? TEXT : META,
                    }}
                  >{label}</button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 최신 노트 피처 ── */}
      {showFeature && latest && (
        <section style={{ padding: '36px 22px 0' }}>
          <div style={{
            maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 40,
            alignItems: 'center', color: TEXT,
          }}>
            <Link href={`/sermon-note/${latest.id}`} style={{ flex: '1 1 420px', minWidth: 0, display: 'block' }}>
              <Thumb src={latest.img} alt={latest.title} />
            </Link>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>
                이번 주{latest.date ? ` · ${latest.date}` : ''}
              </p>
              <h2 style={{ ...SERIF, margin: '16px 0 0', fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3, textWrap: 'pretty' as const }}>
                <Link href={`/sermon-note/${latest.id}`} style={{ color: TEXT, textDecoration: 'none' }}>{latest.title}</Link>
              </h2>
              {latest.sub && <p style={{ ...SERIF, margin: '14px 0 0', fontSize: 17, lineHeight: 1.7, color: MUTED, textWrap: 'pretty' as const }}>{latest.sub}</p>}
              {(latest.ref || latest.preacher) && (
                <p style={{ margin: '18px 0 0', fontSize: 13, color: META }}>{[latest.ref, latest.preacher].filter(Boolean).join(' · ')}</p>
              )}
              {latest.trackLabels.length > 0 && (
                <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {latest.trackKeys.map((k, i) => (
                    <Chip key={k} label={latest.trackLabels[i] ?? k} href={`/sermon-note/${latest.id}?track=${k}`} />
                  ))}
                </div>
              )}
              <p style={{ margin: '26px 0 0', fontSize: 14, fontWeight: 600 }}>
                <Link href={track === 'all' ? `/sermon-note/${latest.id}` : `/sermon-note/${latest.id}?track=${track}`} style={{ color: PRIMARY, textDecoration: 'none' }}>
                  {track === 'all' ? '설교노트 읽기' : `${trackName(track)} 노트 읽기`} ›
                </Link>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 지난 설교노트 ── */}
      <section style={{ padding: '64px 22px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', borderTop: `3px double ${RULE}`, paddingTop: 28 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>
              {track === 'all' ? '지난 설교노트' : `${trackName(track)} 설교노트`}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: FAINT_TEXT }}>{filtered.length}편</p>
          </div>

          {rest.length === 0 ? (
            <p style={{ margin: '22px 0 0', fontSize: 15, color: MUTED }}>
              {latest ? '아직 지난 설교노트가 없습니다.' : '등록된 설교노트가 없습니다.'}
            </p>
          ) : (
            <>
              <div style={{ marginTop: 22, display: 'grid', gap: '36px 30px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {visible.map((n) => (
                  <div key={n.id} style={{ minWidth: 0 }}>
                    <Link href={`/sermon-note/${n.id}`} style={{ display: 'block', minWidth: 0, color: TEXT, textDecoration: 'none' }}>
                      <Thumb src={n.img} alt={n.title} />
                      <p style={{ margin: '14px 0 0', fontSize: 12, color: FAINT_TEXT }}>{[n.date, n.series].filter(Boolean).join(' · ')}</p>
                      <h3 style={{ ...SERIF, margin: '8px 0 0', fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.45, textWrap: 'pretty' as const }}>{n.title}</h3>
                      {n.ref && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: MUTED }}>{n.ref}</p>}
                    </Link>
                    {n.trackKeys.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {n.trackKeys.map((k, i) => (
                          <Chip key={k} label={n.trackLabels[i] ?? k} small href={`/sermon-note/${n.id}?track=${k}`} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {shown < rest.length && (
                <div style={{ marginTop: 44, display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShown((v) => v + PAGE)}
                    style={{ background: 'none', border: `1px solid ${RULE}`, borderRadius: 2, padding: '12px 26px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: TEXT, cursor: 'pointer' }}
                  >지난 노트 더 보기</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 시리즈 / 읽는 법 ── */}
      {showGuide && (
      <section style={{ padding: '72px 22px 0' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', borderTop: `1px solid ${BORDER}`, paddingTop: 28,
          display: 'grid', gap: 30, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}>
          {seriesList.length > 0 && (
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>시리즈</p>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {seriesList.map(([name, n]) => (
                  <span key={name} style={{ ...SERIF, fontSize: 16, color: TEXT }}>
                    {name} <span style={{ fontSize: 13, color: FAINT_TEXT }}>· {n}편</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>이렇게 읽어 보세요</p>
            <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.85, color: MUTED }}>
              주중에 한 대지씩 읽고, 마지막 기도제목으로 한 주를 마무리합니다. 가정에서는 Children·Kids 노트로 자녀와 같은 말씀을 나눌 수 있습니다.
            </p>
          </div>
        </div>
      </section>
      )}

      <div style={{ height: inBlock ? 0 : 80 }} />
    </div>
  );
}
