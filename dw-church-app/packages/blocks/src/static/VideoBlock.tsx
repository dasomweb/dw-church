'use client';

/**
 * Video embed — wraps the UI primitive `YoutubeEmbed`. Title goes
 * through HeadingElement; the embed wrapper still carries the
 * `data-element="youtubeUrl"` hook so the inspector can target it
 * for URL editing. mergeElementStyle stays inline because the wrapper
 * is a <div>, not a text node — no module covers that slot yet.
 *
 * 2026-05-25: SectionShell + applyLayout=true. 운영자가 LayoutField
 * (Height / Align / Background Width / Container Width) 바꾸면 즉시
 * storefront 반영. Overlay / Border / Background Image 도 자동.
 */

import { YoutubeEmbed } from '@dw-church/ui-components';
import { HeadingElement } from '../elements';
import { mergeElementStyle } from '../utilities/element-styles';
import { SectionShell } from '../utilities/SectionShell';

interface VideoBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function VideoBlock({ props }: VideoBlockProps) {
  const youtubeUrl = (props.youtubeUrl as string) ?? '';
  const title = (props.title as string) ?? '';

  if (!youtubeUrl) return null;

  return (
    <SectionShell
      props={props}
      style={{ paddingBlock: 'var(--section-py-md)' }}
      applyLayout
      defaultContentClass="mx-auto max-w-4xl px-4 sm:px-6"
    >
      <div>
        <HeadingElement
          text={title}
          props={props}
          elementKey="title"
          defaultTag="h2"
          defaultSize="h2"
          className="mb-8 text-center"
        />
        <div data-element="youtubeUrl" style={mergeElementStyle({}, props, 'youtubeUrl')}>
          <YoutubeEmbed url={youtubeUrl} />
        </div>
      </div>
    </SectionShell>
  );
}
