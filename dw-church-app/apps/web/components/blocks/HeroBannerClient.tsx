'use client';

import { BannerSlider } from '@dw-church/ui-components';
import type { Banner } from '@dw-church/api-client';

interface HeroBannerClientProps {
  banners: Banner[];
  overlayColor?: string;
  overlayOpacity?: number;
  heightRatio?: number;
}

export function HeroBannerClient({ banners, overlayColor, overlayOpacity, heightRatio }: HeroBannerClientProps) {
  return (
    <BannerSlider
      data={banners}
      overlayColor={overlayColor}
      overlayOpacity={overlayOpacity}
      heightRatio={heightRatio}
    />
  );
}
