import { getSermonNotes } from '@/lib/api';
import { SermonNoteListView } from './SermonNoteListView';
import { DataSection } from './DataSection';

// 설교노트 목록 (sermon_note_list) — 설교노트 모듈 전체 목록을 보여주는 Data Block.
// 어느 페이지에나 배치할 수 있고(= 주소를 운영자가 정한다), 교회마다 재사용된다.
// 대상 탭(장년/EM/Youth/Children/Kids)은 실제 데이터에 있는 대상만 노출된다.
interface Props { props: Record<string, unknown>; slug: string }

export async function SermonNoteListBlock({ props, slug }: Props) {
  const limitRaw = Number(props.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 60;

  let notes: Parameters<typeof SermonNoteListView>[0]['notes'] = [];
  try {
    const res = await getSermonNotes(slug, { perPage: limit });
    notes = (Array.isArray(res) ? res : res?.data ?? []) as typeof notes;
  } catch {
    notes = [];
  }
  if (notes.length === 0) return null; // 등록된 설교노트가 없으면 섹션 자체를 숨긴다.

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #fff)">
      <SermonNoteListView
        notes={notes}
        eyebrow={(props.eyebrow as string) ?? undefined}
        title={(props.title as string) ?? undefined}
        description={(props.description as string) ?? undefined}
        showFeature={String(props.showFeature ?? 'show') !== 'hide'}
        showGuide={String(props.showGuide ?? 'show') !== 'hide'}
        inBlock
      />
    </DataSection>
  );
}
