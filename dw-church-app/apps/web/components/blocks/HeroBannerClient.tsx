'use client';

import { BannerSlider } from '@dw-church/ui-components';
import type { Banner } from '@dw-church/api-client';

interface HeroBannerClientProps {
  banners: Banner[];
}

export function HeroBannerClient({ banners }: HeroBannerClientProps) {
  return <BannerSlider data={banners} />;
}
