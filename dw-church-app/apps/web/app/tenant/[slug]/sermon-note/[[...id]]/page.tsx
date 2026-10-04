import { getLatestSermonNote, getSermonNote, getSermonNotes } from '@/lib/api';
import { SermonNotePageView } from '@/components/blocks/SermonNotePageView';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

// 전용 "설교노트 보기" 페이지 (온라인 주보와 별개).
//   /sermon-note        → 최신 설교노트
//   /sermon-note/{id}   → 특정 설교노트
interface PageProps {
  params: Promise<{ slug: string; id?: string[] }>;
  /** ?track=adult|em|youth|children|kids — 목록의 대상 칩에서 바로 그 대상 노트로 들어온다. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const noteId = id?.[0];
  try {
    const note = noteId ? await getSermonNote(slug, noteId) : await getLatestSermonNote(slug);
    return buildTenantMetadata(slug, note?.title ?? '설교노트');
  } catch {
    return buildTenantMetadata(slug, '설교노트');
  }
}

export default async function SermonNotePage({ params, searchParams }: PageProps) {
  const { slug, id } = await params;
  const sp = (await searchParams) ?? {};
  const trackParam = Array.isArray(sp.track) ? sp.track[0] : sp.track;
  const noteId = id?.[0];

  const note = noteId ? await getSermonNote(slug, noteId) : await getLatestSermonNote(slug);
  if (!note) notFound();

  const listRes = await getSermonNotes(slug, { perPage: 12 });
  const recent = (Array.isArray(listRes) ? listRes : listRes?.data ?? []) as Parameters<typeof SermonNotePageView>[0]['recent'];

  return <SermonNotePageView note={note} recent={recent} initialTrack={trackParam} />;
}
