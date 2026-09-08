import { getDevotions } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { DevotionReaderClient } from './DevotionReaderClient';

// 말씀 묵상 (Claude Design 14a) — 데이터 블록. 게시된 묵상들을 fetch 해서
// 주간 목록 + 오늘 묵상 리더로 표시. 사용자 트래킹 없음(읽기 전용).
interface Props { props: Record<string, unknown>; slug: string }

export async function DevotionBlock({ props, slug }: Props) {
  const title = (props.title as string) || '말씀 묵상';
  const eyebrow = (props.eyebrow as string) || '이번 주 묵상';

  let devotions: any[] = [];
  try {
    devotions = await getDevotions(slug);
  } catch {
    devotions = [];
  }

  if (!devotions.length) {
    return (
      <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400">등록된 말씀 묵상이 없습니다.</div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--dw-primary, #1466d6)' }}>말씀 묵상 · Quiet Time</div>
          <h2 className="mt-1.5 font-heading text-[26px] font-bold sm:text-[32px]" style={getElementStyle(props, 'title')}>{title}</h2>
        </div>
        <DevotionReaderClient devotions={devotions} eyebrow={eyebrow} />
      </div>
    </DataSection>
  );
}
