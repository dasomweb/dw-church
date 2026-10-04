'use client';

// 전용 "설교노트 보기" 페이지 뷰 — 은혜침례교회 설교노트 시안(에디토리얼) 특화.
// 온라인 주보(OnlineBulletinView)와 별개. 설교노트 모듈 데이터를 대상별 탭으로 렌더.
//   Hero(날짜·제목·부제·메타·영상/주보 링크·대표이미지 4:3)
//   대상별 탭(내용 있는 회중만) + 섹션 퀵인덱스
//   좌측 aside(트랙 소개 + 중심 말씀) + 우측 article(섹션: 성경박스·라벨·핵심문장·리스트·번호기도·카툰·나눔질문)
//   지난 설교노트 그리드
// 색은 grace 테마 토큰(--dw-*)을 우선 사용하고, 시안의 웜 뉴트럴을 폴백으로 둠 → 재사용 가능.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type {
  SermonNote,
  SermonNoteContent,
  SermonNoteCongregation,
  SermonNoteCongregationKey,
  SermonNoteStudy,
} from '@dw-church/api-client';

// ── 색/폰트 토큰 ────────────────────────────────────────────
const TEXT = 'var(--dw-text, #3a3129)';
const PRIMARY = 'var(--dw-primary, #7b7d5c)';
const SECONDARY = 'var(--dw-secondary, #5e6044)';
const MUTED = 'var(--brand-muted, #6f6255)';
const META = 'var(--brand-muted, #8a7c6d)';
const FAINT_TEXT = '#a89684'; // 인덱스/보조 라벨 — 시안 웜 뉴트럴
const NUM = '#c2b3a1'; // 섹션 번호 — 시안 웜 뉴트럴
const BORDER = 'var(--border, #e2d8cb)';
const FAINT = 'var(--border, #ece2d6)';
const IMG_BG = 'var(--dw-surface, #f2ece3)';
const SURFACE = 'var(--dw-surface, #f7f2ea)';
const RULE = 'var(--dw-text, #3a3129)'; // 더블 보더 컬러
const SERIF = { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" } as const;

const TRACKS: { key: SermonNoteCongregationKey; label: string; sub: string }[] = [
  { key: 'adult', label: '장년', sub: '한국어' },
  { key: 'em', label: 'EM', sub: 'English' },
  { key: 'youth', label: 'Youth', sub: '중고등부' },
  { key: 'children', label: 'Children', sub: '초등부' },
  { key: 'kids', label: 'Kids', sub: '유치부' },
];

// ── 유틸 ───────────────────────────────────────────────────
function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
function studyHasItems(s?: SermonNoteStudy): boolean {
  if (!s) return false;
  return (['observation', 'correlation', 'application'] as const).some((k) => (s[k]?.length ?? 0) > 0);
}
function congHasContent(c?: SermonNoteCongregation): boolean {
  if (!c) return false;
  return !!(c.title?.trim() || c.text?.trim() || (c.cartoonImageUrls?.length ?? 0) > 0 || studyHasItems(c.study));
}
// 성경 참조처럼 보이는지 (요한복음 5:6, John 5:6–7 등)
function looksLikeRef(line: string): boolean {
  return /\d+\s*[:：]\s*\d+/.test(line) || /\d+\s*장/.test(line) || /^[A-Za-z가-힣].{0,20}\d+\s*[:：]/.test(line);
}

// ── 인라인 마크다운 (**bold** *italic* [text](url)) ──────────
function InlineMd({ text }: { text: string }) {
  const s = text ?? '';
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(<span key={i++}>{s.slice(last, m.index)}</span>);
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('*')) out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t);
      if (mm) out.push(<a key={i++} href={mm[2]} target="_blank" rel="noreferrer" style={{ color: PRIMARY, textDecoration: 'underline' }}>{mm[1]}</a>);
    }
    last = m.index + t.length;
  }
  if (last < s.length) out.push(<span key={i++}>{s.slice(last)}</span>);
  return <>{out}</>;
}

// 한 줄이 통째로 **...** 인지 (핵심 문장 판정)
function isKeyLine(t: string): boolean {
  return /^\*\*[^*]+\*\*$/.test(t.trim());
}

// ── 에디토리얼 본문 렌더러 ──────────────────────────────────
// 섹션 본문 마크다운을 시안 블록(성경박스/라벨/리스트/번호/핵심문장/문단)으로 변환.
function NoteBody({ md }: { md: string }) {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const at = (j: number) => lines[j] ?? '';
  const HR = /^(-{3,}|\*{3,}|_{3,})$/;
  const OL = /^\d+[.)]\s+/;
  const BULLET = (t: string) => /^[-*]\s+/.test(t);

  while (i < lines.length) {
    const t = at(i).trim();
    if (!t) { i++; continue; }

    // 구분선
    if (HR.test(t)) { out.push(<hr key={key++} style={{ border: 'none', borderTop: `1px solid ${FAINT}`, margin: '26px 0' }} />); i++; continue; }

    // 성경 인용 박스 (> ...)
    if (t.startsWith('>')) {
      const q: string[] = [];
      while (i < lines.length && at(i).trim().startsWith('>')) { q.push(at(i).trim().replace(/^>\s?/, '')); i++; }
      const filtered = q.filter((l) => l.length > 0);
      let ref = '';
      let verses = filtered;
      if (filtered.length > 1 && looksLikeRef(filtered[0]!)) { ref = filtered[0]!; verses = filtered.slice(1); }
      else if (filtered.length === 1 && looksLikeRef(filtered[0]!)) { ref = filtered[0]!; verses = []; }
      out.push(
        <blockquote key={key++} style={{ margin: '26px 0 0', padding: '20px 22px', background: SURFACE }}>
          {ref && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: SECONDARY }}>{ref}</p>}
          {verses.length > 0 && (
            <div style={{ marginTop: ref ? 10 : 0, display: 'grid', gap: 8 }}>
              {verses.map((v, k) => (
                <p key={k} style={{ ...SERIF, margin: 0, fontSize: 16, lineHeight: 1.95, color: TEXT, textWrap: 'pretty' as const }}><InlineMd text={v} /></p>
              ))}
            </div>
          )}
        </blockquote>,
      );
      continue;
    }

    // 라벨 (### 소제목)
    if (t.startsWith('### ')) {
      out.push(<p key={key++} style={{ margin: '36px 0 0', fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}><InlineMd text={t.slice(4)} /></p>);
      i++; continue;
    }
    // 소제목보다 상위(# / ##)는 섹션 안에서 강조 헤딩으로
    if (t.startsWith('# ') || t.startsWith('## ')) {
      out.push(<p key={key++} style={{ ...SERIF, margin: '30px 0 0', fontSize: 21, fontWeight: 600, lineHeight: 1.5, color: TEXT }}><InlineMd text={t.replace(/^#{1,2}\s+/, '')} /></p>);
      i++; continue;
    }

    // 번호 목록 (기도제목 등) — 번호 뒤 따라오는 불릿은 하위 항목으로
    if (OL.test(t)) {
      const items: { no: string; text: string; subs: string[] }[] = [];
      while (i < lines.length && OL.test(at(i).trim())) {
        const line = at(i).trim();
        const mm = /^(\d+)[.)]\s+(.*)$/.exec(line)!;
        const no = mm[1]!;
        const text = mm[2]!;
        i++;
        const subs: string[] = [];
        while (i < lines.length) {
          const nt = at(i).trim();
          if (!nt) { i++; continue; }
          if (BULLET(nt)) { subs.push(nt.replace(/^[-*]\s+/, '')); i++; continue; }
          break;
        }
        items.push({ no, text, subs });
      }
      out.push(
        <div key={key++} style={{ marginTop: 18 }}>
          {items.map((it, k) => (
            <div key={k} style={{ marginTop: k === 0 ? 0 : 20, paddingTop: 18, borderTop: `1px solid ${FAINT}`, display: 'flex', gap: 16 }}>
              <span style={{ ...SERIF, flex: 'none', width: 24, fontSize: 15, color: FAINT_TEXT }}>{it.no}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...SERIF, margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.75, color: TEXT, textWrap: 'pretty' as const }}><InlineMd text={it.text} /></p>
                {it.subs.length > 0 && (
                  <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                    {it.subs.map((s, j) => (
                      <li key={j} style={{ fontSize: 15, lineHeight: 1.85, color: MUTED }}><InlineMd text={s} /></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // 불릿 목록 (— 대시)
    if (BULLET(t)) {
      const li: string[] = [];
      while (i < lines.length && BULLET(at(i).trim())) { li.push(at(i).trim().replace(/^[-*]\s+/, '')); i++; }
      out.push(
        <ul key={key++} style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {li.map((l, k) => (
            <li key={k} style={{ ...SERIF, display: 'flex', gap: 12, fontSize: 17, lineHeight: 1.9, color: TEXT }}>
              <span style={{ flex: 'none', color: NUM }}>—</span>
              <span style={{ minWidth: 0 }}><InlineMd text={l} /></span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // 핵심 문장 (한 줄 전체 **...**)
    if (isKeyLine(t)) {
      out.push(<p key={key++} style={{ ...SERIF, margin: '14px 0 0', fontSize: 'clamp(19px,2.2vw,22px)', fontWeight: 600, lineHeight: 1.7, color: TEXT, textWrap: 'pretty' as const }}><InlineMd text={t.slice(2, -2)} /></p>);
      i++; continue;
    }

    // 일반 문단
    const para: string[] = [];
    while (i < lines.length) {
      const lt = at(i).trim();
      if (!lt || lt.startsWith('>') || lt.startsWith('#') || BULLET(lt) || OL.test(lt) || HR.test(lt)) break;
      para.push(lt); i++;
    }
    out.push(
      <p key={key++} style={{ ...SERIF, margin: '12px 0 0', fontSize: 17, lineHeight: 2.05, color: TEXT, textWrap: 'pretty' as const }}>
        {para.map((l, k) => <span key={k}>{k > 0 && <br />}<InlineMd text={l} /></span>)}
      </p>,
    );
  }
  return <>{out}</>;
}

// ── 섹션 모델 ──────────────────────────────────────────────
interface NoteSection {
  id: string;
  num: string; // 01, 02 ...
  indexLabel: string; // 퀵인덱스 표기 (기도/카툰/나눔 등)
  heading: string;
  bodyMd?: string;
  images?: string[];
  study?: SermonNoteStudy;
}

// 회중 마크다운을 ## 기준으로 섹션 분해 + 카툰/나눔질문 섹션 추가.
function buildSections(key: SermonNoteCongregationKey, cong: SermonNoteCongregation): { lead: string; sections: NoteSection[]; centralVerse: { ref: string; text: string } | null } {
  const md = (cong.text ?? '').replace(/\r\n/g, '\n');
  const lines = md.split('\n');

  // 중심 말씀: 첫 성경 인용 추출
  let centralVerse: { ref: string; text: string } | null = null;
  {
    const q: string[] = [];
    let started = false;
    for (const raw of lines) {
      const t = raw.trim();
      if (t.startsWith('>')) { started = true; q.push(t.replace(/^>\s?/, '')); }
      else if (started) break;
    }
    const f = q.filter(Boolean);
    if (f.length) {
      if (f.length > 1 && looksLikeRef(f[0]!)) centralVerse = { ref: f[0]!, text: f.slice(1).join(' ') };
      else centralVerse = { ref: looksLikeRef(f[0]!) ? f[0]! : '', text: looksLikeRef(f[0]!) ? '' : f.join(' ') };
    }
  }

  // ## 헤딩으로 섹션 분해
  const rawSections: { heading: string; body: string[] }[] = [];
  const introLines: string[] = [];
  let cur: { heading: string; body: string[] } | null = null;
  for (const raw of lines) {
    const t = raw.trim();
    const h2 = /^##\s+(.*)$/.exec(t);
    const h1 = /^#\s+(.*)$/.exec(t);
    if (h2) { if (cur) rawSections.push(cur); cur = { heading: h2[1]!.trim(), body: [] }; continue; }
    if (h1 && !cur) { continue; } // 문서 제목류 스킵
    if (cur) cur.body.push(raw);
    else introLines.push(raw);
  }
  if (cur) rawSections.push(cur);

  // 헤딩이 하나도 없으면 전체를 한 섹션으로
  if (rawSections.length === 0 && md.trim()) {
    rawSections.push({ heading: cong.title?.trim() || '', body: lines });
  }

  const sections: NoteSection[] = [];
  let counter = 0;
  const pad = (x: number) => String(x).padStart(2, '0');

  for (const s of rawSections) {
    // 섹션 번호는 **문서상 위치 기준 순차**(시안도 기도제목을 04 로 매긴다).
    // 제목에 "1. " / "2) " 처럼 번호가 붙어 있으면 제목에서만 떼어낸다 — 그 번호를
    // 섹션 번호로 쓰면, 번호 없는 섹션(서론 등)이 앞에 올 때 01 이 중복된다.
    const heading = s.heading.replace(/^(\d+)[.)]\s+/, '').trim();
    counter += 1;
    const num = pad(counter);
    // 퀵인덱스 '기도' 라벨은 제목이 기도로 **시작**할 때만 붙인다 — 느슨하게 포함
    // 검사를 하면 '결론 · 우리가 기도하는 교회' 같은 섹션까지 기도로 잘못 표시된다.
    const isPrayer = /^(기도|prayer)/i.test(heading);
    sections.push({
      id: `sec-${key}-${sections.length}`,
      num,
      indexLabel: isPrayer ? '기도' : num,
      heading,
      bodyMd: s.body.join('\n').trim(),
    });
  }

  // 카툰 이미지 섹션 (children/kids 등)
  if ((cong.cartoonImageUrls?.length ?? 0) > 0) {
    counter += 1;
    sections.push({
      id: `sec-${key}-${sections.length}`,
      num: pad(counter),
      indexLabel: '카툰',
      heading: '그림으로 보는 말씀',
      images: cong.cartoonImageUrls,
    });
  }

  // 나눔 질문 섹션
  if (studyHasItems(cong.study)) {
    counter += 1;
    sections.push({
      id: `sec-${key}-${sections.length}`,
      num: pad(counter),
      indexLabel: '나눔',
      heading: '나눔 질문',
      study: cong.study,
    });
  }

  const lead = introLines.join('\n').trim();
  return { lead, sections, centralVerse };
}

function StudyBlock({ study }: { study: SermonNoteStudy }) {
  const groups: { label: string; items?: string[] }[] = [
    { label: '관찰', items: study.observation },
    { label: '상관', items: study.correlation },
    { label: '적용', items: study.application },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      {groups.filter((g) => (g.items?.length ?? 0) > 0).map((g, k) => (
        <div key={k} style={{ marginTop: k === 0 ? 20 : 28 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>{g.label}</p>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {g.items!.map((it, j) => (
              <li key={j} style={{ ...SERIF, display: 'flex', gap: 12, fontSize: 17, lineHeight: 1.9, color: TEXT }}>
                <span style={{ flex: 'none', color: NUM }}>—</span>
                <span style={{ minWidth: 0 }}><InlineMd text={it} /></span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── 메인 뷰 ────────────────────────────────────────────────
interface Props {
  note: SermonNote;
  recent?: SermonNote[];
  onlineBulletinHref?: string;
}

export function SermonNotePageView({ note, recent = [], onlineBulletinHref = '/onlinejubo' }: Props) {
  const content = (note.content ?? {}) as SermonNoteContent;
  const congregations = content.congregations ?? {};

  const available = useMemo(
    () => TRACKS.filter((t) => congHasContent(congregations[t.key])),
    [congregations],
  );
  const defaultKey: SermonNoteCongregationKey = available.find((t) => t.key === 'adult')?.key ?? available[0]?.key ?? 'adult';

  const [track, setTrack] = useState<SermonNoteCongregationKey>(defaultKey);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sermon-note-track') as SermonNoteCongregationKey | null;
      if (saved && available.some((t) => t.key === saved)) setTrack(saved);
    } catch { /* localStorage 불가 시 기본값 */ }
  }, [available]);
  const changeTrack = (k: SermonNoteCongregationKey) => {
    setTrack(k);
    try { localStorage.setItem('sermon-note-track', k); } catch { /* noop */ }
  };

  const activeKey: SermonNoteCongregationKey = available.some((t) => t.key === track) ? track : defaultKey;
  const activeMeta = TRACKS.find((t) => t.key === activeKey)!;
  const activeCong = congregations[activeKey] ?? {};
  const built = useMemo(() => buildSections(activeKey, activeCong), [activeKey, activeCong]);

  // Hero
  const heroTitle = note.title?.trim() || (congregations.adult?.title ?? '') || '설교노트';
  const heroSubtitle = (content['subtitle'] as string) || '';
  const scripture = content.scripture || '';
  const preacher = (content['preacher'] as string) || '';
  const service = (content['service'] as string) || (content['serviceType'] as string) || '';
  const videoUrl = (content['videoUrl'] as string) || '';
  const heroImg = content.thumbnailUrl || '';
  const heroMeta = [scripture, preacher, service].filter(Boolean);

  const central = built.centralVerse;
  const lead = built.lead || '이번 주 설교 노트를 읽기 좋게 정리했습니다.';
  const past = (recent || []).filter((r) => r.id !== note.id).slice(0, 6);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
  };

  return (
    <div style={{ background: 'var(--dw-background, #ffffff)', color: TEXT }}>
      {/* ── Hero ── */}
      <section style={{ padding: '48px 22px 0' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 44, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.18em', color: PRIMARY }}>SERMON NOTE{fmtDate(note.noteDate) ? ` · ${fmtDate(note.noteDate)}` : ''}</p>
            <h1 style={{ ...SERIF, margin: '18px 0 0', fontSize: 'clamp(34px,5.2vw,60px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{heroTitle}</h1>
            {heroSubtitle && <p style={{ ...SERIF, margin: '18px 0 0', fontSize: 'clamp(16px,1.8vw,19px)', lineHeight: 1.7, color: MUTED }}>{heroSubtitle}</p>}
            {heroMeta.length > 0 && (
              <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: '8px 22px', fontSize: 13, color: META }}>
                {heroMeta.map((m, k) => <span key={k}>{m}</span>)}
              </div>
            )}
            <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 14, fontWeight: 600 }}>
              {videoUrl && <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: PRIMARY }}>영상으로 보기 ›</a>}
              <Link href={onlineBulletinHref} style={{ color: PRIMARY }}>온라인 주보 ›</Link>
            </div>
          </div>
          {heroImg && (
            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: IMG_BG, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImg} alt={heroTitle} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 대상별 탭 + 퀵 인덱스 ── */}
      <section style={{ padding: '44px 22px 0' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', borderTop: `3px double ${RULE}`, borderBottom: `1px solid ${BORDER}`, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'space-between', gap: '10px 24px' }}>
          {available.length > 1 ? (
            <div role="tablist" aria-label="설교노트 대상" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 26px' }}>
              {available.map((t) => {
                const on = t.key === activeKey;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => changeTrack(t.key)}
                    style={{ background: 'none', border: 0, borderBottom: on ? `2px solid ${RULE}` : '2px solid transparent', padding: '14px 0 12px', marginBottom: -1, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', color: on ? TEXT : META }}
                  >
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{t.label}</span>
                    <span style={{ display: 'block', marginTop: 3, fontSize: 11, fontWeight: 500, letterSpacing: '.02em', color: FAINT_TEXT }}>{t.sub}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '14px 0 12px', fontSize: 15, fontWeight: 600, color: TEXT }}>{activeMeta.label} 설교노트</div>
          )}
          {built.sections.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: FAINT_TEXT }}>
              {built.sections.map((s) => (
                <button key={s.id} onClick={() => scrollTo(s.id)} style={{ background: 'none', border: 0, padding: 0, fontFamily: 'inherit', fontSize: 13, color: META, cursor: 'pointer' }}>{s.indexLabel}</button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 본문 (aside + article) ── */}
      <section style={{ padding: '0 22px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'flex-start' }}>
          <aside style={{ flex: '1 1 220px', minWidth: 0, maxWidth: 260, paddingTop: 44 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: PRIMARY }}>{activeMeta.label} 설교노트</p>
            <p style={{ ...SERIF, margin: '12px 0 0', fontSize: 17, lineHeight: 1.75, color: TEXT, textWrap: 'pretty' as const }}>{lead}</p>
            {(central?.text || central?.ref || scripture) && (
              <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${FAINT}` }}>
                <p style={{ margin: 0, fontSize: 12, color: FAINT_TEXT }}>중심 말씀</p>
                {central?.text && <p style={{ ...SERIF, margin: '8px 0 0', fontSize: 15, lineHeight: 1.85, color: MUTED }}>{central.text}</p>}
                {(central?.ref || scripture) && <p style={{ margin: '8px 0 0', fontSize: 12, color: FAINT_TEXT }}>{central?.ref || scripture}</p>}
              </div>
            )}
          </aside>

          <article style={{ flex: '2 1 480px', minWidth: 0, maxWidth: 660, paddingBottom: 24 }}>
            {built.sections.length === 0 ? (
              <div style={{ padding: '64px 0 24px' }}>
                <p style={{ ...SERIF, margin: 0, fontSize: 22, fontWeight: 600 }}>이번 주 {activeMeta.label} 노트를 준비하고 있습니다.</p>
                <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.8, color: MUTED }}>준비되는 대로 이 자리에 올려 드립니다.{available.some((t) => t.key === 'adult') && activeKey !== 'adult' ? ' 먼저 장년 노트를 함께 읽어 보셔도 좋습니다.' : ''}</p>
                {available.some((t) => t.key === 'adult') && activeKey !== 'adult' && (
                  <button onClick={() => changeTrack('adult')} style={{ marginTop: 22, background: RULE, color: '#fff', border: 0, borderRadius: 2, padding: '12px 22px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>장년 노트 보기</button>
                )}
              </div>
            ) : (
              built.sections.map((sec) => (
                <section key={sec.id} id={sec.id} style={{ paddingTop: 52, scrollMarginTop: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <span style={{ ...SERIF, fontSize: 34, fontWeight: 500, lineHeight: 1, color: NUM }}>{sec.num}</span>
                    <span style={{ flex: 1, height: 1, background: BORDER }} />
                  </div>
                  {sec.heading && <h2 style={{ ...SERIF, margin: '16px 0 0', fontSize: 'clamp(23px,2.7vw,30px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.45, textWrap: 'pretty' as const }}>{sec.heading}</h2>}
                  {sec.images && sec.images.length > 0 && (
                    <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 12 }}>
                      {sec.images.map((src, k) => (
                        <div key={k} style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: IMG_BG, overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`${sec.heading} ${k + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {sec.study ? <StudyBlock study={sec.study} /> : sec.bodyMd ? <NoteBody md={sec.bodyMd} /> : null}
                </section>
              ))
            )}
          </article>
        </div>
      </section>

      {/* ── 지난 설교노트 ── */}
      {past.length > 0 && (
        <section style={{ padding: '72px 22px 0' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', borderTop: `3px double ${RULE}`, paddingTop: 28 }}>
            <p style={{ margin: '0 0 22px', fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: SECONDARY }}>지난 설교노트</p>
            <div style={{ display: 'grid', gap: 26, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {past.map((r) => {
                const rc = (r.content ?? {}) as SermonNoteContent;
                const rt = r.title?.trim() || rc.congregations?.adult?.title || '설교노트';
                const rmeta = [rc.scripture, fmtDate(r.noteDate)].filter(Boolean).join(' · ');
                return (
                  <Link key={r.id} href={`/sermon-note/${r.id}`} style={{ display: 'block', borderTop: `1px solid ${BORDER}`, paddingTop: 16, color: TEXT }}>
                    <span style={{ ...SERIF, display: 'block', fontSize: 19, fontWeight: 600 }}>{rt}</span>
                    {rmeta && <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: META }}>{rmeta}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
