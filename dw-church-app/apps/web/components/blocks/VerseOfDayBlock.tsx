import { getCurrentVerse } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

interface VerseOfDayBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * 오늘의 말씀 (verse_of_day) — Data Block.
 *
 * Shows the tenant's current verse (from the 말씀 content module — admin-only
 * management). Renders NOTHING when no verse is registered/published, so the
 * homepage never shows an empty box (대표님: 게시판 기능은 관리자쪽에서만).
 */
export async function VerseOfDayBlock({ props, slug }: VerseOfDayBlockProps) {
  let verse: any = null;
  try {
    verse = await getCurrentVerse(slug);
  } catch {
    verse = null;
  }
  if (!verse || !verse.text) return null;

  const eyebrow = (props.eyebrow as string) || '오늘의 말씀 · Verse of the Day';

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)">
      <div className="mx-auto max-w-7xl">
        <div className="border-l-4 pl-5 sm:pl-6" style={{ borderColor: 'var(--dw-primary, #2563eb)' }}>
          {eyebrow && (
            <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--dw-primary, #2563eb)', ...getElementStyle(props, 'eyebrow') }}>
              {eyebrow}
            </p>
          )}
          <blockquote
            className="text-xl font-bold leading-snug font-heading sm:text-2xl"
            style={getElementStyle(props, 'quote')}
          >
            {verse.text}
          </blockquote>
          {verse.reference && (
            <p className="mt-3 text-sm text-gray-400" style={getElementStyle(props, 'reference')}>
              {verse.reference}
            </p>
          )}
        </div>
      </div>
    </DataSection>
  );
}
