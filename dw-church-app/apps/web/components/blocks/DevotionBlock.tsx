import Link from 'next/link';
import { getDevotions } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { DevotionReaderClient } from './DevotionReaderClient';

// 말씀 묵상 (Claude Design 14a) — 데이터 블록. 게시된 묵상들을 fetch 해서
// 주간 목록 + 오늘 묵상 리더로 표시. 사용자 트래킹 없음(읽기 전용).
//
// variant:
//   'default'(14a) — 좌 주간 목록 + 우 오늘 묵상 리더(읽기 전용).
//   'teaser'(15a 개인 묵상 진입) — 홈용 진입 카드(이미지 + 최신 묵상 소개 + "오늘 묵상 보기").
//      ⚠️ 진행률/완료/노트 등 사용자 트래킹 요소는 전부 제외(대표님 지시).
interface Props { props: Record<string, unknown>; slug: string }

export async function DevotionBlock({ props, slug }: Props) {
  const title = (props.title as string) || '말씀 묵상';
  const eyebrow = (props.eyebrow as string) || '이번 주 묵상';
  const teaser = (props.variant as string) === 'teaser';

  let devotions: any[] = [];
  try {
    devotions = await getDevotions(slug);
  } catch {
    devotions = [];
  }

  // teaser: 등록된 묵상이 없으면 섹션 자체를 숨김(빈 카드 방지).
  if (!devotions.length) {
    if (teaser) return null;
    return (
      <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400">등록된 말씀 묵상이 없습니다.</div>
      </DataSection>
    );
  }

  if (teaser) {
    const BRAND = 'var(--dw-primary, #1466d6)';
    const MUTED = 'var(--dw-text-muted, #61697a)';
    const BORDER = 'var(--dw-border, #e5e7eb)';
    const SURFACE = 'var(--dw-surface, #f7f8fa)';
    const cur = devotions[0];
    const teaserTitle = (props.title as string) || '하루 10분, 혼자 여는 말씀';
    const teaserEyebrow = (props.eyebrow as string) || '개인 묵상';
    const desc = (props.description as string) || '이번 주 설교 본문을 며칠에 걸쳐 나눠 읽습니다. 오늘의 묵상으로 하루를 시작해 보세요.';
    const imageUrl = cur.imageUrl || (props.imageUrl as string) || '';

    return (
      <DataSection props={props} defaultBg="var(--dw-bg, #fff)">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border md:grid-cols-[1fr_1.15fr]" style={{ borderColor: BORDER }}>
            <div className="min-h-[240px]" style={{ background: SURFACE }}>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={cur.title ?? ''} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-semibold" style={{ background: 'color-mix(in srgb, var(--dw-primary, #1466d6) 12%, #fff)', color: BRAND }}>{teaserEyebrow}</span>
                {cur.dayLabel && <span className="inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-semibold" style={{ background: SURFACE, color: MUTED }}>{cur.dayLabel} · 전체 {devotions.length}일</span>}
              </div>
              <h2 className="font-heading text-[24px] font-bold leading-[1.35] sm:text-[28px]" style={getElementStyle(props, 'title')}>{teaserTitle}</h2>
              <p className="mt-3 text-[15.5px] leading-[1.85]" style={{ color: MUTED }}>{desc}</p>
              {cur.title && (
                <div className="mt-4 text-[15px]">오늘 · <b className="font-semibold" style={{ color: BRAND }}>{cur.title}</b>{cur.scriptureRef ? <span style={{ color: MUTED }}> · {cur.scriptureRef}</span> : null}</div>
              )}
              <div className="mt-7">
                <Link href="/devotions" className="inline-flex h-[46px] items-center rounded-full px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>오늘 묵상 보기</Link>
              </div>
            </div>
          </div>
        </div>
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
