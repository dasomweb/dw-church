import type { ReactNode } from 'react';
import { getLatestOnlineBulletin, getOnlineBulletin } from '@/lib/api';
import { DataSection } from './DataSection';

interface OnlineBulletinBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

interface Hymn { title?: string; hymnNo?: string; imageUrls?: string[]; note?: string }

/**
 * online_bulletin — 온라인 주보 data block. Fetches the latest published online
 * bulletin (or a specific one via props.bulletinId) and renders the full
 * scroll-down experience: 예배순서 → 찬양악보 → 대표기도 → 성경본문 → 기도제목 →
 * 마지막찬양 → 주일광고 → 소그룹 나눔 질문. Token-driven; hides itself when there's
 * no published bulletin (returns null) so an empty section never ships.
 */
export async function OnlineBulletinBlock({ props, slug }: OnlineBulletinBlockProps) {
  const bulletinId = (props.bulletinId as string) || '';
  let bulletin: Record<string, unknown> | null = null;
  try {
    bulletin = bulletinId ? await getOnlineBulletin(slug, bulletinId) : await getLatestOnlineBulletin(slug);
  } catch {
    bulletin = null;
  }
  if (!bulletin) return null;

  const content = (bulletin.content ?? {}) as Record<string, any>;
  const serviceDate = bulletin.serviceDate ? String(bulletin.serviceDate).slice(0, 10) : '';
  const worshipOrder = Array.isArray(content.worshipOrder) ? content.worshipOrder : [];
  const hymns = Array.isArray(content.hymns) ? (content.hymns as Hymn[]) : [];
  const prayers = Array.isArray(content.prayerRequests) ? content.prayerRequests : [];
  const anns = Array.isArray(content.announcements) ? content.announcements : [];
  const study = content.study ?? {};
  const rp = content.representativePrayer ?? {};
  const scripture = content.scripture ?? {};
  const closing: Hymn = content.closingHymn ?? {};

  const hasStudy = ['observation', 'correlation', 'application'].some((k) => Array.isArray(study[k]) && study[k].some((q: string) => (q || '').trim()));

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #ffffff)">
      <div className="mx-auto max-w-3xl" style={{ color: 'var(--dw-text, #16181d)' }}>
        {/* Header */}
        <header className="text-center pb-8 mb-4 border-b" style={{ borderColor: 'var(--border, rgba(0,0,0,0.08))' }}>
          {content.serviceTitle && (
            <div style={{ color: 'var(--dw-primary, #1466d6)', fontWeight: 800, letterSpacing: '0.05em', fontSize: 'var(--fs-sm, 14px)' }}>
              {content.serviceTitle}
            </div>
          )}
          <h1 style={{ fontSize: 'var(--brand-h2, 30px)', fontWeight: 800, fontFamily: 'var(--brand-font-heading)', marginTop: 8 }}>
            {String(bulletin.title ?? '')}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3" style={{ color: 'var(--brand-muted, #6b7280)', fontSize: 'var(--fs-sm, 14px)' }}>
            {serviceDate && <span>{serviceDate}</span>}
            {content.presider && <span>· 인도 {content.presider}</span>}
          </div>
        </header>

        {/* 1. 예배 순서 */}
        {worshipOrder.length > 0 && (
          <Section n={1} title="예배 순서">
            <div className="divide-y" style={{ borderColor: 'var(--border, rgba(0,0,0,0.06))' }}>
              {worshipOrder.map((r: any, i: number) => (
                <div key={i} className="flex gap-3 py-2.5 items-baseline">
                  <div className="w-24 shrink-0 font-semibold" style={{ color: 'var(--dw-text)' }}>{r.label}</div>
                  <div className="flex-1 min-w-0" style={{ color: 'var(--dw-text)' }}>{r.detail}</div>
                  {r.person && <div className="shrink-0 text-right" style={{ color: 'var(--brand-muted, #6b7280)', fontSize: 'var(--fs-sm,14px)' }}>{r.person}</div>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 2. 찬양 악보 */}
        {hymns.some((h) => (h.imageUrls?.length ?? 0) > 0 || h.title) && (
          <Section n={2} title="찬양 악보">
            <div className="space-y-8">
              {hymns.map((h, i) => (
                <div key={i}>
                  {(h.title || h.hymnNo) && (
                    <div className="mb-2 font-semibold" style={{ color: 'var(--dw-text)' }}>
                      {h.hymnNo && <span style={{ color: 'var(--dw-primary, #1466d6)' }}>{h.hymnNo} </span>}{h.title}
                    </div>
                  )}
                  <div className="space-y-3">
                    {(h.imageUrls ?? []).map((u, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={k} src={u} alt={h.title || '악보'} className="w-full rounded-lg" style={{ border: '1px solid var(--border, rgba(0,0,0,0.06))' }} loading="lazy" />
                    ))}
                  </div>
                  {h.note && <p className="mt-2 text-sm" style={{ color: 'var(--brand-muted, #6b7280)' }}>{h.note}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 3. 대표기도 */}
        {(rp.person || rp.content) && (
          <Section n={3} title="대표기도">
            {rp.person && <p className="font-semibold" style={{ color: 'var(--dw-text)' }}>{rp.person}</p>}
            {rp.content && <p className="mt-1 whitespace-pre-line" style={{ color: 'var(--dw-text)', lineHeight: 1.8 }}>{rp.content}</p>}
          </Section>
        )}

        {/* 4. 성경 본문 */}
        {(scripture.reference || scripture.text) && (
          <Section n={4} title="성경 본문">
            {scripture.reference && <p className="mb-2 font-semibold" style={{ color: 'var(--dw-primary, #1466d6)' }}>{scripture.reference}</p>}
            {scripture.text && <p className="whitespace-pre-line" style={{ color: 'var(--dw-text)', lineHeight: 1.9 }}>{scripture.text}</p>}
          </Section>
        )}

        {/* 5. 기도 제목 */}
        {prayers.length > 0 && (
          <Section n={5} title="기도 제목">
            <ul className="space-y-2">
              {prayers.map((p: any, i: number) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: 'var(--dw-primary, #1466d6)' }}>•</span>
                  <span style={{ color: 'var(--dw-text)' }}>{p.title && <b>{p.title}</b>}{p.title && p.detail ? ' — ' : ''}{p.detail}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* 6. 마지막 찬양 */}
        {(closing.title || (closing.imageUrls?.length ?? 0) > 0) && (
          <Section n={6} title="마지막 찬양">
            {(closing.title || closing.hymnNo) && (
              <div className="mb-2 font-semibold" style={{ color: 'var(--dw-text)' }}>
                {closing.hymnNo && <span style={{ color: 'var(--dw-primary, #1466d6)' }}>{closing.hymnNo} </span>}{closing.title}
              </div>
            )}
            <div className="space-y-3">
              {(closing.imageUrls ?? []).map((u, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={k} src={u} alt={closing.title || '악보'} className="w-full rounded-lg" style={{ border: '1px solid var(--border, rgba(0,0,0,0.06))' }} loading="lazy" />
              ))}
            </div>
          </Section>
        )}

        {/* 7. 주일 광고 */}
        {anns.length > 0 && (
          <Section n={7} title="주일 광고">
            <div className="space-y-4">
              {anns.map((a: any, i: number) => (
                <div key={i} className="rounded-lg p-4" style={{ background: 'var(--dw-surface, #f7f8fa)', border: '1px solid var(--border, rgba(0,0,0,0.06))' }}>
                  {a.title && <p className="font-semibold" style={{ color: 'var(--dw-text)' }}>{a.title}</p>}
                  {a.body && <p className="mt-1 whitespace-pre-line" style={{ color: 'var(--brand-muted, #4b5563)', lineHeight: 1.7 }}>{a.body}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 8. 소그룹 나눔 질문 */}
        {hasStudy && (
          <Section n={8} title="소그룹 나눔 질문" eyebrow="이번 주 소그룹에서 함께 나눠요">
            <div className="space-y-6">
              <QuestionGroup label="관찰" items={study.observation} />
              <QuestionGroup label="상관" items={study.correlation} />
              <QuestionGroup label="적용" items={study.application} />
            </div>
          </Section>
        )}
      </div>
    </DataSection>
  );
}

function Section({ n, title, eyebrow, children }: { n: number; title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="py-8 border-b last:border-0" style={{ borderColor: 'var(--border, rgba(0,0,0,0.06))' }}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid place-items-center rounded-full text-white text-sm font-bold shrink-0" style={{ width: 26, height: 26, background: 'var(--dw-primary, #1466d6)' }}>{n}</span>
        <h2 style={{ fontSize: 'var(--brand-h3, 22px)', fontWeight: 800, fontFamily: 'var(--brand-font-heading)', color: 'var(--dw-text)' }}>{title}</h2>
      </div>
      {eyebrow && <p className="-mt-2 mb-4 text-sm" style={{ color: 'var(--brand-muted, #6b7280)' }}>{eyebrow}</p>}
      {children}
    </section>
  );
}

function QuestionGroup({ label, items }: { label: string; items?: string[] }) {
  const list = (items ?? []).filter((q) => (q || '').trim());
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: 'var(--dw-surface, #f7f8fa)', color: 'var(--dw-primary, #1466d6)' }}>{label}</p>
      <ol className="space-y-2">
        {list.map((q, i) => (
          <li key={i} className="flex gap-2" style={{ color: 'var(--dw-text)', lineHeight: 1.7 }}>
            <span className="shrink-0" style={{ color: 'var(--brand-muted, #9ca3af)' }}>{i + 1}.</span>
            <span className="whitespace-pre-line">{q}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
