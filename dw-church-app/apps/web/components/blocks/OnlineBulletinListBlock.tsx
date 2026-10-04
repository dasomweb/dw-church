import { getOnlineBulletins, getSermonNotes } from '@/lib/api';
import { OnlineBulletinListView, type BulletinRow } from './OnlineBulletinListView';
import { DataSection } from './DataSection';

// 온라인 주보 목록 (online_bulletin_list) — 주보 전체를 연도 탭 + 월별 그룹으로 보여주는 Data Block.
// 어느 페이지·어느 주소에나 배치할 수 있고 교회마다 재사용된다.
// 설교 제목은 주보 content 에 없을 수 있어(설교노트 모듈로 이전) **같은 주일 날짜의 설교노트**에서 채운다.
interface Props { props: Record<string, unknown>; slug: string }

function ymd(v: unknown): string {
  return String(v ?? '').slice(0, 10);
}

export async function OnlineBulletinListBlock({ props, slug }: Props) {
  const limitRaw = Number(props.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 60;

  let bulletins: Record<string, any>[] = [];
  try {
    const res = await getOnlineBulletins(slug, { perPage: limit });
    bulletins = (Array.isArray(res) ? res : res?.data ?? []) as Record<string, any>[];
  } catch {
    bulletins = [];
  }
  if (bulletins.length === 0) return null; // 주보가 없으면 섹션 자체를 숨긴다.

  // 설교 제목 보강용 — 날짜별 설교노트 1회 조회(목록이라 건별 조회는 피한다).
  const noteByDate = new Map<string, { title: string; ref: string }>();
  try {
    const nres = await getSermonNotes(slug, { perPage: limit });
    const notes = (Array.isArray(nres) ? nres : nres?.data ?? []) as Record<string, any>[];
    for (const n of notes) {
      const c = (n.content ?? {}) as Record<string, any>;
      const title = String(n.title ?? '').trim() || String(c.congregations?.adult?.title ?? '').trim();
      noteByDate.set(ymd(n.noteDate), { title, ref: String(c.scripture ?? '') });
    }
  } catch { /* 설교노트가 없어도 주보 목록은 나와야 한다 */ }

  const rows: BulletinRow[] = bulletins.map((b) => {
    const c = (b.content ?? {}) as Record<string, any>;
    const date = ymd(b.serviceDate ?? b.service_date);
    const d = new Date(date + 'T00:00:00');
    const ok = !Number.isNaN(d.getTime());
    const note = noteByDate.get(date);
    const sermon = String(c.sermonNote?.title ?? '').trim() || note?.title || '';
    const ref = String(c.scripture?.reference ?? '').trim() || note?.ref || '';
    return {
      id: String(b.id),
      year: ok ? String(d.getFullYear()) : '',
      ym: ok ? `${d.getFullYear()}년 ${d.getMonth() + 1}월` : '',
      day: ok ? String(d.getDate()) : '',
      week: String(c.serviceTitle ?? '').trim() || String(b.title ?? '').trim() || '주일예배',
      sermon,
      ref,
      presider: String(c.presider ?? '').trim(),
      news: Array.isArray(c.announcements)
        ? c.announcements.map((a: Record<string, any>) => String(a?.title ?? '').trim()).filter(Boolean)
        : [],
    };
  }).filter((r) => r.year);

  if (rows.length === 0) return null;

  return (
    <DataSection props={props} defaultBg="var(--dw-background, #fff)">
      <OnlineBulletinListView
        rows={rows}
        eyebrow={(props.eyebrow as string) ?? undefined}
        title={(props.title as string) ?? undefined}
        description={(props.description as string) ?? undefined}
        showFeature={String(props.showFeature ?? 'show') !== 'hide'}
        showGuide={String(props.showGuide ?? 'show') !== 'hide'}
        guideLeft={(props.guideLeft as string) ?? undefined}
        guideRight={(props.guideRight as string) ?? undefined}
        newsHref={(props.newsHref as string) ?? ''}
        newsLabel={(props.newsLabel as string) ?? undefined}
        inBlock
      />
    </DataSection>
  );
}
