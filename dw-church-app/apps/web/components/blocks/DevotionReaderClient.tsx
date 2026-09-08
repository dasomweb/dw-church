'use client';
import { useState } from 'react';

// 말씀 묵상 리더 (Claude Design 14a "오늘의 묵상" 기반, 읽기 전용).
// 좌: 주간 묵상 목록(클릭해 전환) · 우: 선택한 날의 묵상(제목·참조·묵상글·질문·기도).
// ⚠️ 사용자 트래킹 없음 — 진행률/연속일수/완료버튼/답변입력/개인노트 전부 제외.
// ⚠️ 저작권 — 성경 본문 전문 없음. 참조만 크게 보여주고 "성경에서 함께 읽어보세요".
interface Devo {
  id: string; title?: string; devoDate?: string | null; dayLabel?: string | null;
  scriptureRef?: string | null; verse?: string | null; reflection?: string | null;
  question?: string | null; prayer?: string | null; imageUrl?: string | null;
}

const BRAND = 'var(--dw-primary, #1466d6)';
const MUTED = 'var(--dw-text-muted, #61697a)';
const BORDER = 'var(--dw-border, #e5e7eb)';
const SURFACE = 'var(--dw-surface, #f7f8fa)';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso ?? '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`;
}

// 요일 한 글자(월/화/…) — 주간 목록 배지용. 날짜 없으면 null.
function weekdayOf(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return WD[d.getDay()];
}
// 짧은 날짜(9월 8일) — 주간 목록 부제용.
function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function DevotionReaderClient({ devotions, eyebrow }: { devotions: Devo[]; eyebrow: string }) {
  const [selectedId, setSelectedId] = useState(devotions[0]?.id);
  const cur = devotions.find((d) => d.id === selectedId) ?? devotions[0];
  if (!cur) return null;

  const paras = (cur.reflection ?? '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const questions = (cur.question ?? '').split(/\n+/).map((q) => q.trim()).filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
      {/* 좌: 주간 목록 */}
      <aside className="lg:sticky lg:top-6">
        <div className="rounded-2xl border p-5" style={{ borderColor: BORDER }}>
          <div className="mb-3 text-[12px] font-semibold" style={{ color: BRAND }}>{eyebrow}</div>
          <div className="flex flex-col">
            {devotions.map((d, i) => {
              const active = d.id === cur.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="flex items-center gap-3 border-t py-2.5 text-left first:border-t-0"
                  style={{ borderColor: BORDER }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={active
                      ? { background: BRAND, color: '#fff' }
                      : { border: `1px solid ${BORDER}`, color: MUTED }}
                  >{weekdayOf(d.devoDate) ?? (i + 1)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px]" style={{ fontWeight: active ? 700 : 400 }}>{d.title}</span>
                    {(shortDate(d.devoDate) || d.scriptureRef) && (
                      <span className="mt-0.5 block text-[12px]" style={{ color: MUTED }}>
                        {[shortDate(d.devoDate), d.scriptureRef].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* 우: 선택한 날의 묵상 */}
      <div className="max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {cur.dayLabel && <span className="inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-semibold" style={{ background: 'color-mix(in srgb, var(--dw-primary, #1466d6) 12%, #fff)', color: BRAND }}>{cur.dayLabel}</span>}
          {fmtDate(cur.devoDate) && <span className="inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-semibold" style={{ background: SURFACE, color: MUTED }}>{fmtDate(cur.devoDate)}</span>}
        </div>
        <h3 className="font-heading text-[26px] font-bold leading-[1.32] sm:text-[34px]">{cur.title}</h3>
        {cur.scriptureRef && (
          <div className="mt-2 text-[15px]" style={{ color: MUTED }}>
            오늘의 본문 · <b style={{ color: 'var(--dw-text, #16181d)' }}>{cur.scriptureRef}</b>
            <span className="ml-2 text-[13px]">성경에서 함께 읽어보세요</span>
          </div>
        )}

        {cur.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.imageUrl} alt={cur.title ?? ''} className="mt-6 w-full rounded-2xl object-cover" style={{ aspectRatio: '16/9' }} />
        )}

        {/* 핵심 구절 (라이선스 있을 때만 채워짐) */}
        {cur.verse && (
          <div className="mt-7 rounded-r-2xl px-7 py-6" style={{ background: SURFACE, borderLeft: `3px solid ${BRAND}` }}>
            <p className="m-0 text-[19px] font-semibold leading-[1.75] sm:text-[21px]">“{cur.verse}”</p>
            {cur.scriptureRef && <div className="mt-2 text-[14px]" style={{ color: MUTED }}>{cur.scriptureRef}</div>}
          </div>
        )}

        {/* 묵상 본문 */}
        {paras.length > 0 && (
          <div className="mt-8 space-y-4 text-[17px] leading-[1.95]">
            {paras.map((p, i) => <p key={i} className="m-0" style={i === 0 ? undefined : { color: MUTED }}>{p}</p>)}
          </div>
        )}

        {/* 묵상 질문 (읽기 전용 — 입력창 없음) */}
        {questions.length > 0 && (
          <div className="mt-8 rounded-2xl border p-6 sm:p-7" style={{ borderColor: BORDER }}>
            <div className="mb-4 text-[12px] font-semibold" style={{ color: BRAND }}>오늘의 질문</div>
            <div className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 pt-0.5 text-[12.5px] font-semibold" style={{ color: BRAND }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[16px] leading-[1.7]">{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 기도 */}
        {cur.prayer && (
          <div className="mt-6 rounded-2xl px-6 py-5" style={{ background: SURFACE }}>
            <div className="mb-1.5 text-[12px] font-semibold" style={{ color: BRAND }}>기도</div>
            <p className="m-0 text-[15.5px] leading-[1.85]" style={{ color: MUTED }}>{cur.prayer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
