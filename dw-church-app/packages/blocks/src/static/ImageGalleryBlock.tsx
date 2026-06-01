'use client';

/**
 * Image gallery — grid of thumbnails delegated to the UI primitive
 * `ImageGallery`. The block shell owns only the section envelope and
 * the (optional) header. Title goes through HeadingElement so the
 * operator inspector can swap tag, change typography, and override
 * styles uniformly across blocks.
 */

import { ImageGallery } from '@dw-church/ui-components';
import { HeadingElement } from '../elements';
import { SectionShell } from '../utilities/SectionShell';

interface ImageGalleryBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

/**
 * 2026-05-29: SectionShell + applyLayout 로 마이그레이션. 이전엔 hand-roll
 * `mx-auto max-w-7xl px-4 sm:px-6` 가 박혀 있어서 운영자의 backgroundImage /
 * overlay / border / contentWidth 토글이 무시됨. SectionShell 이 outer
 * envelope (bg + overlay + border) 와 inner contentWidthClass (mobile px
 * 포함) 를 owner.
 */
export function ImageGalleryBlock({ props }: ImageGalleryBlockProps) {
  const images = (props.images as string[]) ?? [];
  const title = (props.title as string) ?? '';

  if (images.length === 0) return null;

  return (
    <SectionShell
      props={props}
      style={{ paddingBlock: 'var(--section-py-md)' }}
      applyLayout
    >
      <HeadingElement
        text={title}
        props={props}
        elementKey="title"
        defaultTag="h2"
        defaultSize="h2"
        className="mb-8 text-center"
      />
      <ImageGallery images={images} />
    </SectionShell>
  );
}
