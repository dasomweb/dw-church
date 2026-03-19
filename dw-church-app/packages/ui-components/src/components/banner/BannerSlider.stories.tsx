import type { Meta, StoryObj } from '@storybook/react';
import type { Banner } from '@dw-church/api-client';
import { BannerSlider } from './BannerSlider';

const mockBanners: Banner[] = [
  {
    id: 1,
    title: '부활절 특별 예배',
    pcImageUrl: 'https://placehold.co/1920x768/1e3a5f/ffffff?text=Easter+Service',
    mobileImageUrl: 'https://placehold.co/768x768/1e3a5f/ffffff?text=Easter+Service',
    subImageUrl: '',
    linkUrl: '',
    linkTarget: '_self',
    startDate: '2025-04-01',
    endDate: '2025-04-20',
    textOverlay: {
      heading: '부활절 특별 예배',
      subheading: '2025년 4월 20일 주일',
      description: '예수 그리스도의 부활을 함께 기념합니다.',
      position: 'center',
      align: 'center',
      widths: { pc: '60%', laptop: '70%', tablet: '80%', mobile: '90%' },
    },
    category: 'main',
    status: 'publish',
    createdAt: '2025-03-01T00:00:00Z',
    modifiedAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 2,
    title: '여름 성경학교',
    pcImageUrl: 'https://placehold.co/1920x768/2d6a4f/ffffff?text=Summer+Bible+School',
    mobileImageUrl: 'https://placehold.co/768x768/2d6a4f/ffffff?text=Summer+Bible+School',
    subImageUrl: '',
    linkUrl: 'https://example.com',
    linkTarget: '_blank',
    startDate: '2025-06-01',
    endDate: '2025-07-31',
    textOverlay: {
      heading: '여름 성경학교',
      subheading: '7월 21일 - 25일',
      description: '어린이부터 청소년까지 함께하는 여름 성경학교',
      position: 'bottom-left',
      align: 'left',
      widths: { pc: '50%', laptop: '60%', tablet: '70%', mobile: '90%' },
    },
    category: 'main',
    status: 'publish',
    createdAt: '2025-03-01T00:00:00Z',
    modifiedAt: '2025-03-01T00:00:00Z',
  },
];

const meta = {
  title: 'Banner/BannerSlider',
  component: BannerSlider,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BannerSlider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: mockBanners,
    autoPlayInterval: 5000,
  },
};

export const SingleBanner: Story = {
  args: {
    data: [mockBanners[0]],
  },
};
