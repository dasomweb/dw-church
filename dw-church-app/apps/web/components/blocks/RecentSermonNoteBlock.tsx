import Link from 'next/link';
import { getLatestSermonNote } from '@/lib/api';
import { DataSection } from './DataSection';

// 최근 설교노트 (recent_sermon_note) — 설교노트 모듈 최신 1건을 홈에 표시.
// 대표 이미지(content.thumbnailUrl) + 제목 + 성경본문 + 본문 발췌 + 설교노트 보기 링크.
interface Props { props: Record<string, unknown>; slug: string }

const INK = 'var(--dw-text, #16181d)';
const OLIVE = 'var(--dw-primary, #1466d6)';
const MUTED = 'var(--brand-muted, #61697a)';
const SURFACE = 'var(--dw-surface, #f7f8fa)';
const SERIF = { fontFamily: 'var(--dw-font-heading)' } as const;

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. 주일`;
}
// 마크다운 서식 제거 → 평문 발췌.
function excerpt(md: string, max = 160): string {
  const plain = (md || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '').replace(/^>\s?/gm, '').replace(/^[-*]\s+/gm, '').replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^---+$/gm, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + '…' : plain;
}

export async function RecentSermonNoteBlock({ props, slug }: Props) {
  let note: Record<string, any> | null = null;
  try { note = await getLatestSermonNote(slug); } catch { note = null; }
  if (!note) return null;

  const c = (note.content ?? {}) as Record<string, any>;
  const adult = (c.congregations?.adult ?? {}) as Record<string, any>;
  const eyebrow = (props.eyebrow as string) || '이번 주 설교노트';
  const title = adult.title || note.title || '설교노트';
  const scripture = c.scripture || '';
  const img = c.thumbnailUrl || '';
  const date = fmtDate(note.noteDate || note.note_date);
  const body = excerpt(adult.text || '');
  const moreLabel = (props.moreLabel as string) || '설교노트 보기';
  const moreUrl = (props.moreUrl as string) || '/onlinejubo';

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #fff)">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
          {img && (
            <Link href={moreUrl} className="relative block w-full overflow-hidden lg:flex-[1_1_52%]" style={{ aspectRatio: '4 / 3', background: SURFACE, borderRadius: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            </Link>
          )}
          <div className="min-w-0 lg:flex-1">
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: 'var(--dw-secondary, #5e6044)' }}>{eyebrow}</p>
            <h2 style={{ ...SERIF, margin: '12px 0 0', fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.25, color: INK }}>{title}</h2>
            <p style={{ margin: '12px 0 0', fontSize: 14, color: MUTED }}>{[date, scripture].filter(Boolean).join(' · ')}</p>
            {body && <p style={{ margin: '18px 0 0', fontSize: 16, lineHeight: 1.9, color: 'var(--dw-text, #3a3129)' }}>{body}</p>}
            <p style={{ margin: '20px 0 0', fontSize: 15, fontWeight: 600 }}>
              <Link href={moreUrl} style={{ color: OLIVE }}>{moreLabel} ›</Link>
            </p>
          </div>
        </div>
      </div>
    </DataSection>
  );
}
