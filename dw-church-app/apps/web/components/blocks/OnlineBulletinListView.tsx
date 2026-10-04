'use client';

// 온라인 주보 목록 — 은혜침례교회 '온라인 주보 목록' 시안.
//   제목부 + 연도 탭 → 최신 주보 피처(큰 날짜 + 주일명 + 말씀/교회소식) → 월별 그룹 목록(+더 보기) → 안내
// 데이터 블록(online_bulletin_list)이 쓰는 뷰. 없는 값(설교자 등)은 지어내지 않는다.
import { useMemo, useState } from 'react';
import Link from 'next/link';

const TEXT = 'var(--dw-text, #3a3129)';
const PRIMARY = 'var(--dw-primary, #7b7d5c)';
const SECONDARY = 'var(--dw-secondary, #5e6044)';
const MUTED = 'var(--brand-muted, #6f6255)';
const META = 'var(--brand-muted, #8a7c6d)';
const FAINT_TEXT = '#a89684';
const BORDER = 'var(--border, #e2d8cb)';
const FAINT = 'var(--border, #ece2d6)';
const RULE = 'var(--dw-text, #3a3129)';
const SERIF = { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" } as const;

const PAGE = 12; // '더 보기' 한 번에 추가로 보여줄 주보 수

/** 블록이 넘겨주는 한 건 — 서버에서 주보 + (날짜로 매칭한) 설교노트를 합쳐 만든다. */
export interface BulletinRow {
  id: string;
  year: string;
  ym: string;      // 2026년 9월
  day: string;     // 27
  week: string;    // 주일명(예배명)
  sermon: string;  // 설교 제목(설교노트에서 매칭)
  ref: string;     // 성경 본문
  presider: string;
  news: string[];
}

interface ViewProps {
  rows: BulletinRow[];
  eyebrow?: string;
  title?: string;
  description?: string;
  /** 최신 주보를 크게 보여줄지 */
  showFeature?: boolean;
  /** 하단 안내(주보에 담기는 것 / 소식 나누기) */
  showGuide?: boolean;
  guideLeft?: string;
  guideRight?: string;
  /** '소식 보내기' 링크 — 비우면 숨김 */
  newsHref?: string;
  newsLabel?: string;
  /** 데이터 블록으로 쓸 때는 DataSection 이 상하 여백을 준다. */
  inBlock?: boolean;
}

export function OnlineBulletinListView({
  rows,
  eyebrow = 'BULLETIN',
  title = '온라인 주보',
  description = '주일 예배 순서와 교회 소식, 한 주의 기도제목을 매주 올려 드립니다.',
  showFeature = true,
  showGuide = true,
  guideLeft = '예배 순서와 찬양, 이번 주 말씀 본문, 교회 소식, 함께 기도할 제목. 주일 아침에 올라옵니다.',
  guideRight = '주보에 실을 소식이나 기도제목은 토요일 정오까지 보내 주세요.',
  newsHref = '',
  newsLabel = '소식 보내기',
  inBlock = false,
}: ViewProps) {
  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b.localeCompare(a)), [rows]);
  const [year, setYear] = useState<string>(years[0] ?? '');
  const [shown, setShown] = useState(PAGE);

  const activeYear = years.includes(year) ? year : (years[0] ?? '');
  const list = useMemo(() => rows.filter((r) => r.year === activeYear), [rows, activeYear]);
  const latest = list[0];
  const rest = showFeature ? list.slice(1) : list;
  const visible = rest.slice(0, shown);

  // 월별 그룹(표시 중인 것만).
  const months = useMemo(() => {
    const out: { label: string; items: BulletinRow[] }[] = [];
    for (const b of visible) {
      let m = out.find((x) => x.label === b.ym);
      if (!m) { m = { label: b.ym, items: [] }; out.push(m); }
      m.items.push(b);
    }
    return out;
  }, [visible]);

  const pickYear = (y: string) => { setYear(y); setShown(PAGE); };

  if (rows.length === 0) return null;

  return (
    <div style={{ background: 'var(--dw-background, #ffffff)', color: TEXT }}>
      {/* ── 제목부 + 연도 탭 ── */}
      <section style={{ padding: inBlock ? '0 22px' : '56px 22px 0' }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', borderBottom: `3px double ${RULE}`, paddingBottom: 22,
          display: 'flex', flexWrap: 'wrap', gap: '20px 40px', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: SECONDARY }}>{eyebrow}</p>}
            {title && <h1 style={{ ...SERIF, margin: '16px 0 0', fontSize: 'clamp(30px,4.4vw,52px)', fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h1>}
            {description && <p style={{ margin: '16px 0 0', maxWidth: '28em', fontSize: 17, lineHeight: 1.75, color: MUTED }}>{description}</p>}
          </div>
          {years.length > 1 && (
            <div role="tablist" aria-label="연도" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 22px' }}>
              {years.map((y) => {
                const on = y === activeYear;
                return (
                  <button
                    key={y}
                    role="tab"
                    aria-selected={on}
                    onClick={() => pickYear(y)}
                    style={{
                      background: 'none', border: 0, borderBottom: on ? `2px solid ${RULE}` : '2px solid transparent',
                      padding: '10px 0 8px', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                      color: on ? TEXT : META,
                    }}
                  >{y}</button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 최신 주보 피처 ── */}
      {showFeature && latest && (
        <section style={{ padding: '40px 22px 0' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '24px 56px' }}>
            <Link href={`/online-bulletins/${latest.id}`} style={{ flex: '0 1 260px', minWidth: 0, color: TEXT, textDecoration: 'none' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>
                {activeYear === years[0] ? '이번 주' : `${activeYear}년 마지막 주보`}
              </p>
              <p style={{ ...SERIF, margin: '14px 0 0', fontSize: 'clamp(40px,6vw,72px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>{latest.day}</p>
              <p style={{ ...SERIF, margin: '8px 0 0', fontSize: 17, color: MUTED }}>{latest.ym}</p>
            </Link>
            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <h2 style={{ ...SERIF, margin: 0, fontSize: 'clamp(24px,3vw,34px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.35, textWrap: 'pretty' as const }}>
                <Link href={`/online-bulletins/${latest.id}`} style={{ color: TEXT, textDecoration: 'none' }}>{latest.week}</Link>
              </h2>
              <div style={{ marginTop: 22, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {(latest.sermon || latest.ref) && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: FAINT_TEXT }}>말씀</p>
                    {latest.sermon && <p style={{ ...SERIF, margin: '6px 0 0', fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>{latest.sermon}</p>}
                    {(latest.ref || latest.presider) && (
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: META }}>
                        {[latest.ref, latest.presider && `인도 ${latest.presider}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                )}
                {latest.news.length > 0 && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: FAINT_TEXT }}>교회 소식</p>
                    <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                      {latest.news.slice(0, 3).map((n, i) => (
                        <li key={i} style={{ fontSize: 15, lineHeight: 1.7, color: TEXT }}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <p style={{ margin: '24px 0 0', fontSize: 14, fontWeight: 600 }}>
                <Link href={`/online-bulletins/${latest.id}`} style={{ color: PRIMARY, textDecoration: 'none' }}>주보 전체 보기 ›</Link>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 월별 지난 주보 ── */}
      <section style={{ padding: '64px 22px 0' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', borderTop: `3px double ${RULE}`, paddingTop: 28 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>{activeYear}년 지난 주보</p>
            <p style={{ margin: 0, fontSize: 13, color: FAINT_TEXT }}>{list.length}주</p>
          </div>

          {rest.length === 0 ? (
            <p style={{ margin: '22px 0 0', fontSize: 15, color: MUTED }}>아직 지난 주보가 없습니다.</p>
          ) : (
            <>
              {months.map((m) => (
                <div key={m.label} style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: '12px 56px' }}>
                  <p style={{ ...SERIF, flex: '0 0 200px', margin: 0, fontSize: 16, letterSpacing: '.04em', color: FAINT_TEXT }}>{m.label}</p>
                  <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                    {m.items.map((b) => (
                      <Link
                        key={b.id}
                        href={`/online-bulletins/${b.id}`}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', alignItems: 'baseline', borderTop: `1px solid ${FAINT}`, padding: '16px 0', color: TEXT, textDecoration: 'none' }}
                      >
                        <span style={{ ...SERIF, flex: '0 0 52px', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>{b.day}</span>
                        <span style={{ flex: '1 1 260px', minWidth: 0 }}>
                          <span style={{ ...SERIF, display: 'block', fontSize: 18, fontWeight: 600, lineHeight: 1.45, textWrap: 'pretty' as const }}>{b.week}</span>
                          {(b.sermon || b.ref) && (
                            <span style={{ display: 'block', marginTop: 4, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
                              {[b.sermon, b.ref].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: 13, color: FAINT_TEXT }}>보기 ›</span>
                      </Link>
                    ))}
                    <div style={{ borderTop: `1px solid ${FAINT}` }} />
                  </div>
                </div>
              ))}
              {shown < rest.length && (
                <div style={{ marginTop: 44, display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShown((v) => v + PAGE)}
                    style={{ background: 'none', border: `1px solid ${RULE}`, borderRadius: 2, padding: '12px 26px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: TEXT, cursor: 'pointer' }}
                  >지난 주보 더 보기</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── 안내 ── */}
      {showGuide && (guideLeft || guideRight) && (
        <section style={{ padding: '72px 22px 0' }}>
          <div style={{
            maxWidth: 1080, margin: '0 auto', borderTop: `1px solid ${BORDER}`, paddingTop: 28,
            display: 'grid', gap: 30, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}>
            {guideLeft && (
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>주보에 담기는 것</p>
                <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.85, color: MUTED }}>{guideLeft}</p>
              </div>
            )}
            {guideRight && (
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>소식 나누기</p>
                <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.85, color: MUTED }}>{guideRight}</p>
                {newsHref && (
                  <Link href={newsHref} style={{ display: 'inline-block', marginTop: 12, fontSize: 14, fontWeight: 600, color: PRIMARY }}>{newsLabel} ›</Link>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div style={{ height: inBlock ? 0 : 80 }} />
    </div>
  );
}
