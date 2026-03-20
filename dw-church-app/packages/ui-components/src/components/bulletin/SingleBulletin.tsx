import type { Bulletin } from '@dw-church/api-client';
import { useBulletin, useRelatedBulletins } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { DateBadge } from '../common/DateBadge';
import { ImageGallery } from '../common/ImageGallery';
import { PdfViewer } from '../common/PdfViewer';
import { RelatedPosts } from '../common/RelatedPosts';
import { BulletinCard } from './BulletinCard';

export interface SingleBulletinProps {
  data?: Bulletin;
  postId?: string;
  className?: string;
}

export function SingleBulletin({ data, postId, className = '' }: SingleBulletinProps) {
  const { data: fetched, isLoading } = useBulletin(postId ?? '');
  const bulletin = data ?? fetched;

  const bulletinId = bulletin?.id ?? '';
  const { data: relatedBulletins } = useRelatedBulletins(bulletinId);

  if (!data && isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!bulletin) {
    return null;
  }

  return (
    <article className={`dw-flex dw-flex-col dw-gap-8 ${className}`}>
      {/* Header */}
      <header className="dw-flex dw-flex-col dw-gap-3">
        <h1 className="dw-text-2xl dw-font-bold dw-text-text-primary md:dw-text-3xl">
          {bulletin.title}
        </h1>
        <DateBadge date={bulletin.date} format="long" />
      </header>

      {/* Image Gallery */}
      {bulletin.images?.length > 0 && (
        <section aria-label="주보 이미지">
          <ImageGallery images={bulletin.images} columns={2} />
        </section>
      )}

      {/* PDF Viewer */}
      {bulletin.pdfUrl && (
        <section aria-label="주보 PDF">
          <PdfViewer url={bulletin.pdfUrl} title={bulletin.title} />
        </section>
      )}

      {/* Related Bulletins */}
      {relatedBulletins && relatedBulletins.length > 0 && (
        <RelatedPosts title="관련 주보">
          {relatedBulletins.map((related) => (
            <BulletinCard key={related.id} bulletin={related} />
          ))}
        </RelatedPosts>
      )}
    </article>
  );
}
