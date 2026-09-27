import { getOnlineBulletin, getSermonNoteByDate } from '@/lib/api';
import { OnlineBulletinView } from '@/components/blocks/OnlineBulletinView';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import Link from 'next/link';
import type { Metadata } from 'next';

interface OnlineBulletinDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: OnlineBulletinDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const b = await getOnlineBulletin(slug, id);
    return buildTenantMetadata(slug, b?.title ?? '온라인 주보');
  } catch {
    return buildTenantMetadata(slug, '온라인 주보');
  }
}

export default async function OnlineBulletinDetailPage({ params }: OnlineBulletinDetailProps) {
  const { slug, id } = await params;
  if (!id) notFound();

  let bulletin: Record<string, unknown> | null = null;
  try {
    bulletin = await getOnlineBulletin(slug, id);
  } catch {
    notFound();
  }
  if (!bulletin) notFound();

  const date = String((bulletin.serviceDate as string) || (bulletin.service_date as string) || '').slice(0, 10);
  const note = date ? await getSermonNoteByDate(slug, date) : null;

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-5">
        <Link href="/onlinejubo" className="text-sm hover:underline" style={{ color: 'var(--dw-primary, #1466d6)' }}>‹ 온라인 주보 목록</Link>
      </div>
      <OnlineBulletinView bulletin={bulletin} sermonNote={note?.content ?? null} />
    </div>
  );
}
