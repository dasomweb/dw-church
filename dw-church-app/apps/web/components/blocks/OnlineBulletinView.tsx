'use client';

import { useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

// 온라인 주보 스토어프론트 뷰 — Claude Design "온라인 주보 개선안 v2" 반영.
// 한 번에 한 섹션만 표시(나머지 숨김) — 상단 현재섹션(목차 바텀시트)·진행바·"다음 섹션" 버튼으로 전환.
// 설교 노트 회중 탭 + 아코디언. 찬양/마지막찬양은 곡별 [악보|가사] 세그먼트 토글 카드.
// 글자크기 순환 + 한/영 토글 + 이미지 전체화면 뷰어. 색은 테넌트 테마 토큰(--dw-*)로 구동.

interface Hymn { title?: string; hymnNo?: string; imageUrls?: string[]; note?: string; lyrics?: string; lyricsEn?: string }

const muted = 'var(--brand-muted, #61697a)';
const border = 'var(--border, #e5e7eb)';
const faint = 'var(--border, #eceff3)';
const primary = 'var(--dw-primary, #1466d6)';
const textColor = 'var(--dw-text, #16181d)';
const surface = 'var(--dw-surface, #f7f8fa)';
const bg = 'var(--dw-background, #ffffff)';

const html = (s?: string) => ({ dangerouslySetInnerHTML: { __html: s || '' } });

export function OnlineBulletinView({ bulletin }: { bulletin: Record<string, any> }) {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [mounted, setMounted] = useState(false);
  const [headerH, setHeaderH] = useState(0);      // 사이트 헤더 높이(상단바 sticky 오프셋)
  const [active, setActive] = useState(0);        // 현재 섹션 index
  const [fontScale, setFontScale] = useState(100);
  const [toc, setToc] = useState(false);          // 목차 바텀시트
  const [viewer, setViewer] = useState<{ imgs: string[]; i: number; title: string } | null>(null);
  const en = lang === 'en';

  // 사이트 헤더 높이 실측(상단바를 그 아래에 sticky).
  useEffect(() => {
    setMounted(true);
    try { const v = Number(localStorage.getItem('ob-fs')); if (v >= 100 && v <= 170) setFontScale(v); } catch { /* ignore */ }
    const measure = () => {
      let hb = 0;
      for (const el of Array.from(document.querySelectorAll('header')) as HTMLElement[]) {
        const pos = getComputedStyle(el).position;
        if (pos !== 'sticky' && pos !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top <= 4) hb = Math.max(hb, r.bottom);
      }
      setHeaderH(Math.round(hb));
    };
    measure();
    let raf = 0;
    const onChange = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onChange); window.removeEventListener('scroll', onChange); };
  }, []);

  const setFs = (v: number) => {
    setFontScale(v);
    try { localStorage.setItem('ob-fs', String(v)); } catch { /* ignore */ }
  };
  const FS_LEVELS = [100, 120, 140];
  const cycleFs = () => { const idx = FS_LEVELS.indexOf(fontScale); setFs(FS_LEVELS[(idx + 1) % FS_LEVELS.length] ?? 100); };

  // v2: 한 번에 한 섹션만 표시. 이동은 목차/진행바/다음버튼으로 active 를 바꾼다(스크롤 추적 없음).
  const jump = (i: number) => {
    setToc(false);
    setActive(Math.max(0, i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const jumpToTitle = (title: string) => {
    const secs = Array.from(document.querySelectorAll('[data-obsec]')) as HTMLElement[];
    const idx = secs.findIndex((s) => (s.querySelector('h2')?.textContent || '').trim() === title);
    if (idx >= 0) jump(idx);
  };
  const openViewer = (imgs: string[], i: number, title: string) => setViewer({ imgs: imgs.filter(Boolean), i, title });

  // ── data ──
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

  const pick = (ko?: string, enVal?: string) => (en && (enVal || '').trim() ? enVal! : (ko || ''));
  const mergeEn = (ko?: string[], enArr?: string[]): string[] =>
    (ko ?? []).map((k, i) => { const e = enArr?.[i]; return en && (e || '').trim() ? (e as string) : k; });

  const scRef = pick(scripture.reference, scripture.referenceEn);
  const scText = pick(scripture.text, scripture.textEn);
  const snText = pick(sermonNote.text, sermonNote.textEn);
  const snChildText = pick(childrenSermonNote.text, childrenSermonNote.textEn);
  const cartoonKo: string[] = Array.isArray(childrenCartoon.imageUrls) ? childrenCartoon.imageUrls : [];
  const cartoonEn: string[] = Array.isArray(childrenCartoon.imageUrlsEn) ? childrenCartoon.imageUrlsEn : [];
  const cartoonImgs = en && cartoonEn.length > 0 ? cartoonEn : cartoonKo;

  const anyEn = (...v: (string | undefined)[]) => v.some((x) => (x || '').trim());
  const hasEnglish = !!(
    anyEn(scripture.textEn, scripture.referenceEn, sermonNote.textEn, childrenSermonNote.textEn) || cartoonEn.length > 0 ||
    worshipOrder.some((r: any) => anyEn(r.labelEn, r.detailEn, r.personEn)) ||
    hymns.some((h) => anyEn(h.lyricsEn)) || anyEn(closing.lyricsEn) || anyEn(rp.contentEn, rp.personEn) ||
    anns.some((a: any) => anyEn(a.titleEn, a.bodyEn)) ||
    prayers.some((p: any) => anyEn(p.titleEn, p.detailEn)) ||
    ['observation', 'correlation', 'application'].some((k) => Array.isArray(study[`${k}En`]) && study[`${k}En`].some((q: string) => (q || '').trim()))
  );

  const hasStudy = ['observation', 'correlation', 'application'].some((k) => Array.isArray(study[k]) && study[k].some((q: string) => (q || '').trim()));
  const noteHas = (nt: any) => !!((nt.text && nt.text.trim()) || (nt.textEn && nt.textEn.trim()) || (nt.title && nt.title.trim()));

  // 예배 순서 → 섹션 매핑(라벨 키워드 기반). 존재하는 섹션에만 링크.
  const has: Record<string, boolean> = {
    '찬양 악보': hymns.some((h) => (h.imageUrls?.length ?? 0) > 0 || !!h.title || (h.lyrics || '').trim().length > 0),
    '대표기도': !!(rp.person || rp.content || rp.personEn || rp.contentEn),
    '교회소식': anns.length > 0,
    '성경 본문': !!(scRef || scText),
    '설교 노트': noteHas(sermonNote),
    '어린이 설교 노트': noteHas(childrenSermonNote),
    '기도 제목': prayers.length > 0,
    '마지막 찬양': !!(closing.title || (closing.imageUrls?.length ?? 0) > 0 || (closing.lyrics || '').trim()),
  };
  const orderTarget = (label: string): string | null => {
    const l = label || '';
    if (l.includes('설교')) return '설교 노트';
    if (l.includes('성경') || l.includes('봉독')) return '성경 본문';
    if (l.includes('대표기도')) return '대표기도';
    if (l.includes('광고') || l.includes('소식')) return '교회소식';
    if (l.includes('마지막') && (l.includes('찬양') || l.includes('찬송'))) return '마지막 찬양';
    if (l.includes('찬양') || l.includes('찬송') || l.includes('경배')) return '찬양 악보';
    if (l.includes('기도')) return '대표기도';
    return null;
  };

  // ── build visible sections ──
  const items: { title: string; node: ReactNode }[] = [];
  const push = (title: string, node: ReactNode) => items.push({ title, node });

  if (worshipOrder.length > 0) push('예배 순서', (
    <div>
      <p className="text-sm" style={{ color: muted, margin: '0 0 10px' }}>순서를 누르면 해당 섹션으로 이동합니다</p>
      {worshipOrder.map((r: any, i: number) => {
        const target = orderTarget(r.label || '');
        const linked = !!(target && has[target]);
        return (
          <div key={i} onClick={linked ? () => jumpToTitle(target!) : undefined} className="flex gap-3 py-3 items-baseline" style={{ borderBottom: `1px solid ${faint}`, cursor: linked ? 'pointer' : 'default' }}>
            <span className="shrink-0 font-semibold" style={{ color: linked ? primary : textColor }} {...html(pick(r.label, r.labelEn))} />
            <span className="flex-1 min-w-0 text-right" style={{ color: textColor }} {...html(pick(r.detail, r.detailEn))} />
            {(r.person || r.personEn) && <span className="shrink-0 text-right" style={{ color: muted, fontSize: 13 }} {...html(pick(r.person, r.personEn))} />}
            {linked && <span className="shrink-0" aria-hidden style={{ color: primary, fontSize: 13 }}>›</span>}
          </div>
        );
      })}
    </div>
  ));

  if (hymns.some((h) => (h.imageUrls?.length ?? 0) > 0 || h.title || (h.lyrics || '').trim())) push('찬양 악보', (
    <div className="space-y-3">{hymns.map((h, i) => <HymnItem key={i} h={h} en={en} onOpen={openViewer} />)}</div>
  ));

  if (rp.person || rp.content || rp.personEn || rp.contentEn) push('대표기도', (
    <div>
      {pick(rp.person, rp.personEn) && <p className="font-semibold" style={{ color: textColor, fontSize: 16 }} {...html(pick(rp.person, rp.personEn))} />}
      {pick(rp.content, rp.contentEn) && <p className="mt-1 whitespace-pre-line" style={{ color: textColor, lineHeight: 1.8 }} {...html(pick(rp.content, rp.contentEn))} />}
    </div>
  ));

  if (anns.length > 0) push('교회소식', (
    <div className="flex flex-col gap-3">
      {anns.map((a: any, i: number) => (
        <div key={i} className="flex gap-3">
          <span className="shrink-0 font-extrabold" style={{ color: primary, fontSize: 13, marginTop: 3 }}>{i + 1}</span>
          <div className="min-w-0" style={{ lineHeight: 1.7 }}>
            {pick(a.title, a.titleEn) && <span className="font-semibold" style={{ color: textColor }} {...html(pick(a.title, a.titleEn))} />}
            {pick(a.body, a.bodyEn) && <div className="whitespace-pre-line" style={{ color: pick(a.title, a.titleEn) ? muted : textColor }} {...html(pick(a.body, a.bodyEn))} />}
          </div>
        </div>
      ))}
    </div>
  ));

  if (scRef || scText) push('성경 본문', (
    <div>
      {scRef && <p className="font-bold" style={{ color: primary, fontSize: 15 }}>{scRef}</p>}
      {scText && <p className="mt-3 whitespace-pre-line" style={{ color: textColor, lineHeight: 1.9 }} {...html(scText)} />}
    </div>
  ));

  if (noteHas(sermonNote) || noteHas(childrenSermonNote) || cartoonKo.length > 0 || cartoonEn.length > 0) push('설교 노트', (
    <SermonSection
      adultTitle={sermonNote.title} adultText={snText}
      childTitle={childrenSermonNote.title} childText={snChildText}
      cartoonImgs={cartoonImgs} onOpen={openViewer}
    />
  ));

  if (prayers.length > 0) push('기도 제목', (
    <div className="flex flex-col gap-3">
      {prayers.map((p: any, i: number) => {
        const t = pick(p.title, p.titleEn); const d = pick(p.detail, p.detailEn);
        return (
          <div key={i} className="flex gap-3" style={{ lineHeight: 1.75 }}>
            <span className="shrink-0 font-extrabold" style={{ color: primary, fontSize: 13, marginTop: 3 }}>{i + 1}</span>
            <span className="min-w-0" style={{ color: textColor }} {...html(`${t ? `<b>${t}</b>` : ''}${t && d ? ' — ' : ''}${d}`)} />
          </div>
        );
      })}
    </div>
  ));

  if (closing.title || (closing.imageUrls?.length ?? 0) > 0 || (closing.lyrics || '').trim()) push('마지막 찬양', (
    <HymnItem h={closing} en={en} onOpen={openViewer} />
  ));

  if (hasStudy) push('소그룹 나눔 질문', (
    <div>
      <p className="text-sm" style={{ color: muted }}>이번 주 소그룹에서 함께 나눠요</p>
      <div className="mt-4 flex flex-col gap-4">
        <QGroup label="관찰" items={mergeEn(study.observation, study.observationEn)} />
        <QGroup label="상관" items={mergeEn(study.correlation, study.correlationEn)} />
        <QGroup label="적용" items={mergeEn(study.application, study.applicationEn)} />
      </div>
    </div>
  ));

  const bTitle = String(bulletin.title ?? '');
  const CSS = `
    .ob-wrap :where(h1,h2,h3,h4,h5,h6){ word-break:keep-all; overflow-wrap:break-word; }
    .ob-progress::-webkit-scrollbar{ display:none; }
  `;

  return (
    <div className="ob-wrap" style={{ color: textColor, background: bg }}>
      <style>{CSS}</style>

      {/* 상단바: 현재 섹션 + 컨트롤 + 진행바 */}
      {items.length > 0 && (
        <div style={{ position: 'sticky', top: headerH, zIndex: 20, background: bg, borderBottom: `1px solid ${faint}` }}>
          <div className="flex items-center gap-2" style={{ padding: '10px 14px 8px' }}>
            <button type="button" onClick={() => setToc(true)} className="flex items-center gap-2 min-w-0" style={{ flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 6, background: primary, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{String(active + 1).padStart(2, '0')}</span>
              <span className="truncate font-bold" style={{ color: textColor, fontSize: 15, letterSpacing: '-0.02em' }}>{items[active]?.title ?? ''}</span>
              <span style={{ flex: 'none', fontSize: 11, color: muted }}>▾</span>
            </button>
            <div className="flex items-center gap-1.5" style={{ flex: 'none' }}>
              <button type="button" aria-label="글자 크기" onClick={cycleFs} style={ctrlBtn}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>가</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: muted }}>{fontScale}%</span>
              </button>
              {hasEnglish && (
                <button type="button" aria-label="한국어/English 전환" aria-pressed={en} onClick={() => setLang(en ? 'ko' : 'en')} style={ctrlBtn}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: en ? muted : primary }}>한</span>
                  <span style={{ fontSize: 11, color: '#c4cbd6' }}>/</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: en ? primary : muted }}>EN</span>
                </button>
              )}
            </div>
          </div>
          <div className="ob-progress flex items-center gap-1" style={{ padding: '0 14px 9px' }}>
            {items.map((it, i) => (
              <button key={i} type="button" aria-label={it.title} onClick={() => jump(i)} style={{ flex: 1, height: 3, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: i === active ? primary : (i < active ? 'color-mix(in srgb, var(--dw-primary,#1466d6) 40%, #ffffff)' : border) }} />
            ))}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px', fontSize: `${fontScale}%` }}>
        <div style={{ padding: '22px 0 26px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: primary }}>
            {serviceDate && <span>{serviceDate.replace(/-/g, '.')}</span>} {content.serviceTitle || '주일예배'}
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: 'var(--brand-h2, 28px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.3, fontFamily: 'var(--brand-font-heading)' }}>{bTitle}</h1>
          {(sermonNote.title || content.presider) && (
            <div style={{ marginTop: 10, fontSize: 14, color: muted }}>
              {scRef && <span>{scRef}</span>}{scRef && content.presider ? ' · ' : ''}{content.presider && <span>{content.presider}</span>}
            </div>
          )}
        </div>

        {items.map((it, i) => (
          <section key={i} data-obsec={i} style={{ display: i === active ? 'block' : 'none', paddingBottom: 36 }}>
            <div className="flex items-center gap-2.5" style={{ paddingBottom: 12, borderBottom: `1px solid ${textColor}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: primary }}>{String(i + 1).padStart(2, '0')}</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: textColor, fontFamily: 'var(--brand-font-heading)' }}>{it.title}</h2>
            </div>
            <div style={{ marginTop: 14 }}>{it.node}</div>
          </section>
        ))}

        <div style={{ padding: '24px 0 60px', borderTop: `1px solid ${faint}`, color: muted, fontSize: 12 }}>© {new Date().getFullYear()} {content.churchName || ''} 온라인 주보</div>
      </div>

      {/* 다음 섹션 버튼 */}
      {mounted && items.length > 1 && active < items.length - 1 && createPortal(
        <button type="button" onClick={() => jump(active + 1)} style={{ position: 'fixed', right: 16, bottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)', zIndex: 30, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 999, background: textColor, color: '#fff', border: 'none', boxShadow: '0 8px 24px rgba(16,24,40,0.28)', cursor: 'pointer', maxWidth: 'calc(100vw - 32px)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.75 }}>다음</span>
          <span className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>{items[active + 1]?.title}</span>
          <span style={{ fontSize: 13 }}>→</span>
        </button>,
        document.body,
      )}

      {/* 목차 바텀시트 */}
      {mounted && toc && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div onClick={() => setToc(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,0.4)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: bg, borderRadius: '20px 20px 0 0', padding: '10px 12px calc(env(safe-area-inset-bottom,0px) + 22px)', maxHeight: '78vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: border, margin: '6px auto 12px' }} />
            <div style={{ padding: '0 10px 10px', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: muted }}>목차</div>
            {items.map((it, i) => (
              <button key={i} type="button" onClick={() => jump(i)} className="flex items-center gap-3 w-full" style={{ padding: '13px 12px', borderRadius: 12, cursor: 'pointer', border: 'none', textAlign: 'left', background: i === active ? surface : 'transparent' }}>
                <span style={{ flex: 'none', width: 22, fontSize: 12, fontWeight: 800, color: i === active ? primary : muted }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: i === active ? 700 : 500, letterSpacing: '-0.02em', color: textColor }}>{it.title}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}

      {/* 이미지 전체화면 뷰어 */}
      {mounted && viewer && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#0b1220', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between" style={{ padding: 'calc(env(safe-area-inset-top,0px) + 14px) 18px 12px', color: '#eaf1fb' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{viewer.title}</span>
            <button type="button" onClick={() => setViewer(null)} style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '6px 10px', background: 'none', border: 'none', color: '#eaf1fb' }}>닫기</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewer.imgs[viewer.i]} alt="악보 전체화면" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6, background: '#fff' }} />
          </div>
          <div className="flex items-center justify-between gap-3" style={{ padding: '16px 18px calc(env(safe-area-inset-bottom,0px) + 24px)' }}>
            <button type="button" onClick={() => setViewer({ ...viewer, i: (viewer.i - 1 + viewer.imgs.length) % viewer.imgs.length })} disabled={viewer.imgs.length < 2} style={viewerNav()}>‹</button>
            <span style={{ fontSize: 13, color: '#9db0cc' }}>{viewer.i + 1} / {viewer.imgs.length}</span>
            <button type="button" onClick={() => setViewer({ ...viewer, i: (viewer.i + 1) % viewer.imgs.length })} disabled={viewer.imgs.length < 2} style={viewerNav()}>›</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

const ctrlBtn: CSSProperties = {
  height: 30, padding: '0 10px', border: `1px solid ${border}`, borderRadius: 9, background: bg,
  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: textColor,
};
function viewerNav(): CSSProperties {
  return { width: 52, height: 44, borderRadius: 12, border: '1px solid #25344f', background: 'transparent', color: '#eaf1fb', fontSize: 18, cursor: 'pointer' };
}

function ScoreGrid({ imgs, title, onOpen }: { imgs: string[]; title: string; onOpen: (imgs: string[], i: number, title: string) => void }) {
  const list = (imgs ?? []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {list.map((u, k) => (
        <button key={k} type="button" onClick={() => onOpen(list, k, title)} style={{ aspectRatio: '3 / 4', border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', background: surface, padding: 0, cursor: 'pointer' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={`${title} ${k + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function segBtn(on: boolean): CSSProperties {
  return { padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: on ? bg : 'transparent', color: on ? primary : muted, boxShadow: on ? '0 1px 2px rgba(0,0,0,.08)' : 'none' };
}

// v2: 곡별 카드 + [악보|가사] 세그먼트 토글(기본 가사). 한쪽만 있으면 토글 없이 그것만.
function HymnItem({ h, en, onOpen }: { h: Hymn; en: boolean; onOpen: (imgs: string[], i: number, title: string) => void }) {
  const imgs = (h.imageUrls ?? []).filter(Boolean);
  const lyrics = (en && (h.lyricsEn || '').trim() ? h.lyricsEn : h.lyrics) || '';
  const hasImgs = imgs.length > 0;
  const hasLyrics = lyrics.trim().length > 0;
  const title = [h.hymnNo, h.title].filter(Boolean).join(' ') || '찬양';
  const [mode, setMode] = useState<'score' | 'lyrics'>(hasLyrics ? 'lyrics' : 'score');
  const both = hasImgs && hasLyrics;
  const showScore = hasImgs && (!hasLyrics || mode === 'score');
  const showLyrics = hasLyrics && (!hasImgs || mode === 'lyrics');
  if (!hasImgs && !hasLyrics && !h.title && !h.hymnNo) return null;
  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div className="flex items-center gap-2.5" style={{ padding: '14px 16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.025em', color: textColor }}>{title}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: muted }}>{hasImgs ? `악보 ${imgs.length}장` : ''}{hasImgs && hasLyrics ? ' · ' : ''}{hasLyrics ? '가사' : ''}</div>
        </div>
        {both && (
          <div style={{ flex: 'none', display: 'flex', padding: 3, borderRadius: 10, background: surface }}>
            <button type="button" onClick={() => setMode('score')} style={segBtn(mode === 'score')}>악보</button>
            <button type="button" onClick={() => setMode('lyrics')} style={segBtn(mode === 'lyrics')}>가사</button>
          </div>
        )}
      </div>
      {(showScore || showLyrics) && (
        <div style={{ borderTop: `1px solid ${faint}` }}>
          {showScore && <div style={{ padding: '14px 16px' }}><ScoreGrid imgs={imgs} title={h.title || '악보'} onOpen={onOpen} /></div>}
          {showLyrics && <div className="whitespace-pre-line" style={{ padding: '14px 16px 18px', color: textColor, lineHeight: 1.8 }} {...html(lyrics)} />}
        </div>
      )}
      {h.note && <p className="text-sm" style={{ padding: '0 16px 14px', color: muted }} {...html(h.note)} />}
    </div>
  );
}

function QGroup({ label, items }: { label: string; items?: string[] }) {
  const list = (items ?? []).filter((q) => (q || '').trim());
  if (list.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: primary }}>{label}</div>
      <ol className="mt-2 flex flex-col gap-2">
        {list.map((q, i) => (
          <li key={i} className="flex gap-2" style={{ color: textColor, lineHeight: 1.75 }}>
            <span className="shrink-0" style={{ color: muted }}>{i + 1}.</span>
            <span className="min-w-0" {...html(q)} />
          </li>
        ))}
      </ol>
    </div>
  );
}

// 설교 노트를 '## N. 제목' 포인트별 아코디언으로. 포인트가 없으면 일반 마크다운 폴백.
function splitPoints(md: string): { intro: string; points: { num: string; title: string; body: string }[] } {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n');
  const points: { num: string; title: string; body: string }[] = [];
  const introLines: string[] = [];
  let cur: { num: string; title: string; body: string } | null = null;
  let auto = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^##\s+/.test(t)) {
      if (cur) points.push(cur);
      auto++;
      let title = t.replace(/^##\s+/, '').trim();
      let num = String(auto);
      const m = title.match(/^(\d+)[.)]\s*(.*)$/);
      if (m) { num = m[1]!; title = m[2]!; }
      cur = { num, title, body: '' };
    } else if (/^#\s+/.test(t)) {
      continue; // 문서 제목(#)은 title 필드로 별도 표시 → 스킵
    } else if (cur) {
      cur.body += line + '\n';
    } else {
      introLines.push(line);
    }
  }
  if (cur) points.push(cur);
  return { intro: introLines.join('\n').trim(), points };
}

function SermonNote({ title, subtitle, text }: { title?: string; subtitle?: string; text?: string }) {
  const { intro, points } = splitPoints(text || '');
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const sub = subtitle || intro;
  return (
    <div>
      {title && <p className="font-extrabold" style={{ color: textColor, fontSize: 18 }}>{title}</p>}
      {sub && <p className="text-sm" style={{ color: muted, marginTop: title ? 6 : 0 }}>{sub}</p>}
      {points.length === 0 ? (
        <div style={{ marginTop: 8 }}><Markdown text={text} /></div>
      ) : (
        <div className="flex flex-col gap-2.5" style={{ marginTop: 16 }}>
          {points.map((p, i) => {
            const isOpen = open[i] ?? false;
            return (
              <div key={i} style={{ border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))} className="flex gap-2.5 w-full items-start" style={{ padding: 16, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}>
                  <span style={{ flex: 'none', color: primary, fontWeight: 800, fontSize: 13, marginTop: 2 }}>{p.num}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.55, letterSpacing: '-0.02em', color: textColor }}>{p.title}</span>
                  <span style={{ flex: 'none', color: muted, fontSize: 12, marginTop: 4 }}>{isOpen ? '▴' : '▾'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 16px 18px', borderTop: `1px solid ${faint}` }}>
                    <Markdown text={p.body} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 설교 노트 회중 탭. 청장년=성인노트, Children=취학후(어린이 설교노트), Kids=취학전(설교 카툰), EM/Youth=미등록.
function SermonSection({ adultTitle, adultText, childTitle, childText, cartoonImgs, onOpen }: {
  adultTitle?: string; adultText?: string; childTitle?: string; childText?: string; cartoonImgs: string[]; onOpen: (imgs: string[], i: number, title: string) => void;
}) {
  const hasMain = !!((adultText || '').trim() || (adultTitle || '').trim());
  const hasChildren = !!((childText || '').trim() || (childTitle || '').trim());
  const hasKids = cartoonImgs.length > 0;
  const TABS: [string, string][] = [['main', '청장년'], ['em', 'EM'], ['youth', 'Youth'], ['children', 'Children'], ['kids', 'Kids']];
  const first = hasMain ? 'main' : hasChildren ? 'children' : hasKids ? 'kids' : 'main';
  const [tab, setTab] = useState(first);
  return (
    <div>
      <div className="flex gap-1.5" style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
        {TABS.map(([k, name]) => {
          const on = tab === k;
          return <button key={k} type="button" onClick={() => setTab(k)} style={{ flex: 'none', padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? primary : border}`, background: on ? primary : bg, color: on ? '#fff' : textColor, fontSize: 13, fontWeight: on ? 800 : 600, letterSpacing: '-0.01em', cursor: 'pointer' }}>{name}</button>;
        })}
      </div>
      {tab === 'main' && (hasMain ? <SermonNote title={adultTitle} text={adultText} /> : <SermonEmpty label="청장년" />)}
      {tab === 'children' && (hasChildren ? <SermonNote title={childTitle} text={childText} /> : <SermonEmpty label="Children (취학후)" />)}
      {tab === 'kids' && (hasKids ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: muted, marginBottom: 10 }}>설교 카툰</div>
          <ScoreGrid imgs={cartoonImgs} title="어린이 설교 카툰" onOpen={onOpen} />
        </div>
      ) : <SermonEmpty label="Kids (취학전)" />)}
      {(tab === 'em' || tab === 'youth') && <SermonEmpty label={tab === 'em' ? 'EM' : 'Youth'} />}
    </div>
  );
}
function SermonEmpty({ label }: { label: string }) {
  return (
    <div style={{ padding: '22px 18px', border: `1px dashed ${border}`, borderRadius: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: textColor }}>{label} 설교 정리</div>
      <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: muted }}>설교 정리가 아직 등록되지 않았습니다.<br />등록되면 같은 자리에서 바로 열립니다.</div>
    </div>
  );
}

/* ── mini markdown (설교 노트: # 제목, ## 소제목, **강조**, - 불릿, 1. 번호, --- 구분선, > 인용) ── */
function InlineMd({ text }: { text: string }) {
  const parts = (text ?? '').split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}</>;
}
function Markdown({ text }: { text?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0; let key = 0;
  const HR = /^(-{3,}|\*{3,}|_{3,})$/;
  const OL = /^\d+\.\s+/;
  const at = (j: number) => lines[j] ?? '';
  const special = (t: string) => t.startsWith('#') || t.startsWith('> ') || t.startsWith('- ') || t.startsWith('* ') || HR.test(t) || OL.test(t);
  while (i < lines.length) {
    const t = at(i).trim();
    if (!t) { i++; continue; }
    if (HR.test(t)) { out.push(<hr key={key++} style={{ border: 'none', borderTop: `1px solid ${faint}`, margin: '22px 0' }} />); i++; continue; }
    if (t.startsWith('# ')) { out.push(<h3 key={key++} style={{ fontSize: 'var(--brand-h3, 22px)', fontWeight: 800, color: textColor, margin: '18px 0 10px', fontFamily: 'var(--brand-font-heading)' }}><InlineMd text={t.slice(2)} /></h3>); i++; continue; }
    if (t.startsWith('## ')) { out.push(<h4 key={key++} style={{ fontSize: '19px', fontWeight: 800, color: textColor, margin: '20px 0 8px' }}><InlineMd text={t.slice(3)} /></h4>); i++; continue; }
    if (t.startsWith('### ')) { out.push(<h5 key={key++} style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em', color: primary, margin: '16px 0 6px' }}><InlineMd text={t.slice(4)} /></h5>); i++; continue; }
    if (t.startsWith('> ')) {
      const q: string[] = [];
      while (i < lines.length && at(i).trim().startsWith('> ')) { q.push(at(i).trim().slice(2)); i++; }
      out.push(<blockquote key={key++} style={{ borderLeft: `2px solid ${primary}`, paddingLeft: 14, margin: '10px 0', color: muted, lineHeight: 1.8 }}>{q.map((l, k) => <div key={k}><InlineMd text={l} /></div>)}</blockquote>);
      continue;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const li: string[] = [];
      while (i < lines.length && (at(i).trim().startsWith('- ') || at(i).trim().startsWith('* '))) { li.push(at(i).trim().slice(2)); i++; }
      out.push(<ul key={key++} className="list-disc pl-5 space-y-1" style={{ margin: '8px 0', color: textColor, lineHeight: 1.8 }}>{li.map((l, k) => <li key={k}><InlineMd text={l} /></li>)}</ul>);
      continue;
    }
    if (OL.test(t)) {
      const li: string[] = [];
      while (i < lines.length && OL.test(at(i).trim())) { li.push(at(i).trim().replace(OL, '')); i++; }
      out.push(<ol key={key++} className="list-decimal pl-5 space-y-1" style={{ margin: '8px 0', color: textColor, lineHeight: 1.8 }}>{li.map((l, k) => <li key={k}><InlineMd text={l} /></li>)}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length) { const lt = at(i).trim(); if (!lt || special(lt)) break; para.push(lt); i++; }
    out.push(<p key={key++} style={{ margin: '8px 0', color: textColor, lineHeight: 1.85 }}>{para.map((l, k) => <span key={k}>{k > 0 && <br />}<InlineMd text={l} /></span>)}</p>);
  }
  return <>{out}</>;
}
