import type { Album } from '@dw-church/api-client';
import { useAlbum, useRelatedAlbums } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { ImageGallery } from '../common/ImageGallery';
import { YoutubeEmbed } from '../common/YoutubeEmbed';
import { RelatedPosts } from '../common/RelatedPosts';
import { DateBadge } from '../common/DateBadge';
import { AlbumCard } from './AlbumCard';

export interface SingleAlbumProps {
  data?: Album;
  postId?: number;
  className?: string;
}

export function SingleAlbum({ data, postId, className = '' }: SingleAlbumProps) {
  const id = data?.id ?? postId ?? 0;
  const { data: fetched, isLoading } = useAlbum(id);
  const { data: relatedAlbums } = useRelatedAlbums(id);

  const album = data ?? fetched;

  if (!data && isLoading) return <LoadingSpinner />;
  if (!album) return <EmptyState title="앨범을 찾을 수 없습니다" />;

  return (
    <article className={`dw-mx-auto dw-max-w-4xl ${className}`}>
      {/* Title */}
      <header className="dw-mb-8">
        <h1 className="dw-text-2xl dw-font-bold dw-text-text-primary sm:dw-text-3xl">
          {album.title}
        </h1>
        <div className="dw-mt-2">
          <DateBadge date={album.createdAt} format="long" />
        </div>
      </header>

      {/* Image Gallery */}
      {album.images?.length > 0 && (
        <div className="dw-mb-8">
          <ImageGallery images={album.images} />
        </div>
      )}

      {/* YouTube Video */}
      {album.youtubeUrl && (
        <div className="dw-mb-8">
          <YoutubeEmbed url={album.youtubeUrl} title={album.title} />
        </div>
      )}

      {/* Related Albums */}
      {relatedAlbums && relatedAlbums.length > 0 && (
        <RelatedPosts title="관련 앨범">
          {relatedAlbums.map((related) => (
            <AlbumCard key={related.id} album={related} />
          ))}
        </RelatedPosts>
      )}
    </article>
  );
}
