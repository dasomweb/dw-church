// 공용 "노트 본문" 마크다운 렌더러 — 설교노트와 말씀 묵상(QT)이 **같은 규칙**으로
// 본문을 쓰고 같은 규칙으로 렌더한다. 원래 SermonNotePageView 안에 있던 렌더러를
// 꺼내 테마만 갈아끼울 수 있게 만든 것(EDITORIAL_MD 기준 출력은 종전과 동일).
//
// 지원 서식 — 관리자 편집기(NoteRichArea)의 툴바와 1:1 로 맞춰져 있다:
//   # / ## 제목 · ### 소제목(라벨) · **굵게** · *기울임* · > 인용(성경 박스)
//   - 불릿 · 1. 번호(하위 불릿 가능) · [텍스트](URL) · --- 구분선 · ![캡션](주소) 사진
//
// ⚠️ 편집기와 렌더러 한쪽만 고치면 본문에 날것의 마크다운 글자가 박힌다. 규칙을
//    바꾸면 apps/server/src/__tests__/modules/note-image-md.test.ts 도 같이 고칠 것.
import type { CSSProperties, ReactNode } from 'react';

/** 본문 글자 크기 배율 — 인라인 스타일이 고정 px 라 부모 font-size % 로는 안 먹는다.
 *  실제로 커지도록 각 px 값에 배율을 곱한다. */
export const z = (px: number, fs: number) => Math.round(px * fs);

export interface NoteMdTheme {
  /** 본문 색 */
  text: string;
  /** 보조 텍스트(캡션·하위 불릿) */
  muted: string;
  /** 라벨(###)·링크 */
  primary: string;
  /** 인용 박스의 성경 참조 라벨 */
  secondary: string;
  /** 번호 목록의 번호 */
  faint: string;
  /** 불릿 머리표 */
  marker: string;
  /** 구분선 / 번호 목록 경계선 */
  rule: string;
  /** 인용 박스 · 사진 자리 배경 */
  surface: string;
  /** 본문 글꼴 — 세리프를 쓰려면 fontFamily 를 준다. {} 면 사이트 기본(산세리프). */
  bodyStyle: CSSProperties;
  /** 제목(# / ##) 글꼴 — 없으면 bodyStyle 과 같게. */
  headingStyle?: CSSProperties;
  /** 인용 박스 · 사진 라운드(px). 0 이면 각진 모서리. */
  radius: number;
  /** 주면 인용 박스 왼쪽에 액센트 바가 생긴다(라운드는 오른쪽 모서리만 적용). */
  quoteAccent?: string;
  /** 일반 문단 글자 크기(px) */
  bodySize: number;
  /** 일반 문단 줄간 */
  bodyLine: number;
}

/** 설교노트(에디토리얼) — 웜 뉴트럴 + 세리프. 기존 렌더 그대로. */
export const EDITORIAL_MD: NoteMdTheme = {
  text: 'var(--dw-text, #3a3129)',
  muted: 'var(--brand-muted, #6f6255)',
  primary: 'var(--dw-primary, #7b7d5c)',
  secondary: 'var(--dw-secondary, #5e6044)',
  faint: '#a89684',
  marker: '#c2b3a1',
  rule: 'var(--border, #ece2d6)',
  surface: 'var(--dw-surface, #f7f2ea)',
  bodyStyle: { fontFamily: "var(--dw-font-heading, 'Noto Serif KR', serif)" },
  radius: 0,
  bodySize: 17,
  bodyLine: 2.05,
};

/** 말씀 묵상(QT) — 둥근 카드 + 사이트 기본 글꼴. 시안 14a 톤에 맞춤. */
export const DEVOTION_MD: NoteMdTheme = {
  text: 'var(--dw-text, #16181d)',
  muted: 'var(--dw-text-muted, #61697a)',
  primary: 'var(--dw-primary, #1466d6)',
  secondary: 'var(--dw-primary, #1466d6)',
  faint: 'var(--dw-text-muted, #61697a)',
  marker: 'var(--dw-primary, #1466d6)',
  rule: 'var(--dw-border, #e5e7eb)',
  surface: 'var(--dw-surface, #f7f8fa)',
  bodyStyle: {},
  headingStyle: { fontFamily: 'var(--dw-font-heading, inherit)' },
  radius: 16,
  quoteAccent: 'var(--dw-primary, #1466d6)',
  bodySize: 17,
  bodyLine: 1.95,
};

/** 성경 참조처럼 보이는지 (요한복음 5:6, John 5:6–7 등) */
export function looksLikeRef(line: string): boolean {
  return /\d+\s*[:：]\s*\d+/.test(line) || /\d+\s*장/.test(line) || /^[A-Za-z가-힣].{0,20}\d+\s*[:：]/.test(line);
}

/** 한 줄이 통째로 **...** 인지 (핵심 문장 판정) */
export function isKeyLine(t: string): boolean {
  return /^\*\*[^*]+\*\*$/.test(t.trim());
}

// ── 인라인 마크다운 (**bold** *italic* [text](url)) ──────────
export function InlineMd({ text, theme = EDITORIAL_MD }: { text: string; theme?: NoteMdTheme }) {
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
      if (mm) out.push(<a key={i++} href={mm[2]} target="_blank" rel="noreferrer" style={{ color: theme.primary, textDecoration: 'underline' }}>{mm[1]}</a>);
    }
    last = m.index + t.length;
  }
  if (last < s.length) out.push(<span key={i++}>{s.slice(last)}</span>);
  return <>{out}</>;
}

// ── 본문 렌더러 ─────────────────────────────────────────────
// 마크다운을 블록(성경박스/라벨/리스트/번호/핵심문장/사진/문단)으로 변환.
export function NoteBody({ md, fs = 1, theme = EDITORIAL_MD }: { md: string; fs?: number; theme?: NoteMdTheme }) {
  const SERIF = theme.bodyStyle;
  const HEAD = theme.headingStyle ?? theme.bodyStyle;
  const r = theme.radius;
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const at = (j: number) => lines[j] ?? '';
  const HR = /^(-{3,}|\*{3,}|_{3,})$/;
  // 본문 중간 사진 — 한 줄이 통째로 ![캡션](주소) 일 때만 이미지로 본다.
  // 문장 안에 섞인 경우까지 처리하면 InlineMd 와 규칙이 겹쳐 오히려 깨진다.
  const IMG_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
  const OL = /^\d+[.)]\s+/;
  const BULLET = (t: string) => /^[-*]\s+/.test(t);

  while (i < lines.length) {
    const t = at(i).trim();
    if (!t) { i++; continue; }

    // 구분선
    if (HR.test(t)) { out.push(<hr key={key++} style={{ border: 'none', borderTop: `1px solid ${theme.rule}`, margin: '26px 0' }} />); i++; continue; }

    // 본문 사진 — 원본 비율 그대로. 노트에 들어가는 사진은 도표·악보·사진이
    // 섞여 있어 고정 비율로 자르면 내용이 잘린다.
    const img = IMG_LINE.exec(t);
    if (img) {
      const caption = (img[1] ?? '').trim();
      out.push(
        <figure key={key++} style={{ margin: '26px 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img[2]}
            alt={caption}
            style={{ display: 'block', width: '100%', height: 'auto', background: theme.surface, borderRadius: r || undefined }}
            loading="lazy"
          />
          {caption && (
            <figcaption style={{ margin: '8px 0 0', fontSize: z(13, fs), lineHeight: 1.7, color: theme.muted }}>
              {caption}
            </figcaption>
          )}
        </figure>,
      );
      i++; continue;
    }

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
        <blockquote
          key={key++}
          style={{
            margin: '26px 0 0', padding: '20px 22px', background: theme.surface,
            borderRadius: r ? (theme.quoteAccent ? `0 ${r}px ${r}px 0` : `${r}px`) : undefined,
            borderLeft: theme.quoteAccent ? `3px solid ${theme.quoteAccent}` : undefined,
          }}
        >
          {ref && <p style={{ margin: 0, fontSize: z(12, fs), fontWeight: 700, letterSpacing: '.1em', color: theme.secondary }}>{ref}</p>}
          {verses.length > 0 && (
            <div style={{ marginTop: ref ? 10 : 0, display: 'grid', gap: 8 }}>
              {verses.map((v, k) => (
                <p key={k} style={{ ...SERIF, margin: 0, fontSize: z(16, fs), lineHeight: 1.95, color: theme.text, textWrap: 'pretty' as const }}><InlineMd text={v} theme={theme} /></p>
              ))}
            </div>
          )}
        </blockquote>,
      );
      continue;
    }

    // 라벨 (### 소제목)
    if (t.startsWith('### ')) {
      out.push(<p key={key++} style={{ margin: '36px 0 0', fontSize: z(12, fs), fontWeight: 700, letterSpacing: '.14em', color: theme.primary }}><InlineMd text={t.slice(4)} theme={theme} /></p>);
      i++; continue;
    }
    // 소제목보다 상위(# / ##)는 섹션 안에서 강조 헤딩으로
    if (t.startsWith('# ') || t.startsWith('## ')) {
      out.push(<p key={key++} style={{ ...HEAD, margin: '30px 0 0', fontSize: z(21, fs), fontWeight: 600, lineHeight: 1.5, color: theme.text }}><InlineMd text={t.replace(/^#{1,2}\s+/, '')} theme={theme} /></p>);
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
            <div key={k} style={{ marginTop: k === 0 ? 0 : 20, paddingTop: 18, borderTop: `1px solid ${theme.rule}`, display: 'flex', gap: 16 }}>
              <span style={{ ...SERIF, flex: 'none', width: 24, fontSize: z(15, fs), color: theme.faint }}>{it.no}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...SERIF, margin: 0, fontSize: z(18, fs), fontWeight: 600, lineHeight: 1.75, color: theme.text, textWrap: 'pretty' as const }}><InlineMd text={it.text} theme={theme} /></p>
                {it.subs.length > 0 && (
                  <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                    {it.subs.map((s, j) => (
                      <li key={j} style={{ fontSize: z(15, fs), lineHeight: 1.85, color: theme.muted }}><InlineMd text={s} theme={theme} /></li>
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
            <li key={k} style={{ ...SERIF, display: 'flex', gap: 12, fontSize: z(17, fs), lineHeight: 1.9, color: theme.text }}>
              <span style={{ flex: 'none', color: theme.marker }}>—</span>
              <span style={{ minWidth: 0 }}><InlineMd text={l} theme={theme} /></span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // 핵심 문장 (한 줄 전체 **...**)
    if (isKeyLine(t)) {
      out.push(<p key={key++} style={{ ...SERIF, margin: '14px 0 0', fontSize: `clamp(${z(19, fs)}px, ${(2.2 * fs).toFixed(2)}vw, ${z(22, fs)}px)`, fontWeight: 600, lineHeight: 1.7, color: theme.text, textWrap: 'pretty' as const }}><InlineMd text={t.slice(2, -2)} theme={theme} /></p>);
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
      <p key={key++} style={{ ...SERIF, margin: '12px 0 0', fontSize: z(theme.bodySize, fs), lineHeight: theme.bodyLine, color: theme.text, textWrap: 'pretty' as const }}>
        {para.map((l, k) => <span key={k}>{k > 0 && <br />}<InlineMd text={l} theme={theme} /></span>)}
      </p>,
    );
  }
  return <>{out}</>;
}
