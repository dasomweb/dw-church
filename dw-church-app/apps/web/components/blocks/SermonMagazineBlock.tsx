import Link from 'next/link';
import { getSermons } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

// 설교 매거진 (Claude Design 13a) — 이번 주 설교 1편을 커버(한줄요약) → 본문/써머리 →
// 이번 주 질문(관찰·심화·적용) 순으로 정리하는 데이터 블록. 데이터는 설교 모듈에서
// 최신 게시 설교(또는 props.sermonId 지정 1편)를 fetch. 값이 없는 섹션은 렌더 안 함.
//
// variant:
//   'default'(13a) — 커버 우측 = 영상 썸네일(▶), 본문 요약 = 1단.
//   'compact'(15a 소형·개척교회형) — 영상 없이 이미지 + "이번 주 함께 볼 것" 카드,
//      버튼 = 전문 읽기 · 음성 듣기(오디오 있을 때), 본문 발췌 = 큰 리드문 + 2단.
interface Props { props: Record<string, unknown>; slug: string }

interface SermonLike {
  id: string; title?: string; scripture?: string; preacher?: string; date?: string;
  youtubeUrl?: string; thumbnailUrl?: string; audioUrl?: string;
  oneLineSummary?: string | null; summary?: string | null;
  observationQuestions?: string[]; deepQuestions?: string[]; applicationQuestions?: string[];
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export async function SermonMagazineBlock({ props, slug }: Props) {
  const eyebrow = (props.title as string) || '이번 주 말씀';
  const compact = (props.variant as string) === 'compact';

  let sermon: SermonLike | null = null;
  try {
    const result = await getSermons(slug, { perPage: 1 });
    const list = (Array.isArray(result) ? result : (result?.data ?? [])) as SermonLike[];
    sermon = list[0] ?? null;
  } catch {
    sermon = null;
  }

  if (!sermon) {
    return (
      <DataSection props={props} defaultBg="var(--dw-bg)">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-400">등록된 설교가 없습니다.</div>
      </DataSection>
    );
  }

  const obs = sermon.observationQuestions ?? [];
  const deep = sermon.deepQuestions ?? [];
  const app = sermon.applicationQuestions ?? [];
  const hasQuestions = obs.length + deep.length + app.length > 0;
  const summaryParas = (sermon.summary ?? '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const audioUrl = (sermon.audioUrl || (props.audioUrl as string)) ?? '';

  const BRAND = 'var(--dw-primary, #1466d6)';
  const MUTED = 'var(--dw-text-muted, #61697a)';
  const BORDER = 'var(--dw-border, #e5e7eb)';
  const SURFACE = 'var(--dw-surface, #f7f8fa)';

  const pill = (bg: string, color: string) =>
    ({ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 11px', borderRadius: 999, background: bg, color, fontSize: 12, fontWeight: 600 }) as const;

  return (
    <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
      {/* 가로 패딩은 DataSection 이 제공(px-4 sm:px-6) — 여기서 또 넣으면 이중 여백. */}
      <div className="mx-auto max-w-6xl">
        {/* 1. 커버 */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span style={pill('color-mix(in srgb, var(--dw-primary, #1466d6) 12%, #fff)', BRAND)}>{eyebrow}</span>
              {sermon.scripture && <span style={pill(SURFACE, MUTED)}>{sermon.scripture}</span>}
            </div>
            <h2 className="font-heading text-[30px] font-bold leading-[1.3] sm:text-[42px]" style={getElementStyle(props, 'title')}>{sermon.title}</h2>
            {sermon.oneLineSummary && (
              <p className="mt-4 text-[16px] leading-[1.8] sm:text-[18px]" style={{ color: MUTED }}>{sermon.oneLineSummary}</p>
            )}
            <div className="mt-5 text-[14px]" style={{ color: MUTED }}>
              {[sermon.preacher, fmtDate(sermon.date)].filter(Boolean).join(' · ')}
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href={`/sermons/${sermon.id}`} className="inline-flex h-[46px] items-center rounded-full px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>전문 읽기</Link>
              {/* compact(15a): 음성(오디오) 우선, 없으면 영상 폴백. default: 영상 보기. */}
              {compact
                ? (audioUrl
                    ? <a href={audioUrl} target="_blank" rel="noreferrer" className="inline-flex h-[46px] items-center rounded-full border px-6 text-[15px] font-semibold" style={{ borderColor: BORDER }}>음성 듣기</a>
                    : (sermon.youtubeUrl && (
                        <a href={sermon.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex h-[46px] items-center rounded-full border px-6 text-[15px] font-semibold" style={{ borderColor: BORDER }}>영상으로 보기</a>
                      )))
                : (sermon.youtubeUrl && (
                    <a href={sermon.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex h-[46px] items-center rounded-full border px-6 text-[15px] font-semibold" style={{ borderColor: BORDER }}>영상으로 보기</a>
                  ))}
            </div>
            {compact && (
              <div className="mt-4 text-[13.5px] leading-[1.7]" style={{ color: MUTED }}>영상 대신 원고와 음성으로 올립니다. 카카오톡 채널로도 매주 보내드립니다.</div>
            )}
          </div>

          {compact ? (
            /* 15a 커버 우측 = 이미지 + "이번 주 함께 볼 것" 카드 (질문 수에서 파생) */
            <div className="flex flex-col gap-3.5">
              <div className="w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '16/9', background: SURFACE }}>
                {sermon.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sermon.thumbnailUrl} alt={sermon.title ?? ''} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="rounded-2xl border px-6 py-5" style={{ borderColor: BORDER }}>
                <div className="mb-3.5 text-[12px] font-semibold" style={{ color: BRAND }}>이번 주 함께 볼 것</div>
                <div className="flex flex-col gap-2.5 text-[14.5px]">
                  {hasQuestions && (
                    <div className="flex items-center gap-3">
                      <b className="w-[52px] shrink-0 font-semibold">질문지</b>
                      <span className="flex-1" style={{ color: MUTED }}>{[obs.length && `관찰 ${obs.length}`, deep.length && `심화 ${deep.length}`].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                  {app.length > 0 && (
                    <div className="flex items-center gap-3">
                      <b className="w-[52px] shrink-0 font-semibold">나눔</b>
                      <span className="flex-1" style={{ color: MUTED }}>적용 {app.length} · 모임에서</span>
                    </div>
                  )}
                  {sermon.scripture && (
                    <div className="flex items-center gap-3">
                      <b className="w-[52px] shrink-0 font-semibold">본문</b>
                      <span className="flex-1" style={{ color: MUTED }}>{sermon.scripture}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Link href={`/sermons/${sermon.id}`} className="relative block w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '16/9', background: SURFACE }}>
              {sermon.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sermon.thumbnailUrl} alt={sermon.title ?? ''} className="absolute inset-0 h-full w-full object-cover" />
              )}
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[20px]" style={{ background: 'rgba(255,255,255,.94)', color: '#c0392b' }}>▶</span>
            </Link>
          )}
        </div>

        {/* 2. 본문 · 써머리 */}
        {(sermon.scripture || summaryParas.length > 0) && (
          compact ? (
            /* 15a 본문 발췌 — 큰 리드문 + 참조 + 2단 본문 */
            <div className="mt-16 max-w-4xl">
              <div className="mb-4 text-[13px] font-semibold" style={{ color: BRAND }}>본문에서</div>
              {summaryParas[0] && (
                <p className="m-0 text-[21px] font-semibold leading-[1.75] sm:text-[23px]" style={{ letterSpacing: 'var(--tracking-title, -0.025em)' }}>{summaryParas[0]}</p>
              )}
              {sermon.scripture && (
                <div className="mt-3 border-b pb-6 text-[14px]" style={{ color: MUTED, borderColor: BORDER }}>{sermon.scripture}</div>
              )}
              {summaryParas.length > 1 && (
                <div className="grid grid-cols-1 gap-9 pt-6 md:grid-cols-2">
                  {summaryParas.slice(1).map((p, i) => (
                    <p key={i} className="m-0 text-[16.5px] leading-[1.95]" style={{ color: MUTED }}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-16 max-w-3xl">
              <div className="mb-4 text-[13px] font-semibold" style={{ color: BRAND }}>설교 요약</div>
              {sermon.scripture && (
                <div className="mb-5 border-b pb-5 text-[14px]" style={{ color: MUTED, borderColor: BORDER }}>{sermon.scripture}</div>
              )}
              <div className="space-y-4">
                {summaryParas.map((p, i) => (
                  <p key={i} className="text-[16.5px] leading-[1.95]" style={{ color: MUTED }}>{p}</p>
                ))}
              </div>
            </div>
          )
        )}

        {/* 3. 이번 주 질문 — 관찰·심화·적용 */}
        {hasQuestions && (
          <div className="mt-16 rounded-2xl px-3 py-5 sm:px-8 sm:py-10" style={{ background: SURFACE }}>
            <div className="mb-6">
              <div className="mb-2 text-[13px] font-semibold" style={{ color: BRAND }}>이번 주 질문</div>
              <h3 className="font-heading text-[24px] font-bold sm:text-[28px]">읽고, 파고들고, 나눕니다</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <QuestionCard tag="관찰" heading="본문에 무엇이 쓰여 있는가" desc="읽으면 답이 보이는 질문입니다." items={obs} brand={BRAND} muted={MUTED} border={BORDER} />
              <QuestionCard tag="심화" heading="왜 그렇게 말씀하셨는가" desc="뜻을 한 겹 더 파고듭니다." items={deep} brand={BRAND} muted={MUTED} border={BORDER} />
              <QuestionCard tag="적용" heading="내 삶에서는 어떻게 되는가" desc="모임에서 함께 나눕니다." items={app} brand={BRAND} muted={MUTED} border={BORDER} />
            </div>
          </div>
        )}
      </div>
    </DataSection>
  );
}

function QuestionCard({ tag, heading, desc, items, brand, muted, border }: {
  tag: string; heading: string; desc: string; items: string[]; brand: string; muted: string; border: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col rounded-xl border bg-white p-4 sm:p-6" style={{ borderColor: border }}>
      <div className="mb-4">
        <span style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 11px', borderRadius: 999, background: 'color-mix(in srgb, var(--dw-primary, #1466d6) 12%, #fff)', color: brand, fontSize: 12, fontWeight: 600 }}>설교 질문지 · {tag}</span>
      </div>
      <div className="text-[18px] font-bold">{heading}</div>
      <div className="border-b pb-4 pt-1 text-[13.5px] leading-[1.7]" style={{ color: muted, borderColor: border }}>{desc}</div>
      <div className="flex flex-col gap-3.5 pt-4">
        {items.map((q, i) => (
          <div key={i} className="flex gap-3">
            <span className="shrink-0 pt-0.5 text-[12.5px] font-semibold" style={{ color: brand }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[15px] leading-[1.75]">{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
