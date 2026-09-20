'use client';

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

// 온라인 주보 스토어프론트 뷰(클라이언트) — 한/영 토글 담당.
// 예배순서·찬양 가사·대표기도·교회소식·성경 본문(개역개정/ESV)·설교 노트·어린이 설교 노트
// ·기도 제목·소그룹 질문이 한/영 병기 시 토글로 전환(영어 없으면 한국어 폴백).
// 모든 화면: 섹션을 좌우로 넘기는 가로 페이저(CSS scroll-snap x) + 각 패널 세로 스크롤.
//   모바일: 스와이프 + 좌측 상단 페이지 번호. PC·태블릿(≥768px): 좌우 화살표 버튼 + 번호.
//   첫 페이지(헤더)는 세로 중앙 정렬. 찬양/카툰 이미지는 한 장씩 + 썸네일(ImageViewer).
// 한/영 토글은 상단 우측 고정. 서버(OnlineBulletinBlock)가 fetch 한 bulletin(plain JSON)을 받음.

interface Hymn { title?: string; hymnNo?: string; imageUrls?: string[]; note?: string; lyrics?: string; lyricsEn?: string }

const muted = 'var(--brand-muted, #6b7280)';
const border = 'var(--border, rgba(0,0,0,0.08))';
const primary = 'var(--dw-primary, #1466d6)';
const textColor = 'var(--dw-text, #16181d)';

export function OnlineBulletinView({ bulletin }: { bulletin: Record<string, any> }) {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [mounted, setMounted] = useState(false);
  const [toggleTop, setToggleTop] = useState(64); // 사이트 헤더 아래로 토글을 내리는 실측값(px)
  const [headerH, setHeaderH] = useState(56);     // 사이트 헤더 높이(px) — 패널 상단 여백용
  const pagerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);            // 현재 가로 페이지(섹션) 인덱스
  const en = lang === 'en';

  // 사이트 헤더(sticky/fixed)의 실제 높이를 재서 토글이 헤더에 가리지 않게 top 을 잡는다.
  // 헤더 변형(유틸바/센터드/라이브배너)마다 높이가 달라 하드코딩 대신 측정.
  useEffect(() => {
    setMounted(true);
    const measure = () => {
      let bottom = 0;
      for (const el of Array.from(document.querySelectorAll('header')) as HTMLElement[]) {
        const pos = getComputedStyle(el).position;
        if (pos !== 'sticky' && pos !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top <= 4) bottom = Math.max(bottom, r.bottom);
      }
      const hb = Math.round(bottom || 52);
      setHeaderH(hb);
      setToggleTop(hb + 8);
    };
    measure();
    let raf = 0;
    const onChange = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onChange); window.removeEventListener('scroll', onChange); };
  }, []);

  // 가로 페이저 현재 인덱스 추적(상단 번호·화살표용).
  useEffect(() => {
    const el = pagerRef.current;
    if (!el) return;
    const onScroll = () => { setPage(Math.round(el.scrollLeft / (el.clientWidth || 1))); };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  const goPage = (i: number) => {
    const el = pagerRef.current;
    if (!el) return;
    const max = el.children.length - 1;
    el.scrollTo({ left: Math.max(0, Math.min(i, max)) * el.clientWidth, behavior: 'smooth' });
  };

  const content = (bulletin.content ?? {}) as Record<string, any>;
  const serviceDate = bulletin.serviceDate ? String(bulletin.serviceDate).slice(0, 10) : '';
  const worshipOrder = Array.isArray(content.worshipOrder) ? content.worshipOrder : [];
  const hymns = Array.isArray(content.hymns) ? (content.hymns as Hymn[]) : [];
  const prayers = Array.isArray(content.prayerRequests) ? content.prayerRequests : [];
  const anns = Array.isArray(content.announcements) ? content.announcements : [];
  const study = content.study ?? {};
  const rp = content.representativePrayer ?? {};
  const scripture = content.scripture ?? {};
  const sermonNote = content.sermonNote ?? {};
  const childrenSermonNote = content.childrenSermonNote ?? {};
  const childrenCartoon = content.childrenCartoon ?? {};
  const closing: Hymn = content.closingHymn ?? {};

  // ── bilingual pickers ──
  const pick = (ko?: string, enVal?: string) => (en && (enVal || '').trim() ? enVal! : (ko || ''));
  const mergeEn = (ko?: string[], enArr?: string[]): string[] =>
    (ko ?? []).map((k, i) => {
      const e = enArr?.[i];
      return en && (e || '').trim() ? (e as string) : k;
    });

  const scRef = pick(scripture.reference, scripture.referenceEn);
  const scText = pick(scripture.text, scripture.textEn);
  const snText = pick(sermonNote.text, sermonNote.textEn);
  const snChildText = pick(childrenSermonNote.text, childrenSermonNote.textEn);

  // 어린이 카툰 — 영어 이미지가 있고 English 모드면 영어 카툰, 아니면 한국어 카툰(폴백).
  const cartoonKo: string[] = Array.isArray(childrenCartoon.imageUrls) ? childrenCartoon.imageUrls : [];
  const cartoonEn: string[] = Array.isArray(childrenCartoon.imageUrlsEn) ? childrenCartoon.imageUrlsEn : [];
  const cartoonImgs = en && cartoonEn.length > 0 ? cartoonEn : cartoonKo;
  const cartoonCaption = pick(childrenCartoon.caption, childrenCartoon.captionEn);
  const hasCartoon = cartoonKo.length > 0 || cartoonEn.length > 0;

  const anyEn = (...vals: (string | undefined)[]) => vals.some((v) => (v || '').trim());
  const hasEnglish = !!(
    (scripture.textEn && scripture.textEn.trim()) ||
    (scripture.referenceEn && scripture.referenceEn.trim()) ||
    (sermonNote.textEn && sermonNote.textEn.trim()) ||
    (childrenSermonNote.textEn && childrenSermonNote.textEn.trim()) ||
    cartoonEn.length > 0 ||
    worshipOrder.some((r: any) => anyEn(r.labelEn, r.detailEn, r.personEn)) ||
    hymns.some((h) => anyEn(h.lyricsEn)) || anyEn(closing.lyricsEn) ||
    anyEn(rp.contentEn, rp.personEn) ||
    anns.some((a: any) => anyEn(a.titleEn, a.bodyEn)) ||
    prayers.some((p: any) => (p.titleEn && p.titleEn.trim()) || (p.detailEn && p.detailEn.trim())) ||
    ['observation', 'correlation', 'application'].some(
      (k) => Array.isArray(study[`${k}En`]) && study[`${k}En`].some((q: string) => (q || '').trim()),
    )
  );

  const hasStudy = ['observation', 'correlation', 'application'].some(
    (k) => Array.isArray(study[k]) && study[k].some((q: string) => (q || '').trim()),
  );
  const noteHas = (nt: any) => !!((nt.text && nt.text.trim()) || (nt.textEn && nt.textEn.trim()) || (nt.title && nt.title.trim()));
  const hasSermon = noteHas(sermonNote);
  const hasChildSermon = noteHas(childrenSermonNote);

  // 표시될 섹션만 모아 순번(1..N)을 매긴다.
  const items: { visible: boolean; render: (n: number) => ReactNode }[] = [
    // 1. 예배 순서
    {
      visible: worshipOrder.length > 0,
      render: (n) => (
        <Section key="wo" n={n} title="예배 순서">
          <div className="divide-y" style={{ borderColor: 'var(--border, rgba(0,0,0,0.06))' }}>
            {worshipOrder.map((r: any, i: number) => {
              const label = pick(r.label, r.labelEn);
              const detail = pick(r.detail, r.detailEn);
              const person = pick(r.person, r.personEn);
              return (
                <div key={i} className="flex gap-3 py-2.5 items-baseline">
                  <div className="shrink-0 font-semibold text-left" style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: label }} />
                  <div className="flex-1 min-w-0 text-right" style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: detail }} />
                  {person && <div className="shrink-0 text-right" style={{ color: muted, fontSize: 'var(--fs-sm,14px)' }} dangerouslySetInnerHTML={{ __html: person }} />}
                </div>
              );
            })}
          </div>
        </Section>
      ),
    },
    // 2. 찬양 악보
    {
      visible: hymns.some((h) => (h.imageUrls?.length ?? 0) > 0 || h.title || (h.lyrics || '').trim()),
      render: (n) => (
        <Section key="hymns" n={n} title="찬양 악보">
          <div className="space-y-8">
            {hymns.map((h, i) => <HymnItem key={i} h={h} en={en} />)}
          </div>
        </Section>
      ),
    },
    // 3. 대표기도
    {
      visible: !!(rp.person || rp.content),
      render: (n) => (
        <Section key="rp" n={n} title="대표기도">
          {pick(rp.person, rp.personEn) && <p className="font-semibold" style={{ color: textColor }}>{pick(rp.person, rp.personEn)}</p>}
          {pick(rp.content, rp.contentEn) && <p className="mt-1 whitespace-pre-line" style={{ color: textColor, lineHeight: 1.8 }}>{pick(rp.content, rp.contentEn)}</p>}
        </Section>
      ),
    },
    // 4. 교회소식 (구 주일광고 — 대표기도 다음)
    {
      visible: anns.length > 0,
      render: (n) => (
        <Section key="anns" n={n} title="교회소식">
          <div className="space-y-4">
            {anns.map((a: any, i: number) => {
              const title = pick(a.title, a.titleEn);
              const body = pick(a.body, a.bodyEn);
              return (
                <div key={i} className="rounded-lg p-4" style={{ background: 'var(--dw-surface, #f7f8fa)', border: `1px solid var(--border, rgba(0,0,0,0.06))` }}>
                  {title && <p className="font-semibold" style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: title }} />}
                  {body && <p className="mt-1 whitespace-pre-line" style={{ color: 'var(--brand-muted, #4b5563)', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: body }} />}
                </div>
              );
            })}
          </div>
        </Section>
      ),
    },
    // 5. 성경 본문 (개역개정 / ESV)
    {
      visible: !!(scripture.reference || scripture.text || scripture.textEn),
      render: (n) => (
        <Section key="sc" n={n} title="성경 본문">
          {scRef && <p className="mb-2 font-semibold" style={{ color: primary }}>{scRef}</p>}
          {scText && <p className="whitespace-pre-line" style={{ color: textColor, lineHeight: 1.9 }}>{scText}</p>}
        </Section>
      ),
    },
    // 6. 설교 노트 (성경 본문 아래)
    {
      visible: hasSermon,
      render: (n) => (
        <Section key="sn" n={n} title="설교 노트">
          {sermonNote.title && <p className="mb-3 font-extrabold" style={{ color: textColor, fontSize: 'var(--brand-h3, 22px)', fontFamily: 'var(--brand-font-heading)' }}>{sermonNote.title}</p>}
          <Markdown text={snText} />
        </Section>
      ),
    },
    // 7. 어린이 설교 노트
    {
      visible: hasChildSermon,
      render: (n) => (
        <Section key="csn" n={n} title="어린이 설교 노트">
          {childrenSermonNote.title && <p className="mb-3 font-extrabold" style={{ color: textColor, fontSize: 'var(--brand-h3, 22px)', fontFamily: 'var(--brand-font-heading)' }}>{childrenSermonNote.title}</p>}
          <Markdown text={snChildText} />
        </Section>
      ),
    },
    // 8. 어린이 설교 카툰 (어린이 설교 노트 아래)
    {
      visible: hasCartoon,
      render: (n) => (
        <Section key="cartoon" n={n} title="어린이 설교 카툰">
          <ImageViewer images={cartoonImgs} alt={cartoonCaption || '어린이 설교 카툰'} />
          {cartoonCaption && <p className="mt-3 text-center text-sm" style={{ color: muted }}>{cartoonCaption}</p>}
        </Section>
      ),
    },
    // 9. 기도 제목
    {
      visible: prayers.length > 0,
      render: (n) => (
        <Section key="pr" n={n} title="기도 제목">
          <ul className="space-y-2">
            {prayers.map((p: any, i: number) => {
              const title = pick(p.title, p.titleEn);
              const detail = pick(p.detail, p.detailEn);
              return (
                <li key={i} className="flex gap-2">
                  <span style={{ color: primary }}>•</span>
                  <span style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: `${title ? `<b>${title}</b>` : ''}${title && detail ? ' — ' : ''}${detail}` }} />
                </li>
              );
            })}
          </ul>
        </Section>
      ),
    },
    // 8. 마지막 찬양
    {
      visible: !!(closing.title || (closing.imageUrls?.length ?? 0) > 0 || (closing.lyrics || '').trim()),
      render: (n) => (
        <Section key="ch" n={n} title="마지막 찬양">
          <HymnItem h={closing} en={en} />
        </Section>
      ),
    },
    // 9. 소그룹 나눔 질문
    {
      visible: hasStudy,
      render: (n) => (
        <Section key="study" n={n} title="소그룹 나눔 질문" eyebrow="이번 주 소그룹에서 함께 나눠요">
          <div className="space-y-6">
            <QuestionGroup label="관찰" items={mergeEn(study.observation, study.observationEn)} />
            <QuestionGroup label="상관" items={mergeEn(study.correlation, study.correlationEn)} />
            <QuestionGroup label="적용" items={mergeEn(study.application, study.applicationEn)} />
          </div>
        </Section>
      ),
    },
  ];

  const visible = items.filter((it) => it.visible);
  const pageCount = visible.length + 1; // 헤더 패널 + 섹션들

  // 헤더 중복 제거: 제목에 이미 예배명/날짜가 들어 있으면 별도 표기 생략.
  const bTitle = String(bulletin.title ?? '');
  const showServiceTitle = !!content.serviceTitle && !bTitle.includes(content.serviceTitle);
  const [dy, dm, dd] = serviceDate ? serviceDate.split('-') : [];
  const titleHasDate = !!dy && !!dm && !!dd && bTitle.includes(dy) && bTitle.includes(String(Number(dm))) && bTitle.includes(String(Number(dd)));
  const showDate = !!serviceDate && !titleHasDate;

  return (
    <div className="mx-auto max-w-3xl" style={{ color: textColor }}>
      <style>{HPAGER_CSS}</style>

      {/* 한/영 토글 — 화면 우측 상단 고정(portal). */}
      {hasEnglish && mounted && createPortal(
        <div style={{ position: 'fixed', top: toggleTop, right: 12, zIndex: 60 }}>
          <div className="inline-flex rounded-full overflow-hidden shadow-md" style={{ border: `1px solid ${primary}`, background: 'var(--dw-background, #fff)' }}>
            <button type="button" aria-label="한국어" aria-pressed={!en} onClick={() => setLang('ko')} style={tabStyle(!en)}>한</button>
            <button type="button" aria-label="English" aria-pressed={en} onClick={() => setLang('en')} style={tabStyle(en)}>EN</button>
          </div>
        </div>,
        document.body,
      )}

      {/* 상단 좌측 페이지 번호(현재/전체) — 모든 화면 */}
      {mounted && pageCount > 1 && createPortal(
        <div style={{ position: 'fixed', top: toggleTop, left: 12, zIndex: 60, padding: '5px 12px', borderRadius: 999, background: 'var(--dw-background, #fff)', border: `1px solid ${primary}`, color: primary, fontSize: 13, fontWeight: 800, boxShadow: '0 4px 14px rgba(0,0,0,.10)', fontVariantNumeric: 'tabular-nums' }}>
          {page + 1} / {pageCount}
        </div>,
        document.body,
      )}

      {/* 좌우 넘김 화살표 — PC·태블릿만(모바일은 CSS로 숨김, 스와이프 사용) */}
      {mounted && pageCount > 1 && createPortal(
        <>
          <button type="button" aria-label="이전 섹션" className="ob-arrow" onClick={() => goPage(page - 1)} disabled={page <= 0} style={navBtn('left', page <= 0)}>‹</button>
          <button type="button" aria-label="다음 섹션" className="ob-arrow" onClick={() => goPage(page + 1)} disabled={page >= pageCount - 1} style={navBtn('right', page >= pageCount - 1)}>›</button>
        </>,
        document.body,
      )}

      <div className="ob-hpager" ref={pagerRef} style={{ ['--ob-top' as string]: `${headerH}px` } as CSSProperties}>
      {/* Header (첫 페이지: 세로 중앙 정렬) */}
      <header className="text-center pb-8 border-b" style={{ borderColor: border }}>
        {showServiceTitle && (
          <div style={{ color: primary, fontWeight: 800, letterSpacing: '0.05em', fontSize: 'var(--fs-sm, 14px)' }}>
            {content.serviceTitle}
          </div>
        )}
        <h1 style={{ fontSize: 'var(--brand-h2, 30px)', fontWeight: 800, fontFamily: 'var(--brand-font-heading)', marginTop: showServiceTitle ? 8 : 0 }}>
          {bTitle}
        </h1>
        {(showDate || content.presider) && (
          <div className="mt-2 flex items-center justify-center gap-3" style={{ color: muted, fontSize: 'var(--fs-sm, 14px)' }}>
            {showDate && <span>{serviceDate}</span>}
            {content.presider && <span>{showDate ? '· ' : ''}인도 {content.presider}</span>}
          </div>
        )}
      </header>

      {visible.map((it, i) => it.render(i + 1))}
      </div>
    </div>
  );
}

function navBtn(side: 'left' | 'right', disabled: boolean): CSSProperties {
  return {
    position: 'fixed', top: '50%', [side]: 12, transform: 'translateY(-50%)', zIndex: 60,
    width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 999,
    background: 'var(--dw-background, #fff)', border: `1px solid ${primary}`, color: primary,
    fontSize: 26, lineHeight: 1, paddingBottom: 3,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
    boxShadow: '0 4px 14px rgba(0,0,0,.12)',
  } as CSSProperties;
}

function tabStyle(on: boolean): CSSProperties {
  return {
    padding: '7px 15px',
    minWidth: 42,
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.3,
    cursor: 'pointer',
    border: 'none',
    background: on ? primary : 'transparent',
    color: on ? '#fff' : primary,
  };
}

// 모바일·태블릿(≤1024px): 섹션을 "옆으로" 넘기는 가로 페이저 + 각 패널 안에서 세로 스크롤.
//   패널 상단 여백(--ob-top = 사이트 헤더 높이)으로 섹션 제목이 헤더에 가리지 않게 한다.
//   데스크톱(>1024px): 규칙 없음 = 기존 세로 연속 스크롤.
const HPAGER_CSS = `
.ob-hpager {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  height: 100svh;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ob-hpager::-webkit-scrollbar { display: none; }
.ob-hpager > * {
  flex: 0 0 100%;
  width: 100%;
  height: 100svh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  padding-left: 16px;
  padding-right: 16px;
  padding-top: calc(var(--ob-top, 56px) + 12px);
  padding-bottom: 40px;
}
/* 첫 페이지(헤더 패널)는 세로 가운데 정렬 */
.ob-hpager > header {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
/* 모바일은 스와이프로 넘김 → 화살표 숨김. PC·태블릿(≥768px)만 표시 */
@media (max-width: 767px) { .ob-arrow { display: none !important; } }
`;

function Section({ n, title, eyebrow, children }: { n: number; title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="py-8 border-b last:border-0" style={{ borderColor: 'var(--border, rgba(0,0,0,0.06))' }}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid place-items-center rounded-full text-white text-sm font-bold shrink-0" style={{ width: 26, height: 26, background: primary }}>{n}</span>
        <h2 style={{ fontSize: 'var(--brand-h3, 22px)', fontWeight: 800, fontFamily: 'var(--brand-font-heading)', color: textColor }}>{title}</h2>
      </div>
      {eyebrow && <p className="-mt-2 mb-4 text-sm" style={{ color: muted }}>{eyebrow}</p>}
      {children}
    </section>
  );
}

// 한 화면에 이미지 한 장 + 작은 썸네일 버튼으로 전환(찬양 악보·어린이 카툰용).
function ImageViewer({ images, alt }: { images: string[]; alt: string }) {
  const list = (images ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  if (list.length === 0) return null;
  const active = Math.min(idx, list.length - 1);
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={list[active]} alt={alt} className="w-full rounded-xl" style={{ border: `1px solid var(--border, rgba(0,0,0,0.06))` }} loading="lazy" />
      {list.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {list.map((u, k) => {
            const on = k === active;
            return (
              <button key={k} type="button" onClick={() => setIdx(k)} aria-label={`${alt} ${k + 1}`} aria-current={on}
                style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', padding: 0, cursor: 'pointer', background: 'none', border: on ? `2px solid ${primary}` : `1px solid ${border}`, boxShadow: on ? '0 2px 8px rgba(0,0,0,.12)' : 'none', flex: '0 0 auto' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HymnItem({ h, en }: { h: Hymn; en: boolean }) {
  const imgs = h.imageUrls ?? [];
  const lyrics = en && (h.lyricsEn || '').trim() ? h.lyricsEn : h.lyrics;
  return (
    <div>
      {(h.title || h.hymnNo) && (
        <div className="mb-2 font-semibold" style={{ color: textColor }}>
          {h.hymnNo && <span style={{ color: primary }}>{h.hymnNo} </span>}{h.title}
        </div>
      )}
      {imgs.length > 0 && <ImageViewer images={imgs} alt={h.title || '악보'} />}
      {(lyrics || '').trim() && (
        <div className="mt-3 whitespace-pre-line" style={{ color: textColor, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: lyrics || '' }} />
      )}
      {h.note && <p className="mt-2 text-sm" style={{ color: muted }} dangerouslySetInnerHTML={{ __html: h.note }} />}
    </div>
  );
}

function QuestionGroup({ label, items }: { label: string; items?: string[] }) {
  const list = (items ?? []).filter((q) => (q || '').trim());
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: 'var(--dw-surface, #f7f8fa)', color: primary }}>{label}</p>
      <ol className="space-y-2">
        {list.map((q, i) => (
          <li key={i} className="flex gap-2" style={{ color: textColor, lineHeight: 1.7 }}>
            <span className="shrink-0" style={{ color: 'var(--brand-muted, #9ca3af)' }}>{i + 1}.</span>
            <span className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: q }} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── mini markdown (설교 노트 서식: # 제목, ## 소제목, **강조**, - 불릿, > 인용) ── */
function InlineMd({ text }: { text: string }) {
  const parts = (text ?? '').split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Markdown({ text }: { text?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const HR = /^(-{3,}|\*{3,}|_{3,})$/;
  const OL = /^\d+\.\s+/;
  const at = (j: number) => lines[j] ?? '';
  const isSpecial = (t: string) =>
    t.startsWith('#') || t.startsWith('> ') || t.startsWith('- ') || t.startsWith('* ') || HR.test(t) || OL.test(t);
  while (i < lines.length) {
    const t = at(i).trim();
    if (!t) { i++; continue; }
    if (HR.test(t)) { out.push(<hr key={key++} style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '22px 0' }} />); i++; continue; }
    if (t.startsWith('# ')) { out.push(<h3 key={key++} style={{ fontSize: 'var(--brand-h3, 22px)', fontWeight: 800, fontFamily: 'var(--brand-font-heading)', color: textColor, margin: '18px 0 10px' }}><InlineMd text={t.slice(2)} /></h3>); i++; continue; }
    if (t.startsWith('## ')) { out.push(<h4 key={key++} style={{ fontSize: '19px', fontWeight: 800, color: textColor, margin: '20px 0 8px' }}><InlineMd text={t.slice(3)} /></h4>); i++; continue; }
    if (t.startsWith('### ')) { out.push(<h5 key={key++} style={{ fontSize: '16px', fontWeight: 700, color: primary, margin: '16px 0 6px' }}><InlineMd text={t.slice(4)} /></h5>); i++; continue; }
    if (t.startsWith('> ')) {
      const q: string[] = [];
      while (i < lines.length && at(i).trim().startsWith('> ')) { q.push(at(i).trim().slice(2)); i++; }
      out.push(
        <blockquote key={key++} style={{ borderLeft: `3px solid ${primary}`, paddingLeft: 14, margin: '10px 0', color: 'var(--brand-muted, #4b5563)', lineHeight: 1.8 }}>
          {q.map((l, k) => <div key={k}><InlineMd text={l} /></div>)}
        </blockquote>,
      );
      continue;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const li: string[] = [];
      while (i < lines.length && (at(i).trim().startsWith('- ') || at(i).trim().startsWith('* '))) { li.push(at(i).trim().slice(2)); i++; }
      out.push(
        <ul key={key++} className="list-disc pl-5 space-y-1" style={{ margin: '8px 0', color: textColor, lineHeight: 1.8 }}>
          {li.map((l, k) => <li key={k}><InlineMd text={l} /></li>)}
        </ul>,
      );
      continue;
    }
    if (OL.test(t)) {
      const li: string[] = [];
      while (i < lines.length && OL.test(at(i).trim())) { li.push(at(i).trim().replace(OL, '')); i++; }
      out.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1" style={{ margin: '8px 0', color: textColor, lineHeight: 1.8 }}>
          {li.map((l, k) => <li key={k}><InlineMd text={l} /></li>)}
        </ol>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length) {
      const lt = at(i).trim();
      if (!lt || isSpecial(lt)) break;
      para.push(lt); i++;
    }
    out.push(
      <p key={key++} style={{ margin: '8px 0', color: textColor, lineHeight: 1.85 }}>
        {para.map((l, k) => <span key={k}>{k > 0 && <br />}<InlineMd text={l} /></span>)}
      </p>,
    );
  }
  return <>{out}</>;
}
