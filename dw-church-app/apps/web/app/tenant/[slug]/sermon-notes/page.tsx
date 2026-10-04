import { getSermonNotes } from '@/lib/api';
import { SermonNoteListView } from '@/components/blocks/SermonNoteListView';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

// 설교노트 목록 페이지 (/sermon-notes). 상세는 /sermon-note/{id}, 최신은 /sermon-note.
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '설교노트');
}

export default async function SermonNotesPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await getSermonNotes(slug, { perPage: 60 });
  const notes = (Array.isArray(res) ? res : res?.data ?? []) as Parameters<typeof SermonNoteListView>[0]['notes'];
  return <SermonNoteListView notes={notes} />;
}
