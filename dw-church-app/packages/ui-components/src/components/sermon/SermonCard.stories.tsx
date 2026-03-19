import type { Meta, StoryObj } from '@storybook/react';
import type { Sermon } from '@dw-church/api-client';
import { SermonCard } from './SermonCard';

const mockSermon: Sermon = {
  id: 1,
  title: '믿음의 여정',
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  scripture: '히브리서 11:1-6',
  preacher: '김목사',
  date: '2025-03-09',
  thumbnailUrl: 'https://placehold.co/640x360/1e3a5f/ffffff?text=Sermon',
  categoryIds: [1],
  category: '주일설교',
  status: 'publish',
  createdAt: '2025-03-09T10:00:00Z',
  modifiedAt: '2025-03-09T10:00:00Z',
};

const meta = {
  title: 'Sermon/SermonCard',
  component: SermonCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SermonCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sermon: mockSermon,
  },
};

export const WithLongTitle: Story = {
  args: {
    sermon: {
      ...mockSermon,
      id: 2,
      title: '하나님의 은혜와 사랑 안에서 우리가 어떻게 살아가야 하는지에 대한 깊은 묵상과 말씀 나눔',
    },
  },
};

export const NoThumbnail: Story = {
  args: {
    sermon: {
      ...mockSermon,
      id: 3,
      thumbnailUrl: '',
      youtubeUrl: '',
    },
  },
};
