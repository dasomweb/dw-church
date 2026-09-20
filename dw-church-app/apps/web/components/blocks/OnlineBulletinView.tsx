'use client';

import { useState, type ReactNode, type CSSProperties } from 'react';

// 온라인 주보 스토어프론트 뷰(클라이언트) — 한/영 토글 담당.
// 성경 본문(개역개정/ESV)·설교 노트·기도 제목·소그룹 질문은 한/영 병기 시 토글로 전환.
// 서버 컴포넌트(OnlineBulletinBlock)가 fetch 한 bulletin(plain JSON)을 그대로 받음.

interface Hymn { title?: string; hymnNo?: string; imageUrls?: string[]; note?: string; lyrics?: string }

const muted = 'var(--brand-muted, #6b7280)';
const border = 'var(--border, rgba(0,0,0,0.08))';
const primary = 'var(--dw-primary, #1466d6)';
const textColor = 'var(--dw-text, #16181d)';

export function OnlineBulletinView({ bulletin }: { bulletin: Record<string, any> }) {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const en = lang === 'en';

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

  const hasEnglish = !!(
    (scripture.textEn && scripture.textEn.trim()) ||
    (scripture.referenceEn && scripture.referenceEn.trim()) ||
    (sermonNote.textEn && sermonNote.textEn.trim()) ||
    (childrenSermonNote.textEn && childrenSermonNote.textEn.trim()) ||
    cartoonEn.length > 0 ||
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
            {worshipOrder.map((r: any, i: number) => (
              <div key={i} className="flex gap-3 py-2.5 items-baseline">
                <div className="w-24 shrink-0 font-semibold" style={{ color: textColor }}>{r.label}</div>
                <div className="flex-1 min-w-0" style={{ color: textColor }}>{r.detail}</div>
                {r.person && <div className="shrink-0 text-right" style={{ color: muted, fontSize: 'var(--fs-sm,14px)' }}>{r.person}</div>}
              </div>
            ))}
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
            {hymns.map((h, i) => <HymnItem key={i} h={h} />)}
          </div>
        </Section>
      ),
    },
    // 3. 대표기도
    {
      visible: !!(rp.person || rp.content),
      render: (n) => (
        <Section key="rp" n={n} title="대표기도">
          {rp.person && <p className="font-semibold" style={{ color: textColor }}>{rp.person}</p>}
          {rp.content && <p className="mt-1 whitespace-pre-line" style={{ color: textColor, lineHeight: 1.8 }}>{rp.content}</p>}
        </Section>
      ),
    },
    // 4. 교회소식 (구 주일광고 — 대표기도 다음)
    {
      visible: anns.length > 0,
      render: (n) => (
        <Section key="anns" n={n} title="교회소식">
          <div className="space-y-4">
            {anns.map((a: any, i: number) => (
              <div key={i} className="rounded-lg p-4" style={{ background: 'var(--dw-surface, #f7f8fa)', border: `1px solid var(--border, rgba(0,0,0,0.06))` }}>
                {a.title && <p className="font-semibold" style={{ color: textColor }}>{a.title}</p>}
                {a.body && <p className="mt-1 whitespace-pre-line" style={{ color: 'var(--brand-muted, #4b5563)', lineHeight: 1.7 }}>{a.body}</p>}
              </div>
            ))}
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
          <div className="space-y-4">
            {cartoonImgs.map((u, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={u} alt={cartoonCaption || '어린이 설교 카툰'} className="w-full rounded-xl" style={{ border: `1px solid var(--border, rgba(0,0,0,0.06))` }} loading="lazy" />
            ))}
          </div>
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
                  <span style={{ color: textColor }}>{title && <b>{title}</b>}{title && detail ? ' — ' : ''}{detail}</span>
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
          <HymnItem h={closing} />
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

  return (
    <div className="mx-auto max-w-3xl" style={{ color: textColor }}>
      {/* 한/영 토글 (영어 콘텐츠가 있을 때만) */}
      {hasEnglish && (
        <div className="sticky top-2 z-10 flex justify-end mb-2">
          <div className="inline-flex rounded-full overflow-hidden shadow-sm" style={{ border: `1px solid ${primary}`, background: 'var(--dw-background, #fff)' }}>
            <button type="button" onClick={() => setLang('ko')} style={tabStyle(!en)}>한국어</button>
            <button type="button" onClick={() => setLang('en')} style={tabStyle(en)}>English</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="text-center pb-8 mb-4 border-b" style={{ borderColor: border }}>
        {content.serviceTitle && (
          <div style={{ color: primary, fontWeight: 800, letterSpacing: '0.05em', fontSize: 'var(--fs-sm, 14px)' }}>
            {content.serviceTitle}
          </div>
        )}
        <h1 style={{ fontSize: 'var(--brand-h2, 30px)', fontWeight: 800, fontFamily: 'var(--brand-font-heading)', marginTop: 8 }}>
          {String(bulletin.title ?? '')}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-3" style={{ color: muted, fontSize: 'var(--fs-sm, 14px)' }}>
          {serviceDate && <span>{serviceDate}</span>}
          {content.presider && <span>· 인도 {content.presider}</span>}
        </div>
      </header>

      {visible.map((it, i) => it.render(i + 1))}
    </div>
  );
}

function tabStyle(on: boolean): CSSProperties {
  return {
    padding: '5px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: on ? primary : 'transparent',
    color: on ? '#fff' : primary,
  };
}

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

function HymnItem({ h }: { h: Hymn }) {
  const imgs = h.imageUrls ?? [];
  return (
    <div>
      {(h.title || h.hymnNo) && (
        <div className="mb-2 font-semibold" style={{ color: textColor }}>
          {h.hymnNo && <span style={{ color: primary }}>{h.hymnNo} </span>}{h.title}
        </div>
      )}
      {imgs.length > 0 && (
        <div className="space-y-3">
          {imgs.map((u, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src={u} alt={h.title || '악보'} className="w-full rounded-lg" style={{ border: `1px solid var(--border, rgba(0,0,0,0.06))` }} loading="lazy" />
          ))}
        </div>
      )}
      {(h.lyrics || '').trim() && (
        <div className="mt-3 whitespace-pre-line" style={{ color: textColor, lineHeight: 1.9 }}>{h.lyrics}</div>
      )}
      {h.note && <p className="mt-2 text-sm" style={{ color: muted }}>{h.note}</p>}
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
            <span className="whitespace-pre-line">{q}</span>
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
