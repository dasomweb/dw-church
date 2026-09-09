'use client';

import { YoutubeEmbed, DateBadge } from '@dw-church/ui-components';
import type { Sermon } from '@dw-church/api-client';
import Link from 'next/link';

interface SingleSermonClientProps {
  sermon: Sermon & {
    oneLineSummary?: string | null;
    summary?: string | null;
    observationQuestions?: string[];
    deepQuestions?: string[];
    applicationQuestions?: string[];
  };
  slug: string;
}

const BRAND = 'var(--dw-primary, #1466d6)';
const MUTED = 'var(--dw-text-muted, #61697a)';
const BORDER = 'var(--dw-border, #e5e7eb)';
const SURFACE = 'var(--dw-surface, #f7f8fa)';

function QCard({ tag, heading, desc, items }: { tag: string; heading: string; desc: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col rounded-xl border bg-white p-5 sm:p-6" style={{ borderColor: BORDER }}>
      <span className="mb-3 inline-flex h-[26px] w-fit items-center rounded-full px-3 text-[12px] font-semibold"
        style={{ background: 'color-mix(in srgb, var(--dw-primary, #1466d6) 12%, #fff)', color: BRAND }}>설교 질문지 · {tag}</span>
      <div className="text-[18px] font-bold">{heading}</div>
      <div className="border-b pb-4 pt-1 text-[13.5px] leading-[1.7]" style={{ color: MUTED, borderColor: BORDER }}>{desc}</div>
      <div className="flex flex-col gap-3.5 pt-4">
        {items.map((q, i) => (
          <div key={i} className="flex gap-3">
            <span className="shrink-0 pt-0.5 text-[12.5px] font-semibold" style={{ color: BRAND }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[16px] leading-[1.75]">{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SingleSermonClient({ sermon }: SingleSermonClientProps) {
  const summaryParas = (sermon.summary ?? '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const obs = sermon.observationQuestions ?? [];
  const deep = sermon.deepQuestions ?? [];
  const app = sermon.applicationQuestions ?? [];
  const hasQuestions = obs.length + deep.length + app.length > 0;

  return (
    <div>
      <Link href={`/sermons`} className="mb-6 inline-block text-sm hover:underline" style={{ color: BRAND }}>
        &larr; 설교 목록
      </Link>
      <h1 className="mb-4 font-heading text-[26px] font-bold leading-[1.3] sm:text-[34px]">{sermon.title}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-[14px]" style={{ color: MUTED }}>
        <DateBadge date={sermon.date} />
        {sermon.preacher && <span>{sermon.preacher}</span>}
        {sermon.scripture && <span>{sermon.scripture}</span>}
        {sermon.category && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">{sermon.category}</span>}
      </div>

      {/* 한줄 요약 (리드) */}
      {sermon.oneLineSummary && (
        <p className="mb-8 text-[17px] leading-[1.85] sm:text-[18px]" style={{ color: MUTED }}>{sermon.oneLineSummary}</p>
      )}

      {/* 연결된 영상 */}
      {sermon.youtubeUrl && (
        <div className="mb-10">
          <YoutubeEmbed url={sermon.youtubeUrl} />
        </div>
      )}

      {/* 말씀 요약 (써머리) */}
      {(sermon.scripture || summaryParas.length > 0) && (
        <section className="mb-12 max-w-3xl">
          <div className="mb-4 text-[13px] font-semibold" style={{ color: BRAND }}>말씀 요약</div>
          {sermon.scripture && (
            <div className="mb-5 border-b pb-5 text-[14px]" style={{ color: MUTED, borderColor: BORDER }}>{sermon.scripture}</div>
          )}
          {summaryParas.length > 0 ? (
            <div className="space-y-4">
              {summaryParas.map((p, i) => <p key={i} className="text-[17px] leading-[1.95]" style={{ color: MUTED }}>{p}</p>)}
            </div>
          ) : (
            <p className="text-[15px]" style={{ color: MUTED }}>등록된 설교 요약이 아직 없습니다.</p>
          )}
        </section>
      )}

      {/* 이번 주 질문 — 관찰·심화·적용 */}
      {hasQuestions && (
        <section className="rounded-2xl p-5 sm:p-8" style={{ background: SURFACE }}>
          <div className="mb-6">
            <div className="mb-2 text-[13px] font-semibold" style={{ color: BRAND }}>이번 주 질문</div>
            <h2 className="font-heading text-[22px] font-bold sm:text-[26px]">읽고, 파고들고, 나눕니다</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <QCard tag="관찰" heading="본문에 무엇이 쓰여 있는가" desc="읽으면 답이 보이는 질문입니다." items={obs} />
            <QCard tag="심화" heading="왜 그렇게 말씀하셨는가" desc="뜻을 한 겹 더 파고듭니다." items={deep} />
            <QCard tag="적용" heading="내 삶에서는 어떻게 되는가" desc="모임에서 함께 나눕니다." items={app} />
          </div>
        </section>
      )}
    </div>
  );
}
